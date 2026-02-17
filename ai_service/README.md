# CiviSense AI/ML Service

Standalone FastAPI service for AI-powered civic issue analysis.

## Features

- **NLP Classification**: Sentence Transformers for text-based category prediction
- **Duplicate Detection**: FAISS similarity search + geospatial clustering
- **Priority Scoring**: XGBoost model for intelligent prioritization
- **Department Routing**: Rule-based automatic department assignment

## Quick Start

```bash
cd ai_service
pip install -r requirements_ai.txt
python main.py
```

Service runs at `http://localhost:8001`

## API Endpoints

### Classify Issue
```
POST /classify
{
  "title": "Large pothole on Main Street",
  "description": "Deep pothole causing issues",
  "image_urls": []
}
```

### Detect Duplicates
```
POST /detect-duplicates
{
  "issue_id": "123",
  "title": "Pothole",
  "description": "Large pothole",
  "longitude": 77.5946,
  "latitude": 12.9716,
  "category": "pothole"
}
```

### Calculate Priority
```
POST /calculate-priority
{
  "category": "water_leakage",
  "ward_number": 42,
  "description": "Urgent water leak",
  "image_count": 2
}
```

### Route to Department
```
POST /route-department
{
  "category": "pothole"
}
```

## Integration

The backend FastAPI service calls this AI service via HTTP:

```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8001/classify",
        json={"title": "...", "description": "..."}
    )
```

## Models

Uses pre-trained models from `models/training/`:
- `sentence_transformer_model.joblib` - Text encoder
- `faiss_full.index` - FAISS similarity index
- `calibrated_xgb.joblib` - XGBoost priority model
- `feature_columns.joblib` - Feature definitions

## Deployment

Can be deployed separately from main backend for horizontal scaling.

```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```
