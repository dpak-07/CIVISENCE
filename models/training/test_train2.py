#!/usr/bin/env python3
"""
train_multimodal_priority_full.py

Multimodal priority classifier (text + image + tabular) using PyTorch Lightning.
Includes:
 - Transformer text encoder (HuggingFace)
 - Image encoder (timm EfficientNet)
 - Tabular MLP
 - Fusion MLP with focal loss and class weighting
 - WeightedRandomSampler for class balance
 - TorchMetrics (updated API) usage
 - Optional mixed precision (fp16)
"""

import os
# disable HF symlink warning on Windows (optional)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import argparse
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from PIL import Image

import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T

import pytorch_lightning as pl
from pytorch_lightning import Trainer
from pytorch_lightning.callbacks import ModelCheckpoint, EarlyStopping
from pytorch_lightning.loggers import TensorBoardLogger

from transformers import AutoTokenizer, AutoModel
import timm
import albumentations as A
from albumentations.pytorch import ToTensorV2

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import torchmetrics
from torchmetrics.classification import MulticlassF1Score

# -------------------------
# Dataset
# -------------------------
class MultiModalDataset(Dataset):
    def __init__(
        self,
        df: pd.DataFrame,
        tokenizer,
        tab_cols,
        img_root: Optional[str] = None,
        transforms=None,
        max_text_len: int = 128,
    ):
        self.df = df.reset_index(drop=True)
        self.tokenizer = tokenizer
        self.tab_cols = tab_cols
        self.img_root = img_root
        self.transforms = transforms
        self.max_text_len = max_text_len

    def __len__(self):
        return len(self.df)

    def _load_image(self, path):
        try:
            img = np.array(Image.open(path).convert("RGB"))
            return img
        except Exception:
            # return a black image if missing/corrupted
            return np.zeros((224, 224, 3), dtype=np.uint8)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        text = str(row.get("report_text", "") or "")
        tok = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_text_len,
            return_tensors="pt",
        )
        input_ids = tok["input_ids"].squeeze(0)
        attention_mask = tok["attention_mask"].squeeze(0)

        # Image handling
        image_tensor = torch.zeros(3, 224, 224, dtype=torch.float)
        img_path = row.get("image_path", "")
        if img_path and self.img_root:
            full = os.path.join(self.img_root, img_path)
            if not os.path.exists(full):
                # If image path seems absolute, try it directly
                if os.path.exists(img_path):
                    full = img_path
            if os.path.exists(full):
                img = self._load_image(full)
                if self.transforms:
                    img = self.transforms(image=img)["image"]
                    image_tensor = img
                else:
                    # fallback transform
                    t = T.Compose([T.Resize((224, 224)), T.ToTensor()])
                    image_tensor = t(Image.fromarray(img))

        # Tabular features
        tab_vals = self.df.loc[idx, self.tab_cols].values.astype(np.float32)
        tab = torch.tensor(tab_vals, dtype=torch.float32)

        label = int(row["priority_label"])
        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "image": image_tensor,
            "tab": tab,
            "label": torch.tensor(label, dtype=torch.long),
        }


