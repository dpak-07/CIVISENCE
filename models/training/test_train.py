# train_priority_high_quality.py
# Run: pip install sentence-transformers faiss-cpu xgboost scikit-learn optuna pandas numpy joblib
import os
import json
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
from sklearn.decomposition import PCA
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
from sklearn.calibration import CalibratedClassifierCV
import xgboost as xgb
import optuna
import joblib
import warnings
warnings.filterwarnings("ignore")

# CONFIG
CSV_PATH = r"C:\Users\LOKESH\Desktop\github-exp\Crowdsourced-Civic-lssue-Reporting-and-Resolution-System\models\training\real_time_reports_sample.csv"

EMB_MODEL = "all-MiniLM-L6-v2"
EMB_DIM = 384   # model embedding dim
REDUCE_TO = 64  # reduce embedding dims for tabular model (PCA)
FAISS_THRESHOLD = 0.85
N_FOLDS = 5
RANDOM_SEED = 42
TARGET_COL = "priority_label"  # IMPORTANT: your CSV must have this (0..3). If not, map severity_label -> numeric below.

# ---------- 0. Load data ----------
df = pd.read_csv(CSV_PATH)
# If dataset uses 'severity_label' strings, map them to numeric priority labels (low=0,...critical=3)
if TARGET_COL not in df.columns and 'severity_label' in df.columns:
    mapping = {'low':0,'medium':1,'high':2,'critical':3}
    df[TARGET_COL] = df['severity_label'].map(mapping)
# Basic check
print("Rows:", len(df), "Columns:", list(df.columns))

# ---------- 1. Text embeddings ----------
print("Computing sentence embeddings (this may take a while on CPU)...")
st = SentenceTransformer(EMB_MODEL)
texts = df['report_text'].fillna("").astype(str).tolist()
embs = st.encode(texts, show_progress_bar=True, convert_to_numpy=True)
print("Embeddings shape:", embs.shape)  # (N, EMB_DIM)

# Save embeddings for reuse
np.save("embeddings_full.npy", embs)

# ---------- 2. Build FAISS index and compute duplicate count feature ----------
print("Building FAISS index and computing duplicate counts...")
embs32 = embs.astype('float32')
faiss.normalize_L2(embs32)
d = embs32.shape[1]
index = faiss.IndexFlatIP(d)   # inner product on normalized vectors -> cosine similarity
index.add(embs32)
faiss.write_index(index, "faiss_full.index")

# For each vector compute how many neighbors have sim >= threshold (excluding itself)
def compute_dup_counts(emb_array, index, thr=FAISS_THRESHOLD, topk=10):
    N = emb_array.shape[0]
    counts = np.zeros(N, dtype=np.int32)
    batch = 256
    for i in range(0, N, batch):
        v = emb_array[i:i+batch]
        D, I = index.search(v, topk)
        for j in range(v.shape[0]):
            sims = D[j]
            # count similarities >= thr (exclude itself which usually has sim ~1.0)
            counts[i+j] = int((sims >= thr).sum()) - 1
    return counts

dup_counts = compute_dup_counts(embs32, index, thr=FAISS_THRESHOLD, topk=20)
df['dup_count'] = dup_counts
print("Dup_count stats:", df['dup_count'].describe())

# ---------- 3. Feature engineering ----------
print("Creating features...")
# Basic numeric features
df['text_len'] = df['report_text'].fillna("").str.len()
df['has_image'] = df['image_present'].fillna(0).astype(int)
df['location_criticality'] = df.get('location_criticality', 0).fillna(0).astype(int)
df['time_since_first_hours'] = df.get('time_since_first_hours', 0).fillna(0).astype(float)

# Reduce embeddings with PCA to REDUCE_TO dims to make model training faster
print("Running PCA on embeddings...")
pca = PCA(n_components=REDUCE_TO, random_state=RANDOM_SEED)
emb_reduced = pca.fit_transform(embs)    # shape (N, REDUCE_TO)
joblib.dump(pca, "pca_emb_reducer.joblib")

# Combine features
feature_df = pd.DataFrame(emb_reduced, columns=[f"emb_{i}" for i in range(emb_reduced.shape[1])])
feature_df['dup_count'] = df['dup_count'].values
feature_df['text_len'] = df['text_len'].values
feature_df['has_image'] = df['has_image'].values
feature_df['location_criticality'] = df['location_criticality'].values
feature_df['time_since_first_hours'] = df['time_since_first_hours'].values
# If report_type exists, one-hot encode a few common categories
if 'report_type' in df.columns:
    rtypes = pd.get_dummies(df['report_type'].fillna("unknown"), prefix="type")
    feature_df = pd.concat([feature_df, rtypes], axis=1)

X = feature_df.values
y = df[TARGET_COL].astype(int).values

