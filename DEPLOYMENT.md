# CiviSense AI Backend - Deployment & Training Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- MongoDB 7.0+
- 8GB+ RAM (for ML training)
- GPU (optional, speeds up training)

### Installation

#### 1. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**AI Service:**
```bash
cd ai_service
pip install -r requirements_ai.txt
```

#### 2. Configure Environment

Create `.env` file in backend directory:
```env
MONGODB_URL=mongodb://localhost:27017/civisense
DATABASE_NAME=civisense
JWT_SECRET_KEY=your-secret-key-here
AI_SERVICE_URL=http://localhost:8001
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=civisense-uploads
```

---

## 🎓 Training ML Models

### Option 1: Auto-Training (Recommended)

The models will automatically train on first startup if missing:

```bash
cd backend
python -m app.main
```

The system will:
1. Check for existing models
2. Create sample dataset if no training data exists
3. Train both image and text models
4. Save models to `models/` directory

### Option 2: Manual Training

**Prepare Training Data:**

1. Create directory structure:
```
models/training/unified_dataset/
├── images/
│   ├── pothole/
│   ├── garbage/
│   ├── broken_streetlight/
│   ├── water_leakage/
│   ├── drainage_overflow/
│   └── road_damage/
└── text_data.csv
```

2. Add images to respective category folders (minimum 50 per category)

3. Create `text_data.csv`:
```csv
text,category
"Large pothole on Main Street",pothole
"Garbage pile near park",garbage
...
```

**Train Models:**

```bash
# Train image model
cd backend
python -m app.ml.train_image_model

# Train text model
python -m app.ml.train_text_model
```

**Expected Output:**
- `models/image_model.h5` (~14MB)
- `models/text_model/` (~250MB)
- Training plots and confusion matrices

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Services

- **Backend API**: http://localhost:8000
- **AI Service**: http://localhost:8001
- **MongoDB**: localhost:27017
- **API Docs**: http://localhost:8000/docs

---

## 📡 API Usage

### Unified Intelligent Endpoint

**POST /api/report**

```bash
curl -X POST "http://localhost:8000/api/report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Large pothole" \
  -F "description=Dangerous pothole on Main Street" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946" \
  -F "ward_number=42" \
  -F "image=@pothole.jpg"
```

**Response:**
```json
{
  "success": true,
  "complaint_id": "CIVI-2026-12345",
  "issue_id": "507f1f77bcf86cd799439011",
  "category": "pothole",
  "priority": "HIGH",
  "department": "Road Department",
  "duplicate": false,
  "confidence_score": 0.94,
  "estimated_resolution_time": "1 days",
  "status": "pending",
  "ai_insights": {
    "image_confidence": 0.96,
    "text_confidence": 0.92,
    "priority_score": 0.85,
    "duplicate_count": 0
  }
}
```

### Get Report Status

**GET /api/report/{complaint_id}**

```bash
curl "http://localhost:8000/api/report/CIVI-2026-12345" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Testing

### Health Check

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "models": {
    "image_model": {
      "exists": true,
      "loaded": true
    },
    "text_model": {
      "exists": true,
      "loaded": true
    }
  }
}
```

### Test Image Classification

```python
from ai_service.image_service import get_image_classifier

classifier = get_image_classifier()
result = classifier.classify(image_path="test_pothole.jpg")
print(f"Category: {result['category']}, Confidence: {result['confidence']:.2%}")
```

### Test Text Classification

```python
from ai_service.nlp_service import get_nlp_classifier

classifier = get_nlp_classifier()
result = classifier.classify(
    title="Broken streetlight",
    description="The streetlight on 5th Avenue is not working"
)
print(f"Category: {result['category']}, Confidence: {result['confidence']:.2%}")
```

---

## 📊 Model Performance

### Expected Metrics

**Image Model (MobileNetV2):**
- Training accuracy: ~92%
- Validation accuracy: ~88%
- Test accuracy: ~87%
- Inference time: ~100-500ms

**Text Model (DistilBERT):**
- Training accuracy: ~94%
- Validation accuracy: ~91%
- Test accuracy: ~90%
- Inference time: ~50-200ms

---

## 🔧 Troubleshooting

### Models Not Training

**Issue:** Models fail to train automatically

**Solution:**
1. Check training data exists in `models/training/unified_dataset/`
2. Ensure sufficient disk space (>2GB)
3. Check logs: `docker-compose logs backend`
4. Manually trigger training:
   ```bash
   docker-compose exec backend python -m app.ml.train_image_model
   docker-compose exec backend python -m app.ml.train_text_model
   ```

### Out of Memory Errors

**Issue:** Training crashes with OOM error

**Solution:**
1. Reduce batch size in training scripts
2. Use smaller model (change in training scripts)
3. Add more RAM or use cloud instance

### Import Errors

**Issue:** `ModuleNotFoundError` for ML libraries

**Solution:**
```bash
pip install tensorflow torch transformers scikit-learn
```

---

## 🎯 Production Deployment

### AWS/GCP Deployment

1. **Build Docker images:**
   ```bash
   docker build -t civisense-backend:latest ./backend
   docker build -t civisense-ai:latest ./ai_service
   ```

2. **Push to registry:**
   ```bash
   docker tag civisense-backend:latest your-registry/civisense-backend:latest
   docker push your-registry/civisense-backend:latest
   ```

3. **Deploy to Kubernetes/ECS:**
   - Use provided docker-compose.yml as reference
   - Configure persistent volumes for models
   - Set up load balancer
   - Configure auto-scaling

### Environment Variables (Production)

```env
# Database
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/civisense
DATABASE_NAME=civisense

# Security
JWT_SECRET_KEY=<strong-random-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AWS
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=civisense-prod

# AI Service
AI_SERVICE_URL=http://ai-service:8001

# Monitoring
LOG_LEVEL=INFO
```

---

## 📈 Monitoring

### Key Metrics to Track

1. **API Performance:**
   - Request latency (target: <1s)
   - Error rate (target: <1%)
   - Throughput (requests/sec)

2. **ML Model Performance:**
   - Inference time
   - Confidence scores distribution
   - Prediction accuracy (via feedback)

3. **System Resources:**
   - CPU usage
   - Memory usage
   - Disk space

### Logging

All logs follow format:
```
2026-02-15 23:58:00 - app.services.model_loader - INFO - ✓ ML models ready
```

View logs:
```bash
# Docker
docker-compose logs -f backend

# Direct
tail -f backend/logs/app.log
```

---

## 🔄 Model Updates

### Retraining Models

1. **Collect new training data**
2. **Add to dataset directories**
3. **Retrain:**
   ```bash
   python -m app.ml.train_image_model
   python -m app.ml.train_text_model
   ```
4. **Restart services:**
   ```bash
   docker-compose restart backend ai-service
   ```

### Model Versioning

Models are saved with timestamps:
- `models/image_model_v1.h5`
- `models/text_model_v1/`

Update paths in code to switch versions.

---

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs`
- Review documentation
- Check model status: `GET /health`

---

## ✅ Deployment Checklist

- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Prepare training data
- [ ] Train models (or enable auto-training)
- [ ] Test endpoints locally
- [ ] Build Docker images
- [ ] Deploy to production
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Test end-to-end workflow

---

**Ready to deploy! 🚀**