# -------------------------
# Model (LightningModule)
# -------------------------
class MultiModalClassifier(pl.LightningModule):
    def __init__(
        self,
        text_model_name: str,
        image_model_name: str,
        n_tab: int,
        tab_hidden: int = 64,
        dropout: float = 0.3,
        n_classes: int = 4,
        lr: float = 2e-5,
        weight_decay: float = 1e-2,
        focal_gamma: float = 2.0,
        class_weights: Optional[list] = None,
    ):
        super().__init__()
        self.save_hyperparameters()

        # Text encoder
        self.tokenizer = AutoTokenizer.from_pretrained(text_model_name)
        self.text_model = AutoModel.from_pretrained(text_model_name)
        # Determine text hidden size
        txt_hidden = getattr(self.text_model.config, "hidden_size", None) or getattr(
            self.text_model.config, "dim", None
        )
        if txt_hidden is None:
            raise ValueError("Could not infer text hidden size from model config.")

        # Image encoder (timm)
        self.image_backbone = timm.create_model(image_model_name, pretrained=True, num_classes=0, global_pool="avg")
        img_dim = self.image_backbone.num_features

        # Tabular MLP
        self.tab_mlp = nn.Sequential(
            nn.Linear(n_tab, tab_hidden),
            nn.ReLU(),
            nn.BatchNorm1d(tab_hidden),
            nn.Dropout(dropout),
        )

        # Fusion classifier
        fusion_dim = txt_hidden + img_dim + tab_hidden
        self.fusion = nn.Sequential(
            nn.Linear(fusion_dim, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(dropout),
            nn.Linear(256, n_classes),
        )

        # Loss / metrics
        self.focal_gamma = focal_gamma
        if class_weights is not None:
            cw = torch.tensor(class_weights, dtype=torch.float)
        else:
            cw = None
        self.register_buffer("class_weights_buf", cw if cw is not None else torch.ones(n_classes))

        # Metrics using new torchmetrics API
        self.train_acc = torchmetrics.Accuracy(task="multiclass", num_classes=n_classes)
        self.val_acc = torchmetrics.Accuracy(task="multiclass", num_classes=n_classes)
        self.val_f1 = MulticlassF1Score(num_classes=n_classes, average="macro")

    def forward(self, input_ids, attention_mask, image, tab):
        # text -> pooled embedding (use pooler if available else mean)
        txt_out = self.text_model(input_ids=input_ids, attention_mask=attention_mask, return_dict=True)
        if hasattr(txt_out, "pooler_output") and txt_out.pooler_output is not None:
            txt_emb = txt_out.pooler_output
        else:
            txt_emb = txt_out.last_hidden_state.mean(dim=1)

        # image embedding
        img_emb = self.image_backbone(image)

        # tabular embedding
        tab_emb = self.tab_mlp(tab)

        # concat and classify
        x = torch.cat([txt_emb, img_emb, tab_emb], dim=1)
        logits = self.fusion(x)
        return logits

    def focal_loss(self, logits, targets):
        # cross-entropy per sample
        ce = nn.functional.cross_entropy(
            logits, targets, reduction="none", weight=self.class_weights_buf.to(logits.device)
        )
        pt = torch.exp(-ce)
        loss = ((1 - pt) ** self.focal_gamma * ce).mean()
        return loss

    def training_step(self, batch, batch_idx):
        logits = self(
            batch["input_ids"], batch["attention_mask"], batch["image"], batch["tab"]
        )
        loss = self.focal_loss(logits, batch["label"])
        preds = torch.argmax(logits, dim=1)
        acc_val = self.train_acc(preds, batch["label"])
        # log
        self.log("train_loss", loss, on_step=False, on_epoch=True, prog_bar=True)
        self.log("train_acc", acc_val, on_step=False, on_epoch=True, prog_bar=True)
        return loss

    def validation_step(self, batch, batch_idx):
        logits = self(
            batch["input_ids"], batch["attention_mask"], batch["image"], batch["tab"]
        )
        loss = self.focal_loss(logits, batch["label"])
        preds = torch.argmax(logits, dim=1)
        acc_val = self.val_acc(preds, batch["label"])
        f1_val = self.val_f1(preds, batch["label"])
        # log
        self.log("val_loss", loss, on_step=False, on_epoch=True, prog_bar=True)
        self.log("val_acc", acc_val, on_step=False, on_epoch=True, prog_bar=True)
        self.log("val_f1", f1_val, on_step=False, on_epoch=True, prog_bar=True)
        return {"val_loss": loss, "preds": preds, "targets": batch["label"]}

    def configure_optimizers(self):
        # AdamW with weight decay
        no_decay = ["bias", "LayerNorm.weight"]
        params = [
            {
                "params": [p for n, p in self.named_parameters() if not any(nd in n for nd in no_decay)],
                "weight_decay": self.hparams.weight_decay,
            },
            {
                "params": [p for n, p in self.named_parameters() if any(nd in n for nd in no_decay)],
                "weight_decay": 0.0,
            },
        ]
        optimizer = torch.optim.AdamW(params, lr=self.hparams.lr)
        # Using OneCycleLR requires total steps; Lightning sets trainer.estimated_stepping_batches before training
        scheduler = torch.optim.lr_scheduler.OneCycleLR(
            optimizer, max_lr=self.hparams.lr, total_steps=max(1, self.trainer.estimated_stepping_batches)
        )
        return {"optimizer": optimizer, "lr_scheduler": {"scheduler": scheduler, "interval": "step"}}


# -------------------------
# Utility functions
# -------------------------
def prepare_data(df_path: str, img_root: Optional[str], val_split: float = 0.1, random_state: int = 42):
    df = pd.read_csv(df_path)
    # Ensure minimal tabular columns exist
    for c in ["dup_count", "time_since_first_hours", "location_criticality", "image_present", "text_length"]:
        if c not in df.columns:
            df[c] = 0
    # text length
    df["text_length"] = df["report_text"].fillna("").str.len()
    # map severity strings to numeric labels if needed
    if "priority_label" not in df.columns and "severity_label" in df.columns:
        mapping = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        df["priority_label"] = df["severity_label"].map(mapping).fillna(0).astype(int)

    # Tabular features list
    tab_cols = ["dup_count", "time_since_first_hours", "location_criticality", "image_present", "text_length"]
    # scale tabular
    scaler = StandardScaler()
    df_tab = df[tab_cols].fillna(0).astype(float)
    scaler.fit(df_tab)
    df[tab_cols] = scaler.transform(df_tab)

    # train/val split (stratified)
    train_df, val_df = train_test_split(df, test_size=val_split, stratify=df["priority_label"], random_state=random_state)
    return train_df.reset_index(drop=True), val_df.reset_index(drop=True), scaler, tab_cols


def make_dataloader(df, tokenizer, scaler, tab_cols, img_root, batch_size=16, shuffle=True):
    # Albumentations transforms for images
    transforms_train = A.Compose(
        [
            A.Resize(256, 256),
            A.RandomCrop(224, 224),
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.3),
            A.Normalize(),
            ToTensorV2(),
        ]
    )
    transforms_val = A.Compose([A.Resize(224, 224), A.Normalize(), ToTensorV2()])

    ds = MultiModalDataset(df, tokenizer, tab_cols, img_root=img_root, transforms=(transforms_train if shuffle else transforms_val))

    # WeightedRandomSampler to balance classes in the DataLoader
    labels = df["priority_label"].values
    class_counts = np.bincount(labels)
    # avoid division by zero
    class_counts = np.where(class_counts == 0, 1, class_counts)
    class_weights = {i: len(labels) / class_counts[i] for i in range(len(class_counts))}
    sample_weights = np.array([class_weights[int(l)] for l in labels], dtype=np.float32)
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True) if shuffle else None

    dl = DataLoader(ds, batch_size=batch_size, sampler=sampler, shuffle=(sampler is None and shuffle), num_workers=4, pin_memory=True)
    return dl