print("Feature matrix shape:", X.shape, "Labels shape:", y.shape)
joblib.dump(feature_df.columns.tolist(), "feature_columns.joblib")

# ---------- 4. Handle class imbalance (optional sampling) ----------
# Show class distribution
unique, counts = np.unique(y, return_counts=True)
print("Class distribution:", dict(zip(unique, counts)))
# If class '3' (critical) is very rare, XGBoost's scale_pos_weight is per-class in multiclass not straightforward;
# We'll rely on stratified CV and weighted evaluation. Alternative: oversample critical via SMOTE or class weights.

# ---------- 5. Optuna hyperparameter tuning using StratifiedKFold ----------
print("Starting Optuna tuning (this may take time). We'll use 50 trials by default.")
def objective(trial):
    params = {
        "verbosity": 0,
        "objective": "multi:softprob",
        "num_class": len(np.unique(y)),
        "tree_method": "hist",
        "max_depth": trial.suggest_int("max_depth", 4, 10),
        "eta": trial.suggest_float("eta", 0.01, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "lambda": trial.suggest_float("lambda", 1e-3, 10.0, log=True),
        "alpha": trial.suggest_float("alpha", 1e-3, 10.0, log=True),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "seed": RANDOM_SEED
    }
    # 5-fold stratified CV
    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    f1_scores = []
    for train_idx, val_idx in skf.split(X, y):
        dtrain = xgb.DMatrix(X[train_idx], label=y[train_idx])
        dval = xgb.DMatrix(X[val_idx], label=y[val_idx])
        bst = xgb.train(params, dtrain, num_boost_round=1000, evals=[(dval, "val")], early_stopping_rounds=30, verbose_eval=False)
        preds = bst.predict(dval).argmax(axis=1)
        # compute macro F1 to balance classes
        p, r, f, _ = precision_recall_fscore_support(y[val_idx], preds, average='macro', zero_division=0)
        f1_scores.append(f)
    return np.mean(f1_scores)

study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=RANDOM_SEED))
study.optimize(objective, n_trials=50, show_progress_bar=True)
print("Best params:", study.best_params)
best_params = study.best_params
# add fixed params
best_params.update({"verbosity":0, "objective":"multi:softprob", "num_class":len(np.unique(y)), "tree_method":"hist", "seed":RANDOM_SEED})

# ---------- 6. Train final model on full training set with early stopping using a holdout set ----------
print("Training final model...")
X_train, X_hold, y_train, y_hold = train_test_split(X, y, test_size=0.1, stratify=y, random_state=RANDOM_SEED)
dtrain = xgb.DMatrix(X_train, label=y_train)
dhold = xgb.DMatrix(X_hold, label=y_hold)
bst = xgb.train(best_params, dtrain, num_boost_round=2000, evals=[(dhold, "hold")], early_stopping_rounds=50, verbose_eval=50)
bst.save_model("priority_xgb_optuna.json")

# ---------- 7. Calibration (improve probability estimates) ----------
print("Calibrating probabilities using Platt scaling via sklearn's CalibratedClassifierCV wrapper (uses CV internally).")
# Wrap XGBoost with sklearn API for calibration
from xgboost import XGBClassifier
xgb_clf = XGBClassifier(**{k:v for k,v in best_params.items() if k in XGBClassifier().get_params().keys()})
xgb_clf.n_estimators = bst.best_iteration + 1 if hasattr(bst, "best_iteration") else 200
xgb_clf.fit(X_train, y_train, eval_set=[(X_hold, y_hold)], verbose=False)
calibrator = CalibratedClassifierCV(xgb_clf, method="sigmoid", cv=3)
calibrator.fit(X_train, y_train)
joblib.dump(calibrator, "calibrated_xgb.joblib")

# ---------- 8. Evaluation ----------
print("Evaluating on holdout set...")
y_prob = calibrator.predict_proba(X_hold)
y_pred = y_prob.argmax(axis=1)
print(classification_report(y_hold, y_pred, target_names=["low","medium","high","critical"]))
cm = confusion_matrix(y_hold, y_pred)
print("Confusion matrix:\n", cm)
# Show per-class precision/recall for emphasis
p, r, f, s = precision_recall_fscore_support(y_hold, y_pred, labels=[0,1,2,3], zero_division=0)
for cls,pp,rr,ff in zip(["low","medium","high","critical"], p, r, f):
    print(f"{cls}: precision={pp:.3f}, recall={rr:.3f}, f1={ff:.3f}")

# Save model artifacts
bst.save_model("priority_xgb_full.json")
joblib.dump(st, "sentence_transformer_model.joblib", compress=3)  # note: large
joblib.dump(feature_df.columns.tolist(), "feature_columns.joblib")

print("All done. Models and artifacts saved: priority_xgb_full.json, calibrated_xgb.joblib, pca_emb_reducer.joblib, faiss_full.index")