# -------------------------
# Main script
# -------------------------
def main(args):
    train_df, val_df, scaler, tab_cols = prepare_data(args.data_csv, args.img_root, val_split=args.val_split)
    pl.seed_everything(42)

    # tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.text_model)

    # dataloaders
    train_dl = make_dataloader(train_df, tokenizer, scaler, tab_cols, args.img_root, batch_size=args.batch_size, shuffle=True)
    val_dl = make_dataloader(val_df, tokenizer, scaler, tab_cols, args.img_root, batch_size=args.batch_size, shuffle=False)

    # compute class weights for use in focal loss / buffer
    counts = np.bincount(train_df["priority_label"].values)
    counts = np.where(counts == 0, 1, counts)  # avoid zeros
    class_weights = (len(train_df) / counts).tolist()

    model = MultiModalClassifier(
        text_model_name=args.text_model,
        image_model_name=args.image_model,
        n_tab=len(tab_cols),
        tab_hidden=args.tab_hidden,
        dropout=args.dropout,
        n_classes=args.num_classes,
        lr=args.lr,
        weight_decay=args.weight_decay,
        focal_gamma=args.focal_gamma,
        class_weights=class_weights,
    )

    # Callbacks & logger
    checkpoint_cb = ModelCheckpoint(monitor="val_f1", mode="max", save_top_k=1, filename="best-{epoch:02d}-{val_f1:.4f}")
    early = EarlyStopping(monitor="val_f1", mode="max", patience=6, verbose=True)
    logger = TensorBoardLogger("tb_logs", name="multimodal_priority")

    trainer = Trainer(
        max_epochs=args.max_epochs,
        gpus=args.gpus if args.gpus > 0 else None,
        precision=16 if args.fp16 else 32,
        callbacks=[checkpoint_cb, early],
        logger=logger,
        gradient_clip_val=1.0,
        deterministic=False,
    )

    trainer.fit(model, train_dl, val_dl)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_csv", type=str, default="real_time_reports_sample.csv", help="Path to CSV dataset")
    parser.add_argument("--img_root", type=str, default="", help="Folder root for image paths in CSV (leave empty if none)")
    parser.add_argument("--gpus", type=int, default=1, help="Number of GPUs (0 for CPU)")
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--max_epochs", type=int, default=12)
    parser.add_argument("--text_model", type=str, default="distilbert-base-uncased")
    parser.add_argument("--image_model", type=str, default="tf_efficientnet_b0_ns")
    parser.add_argument("--tab_hidden", type=int, default=64)
    parser.add_argument("--dropout", type=float, default=0.3)
    parser.add_argument("--num_classes", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--weight_decay", type=float, default=1e-2)
    parser.add_argument("--focal_gamma", type=float, default=2.0)
    parser.add_argument("--fp16", action="store_true", help="Enable mixed-precision training")
    parser.add_argument("--val_split", type=float, default=0.1)
    args = parser.parse_args()
    main(args)
