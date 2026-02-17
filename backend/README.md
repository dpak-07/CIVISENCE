# CiviSense Backend API

Production-ready FastAPI backend for the CiviSense civic issue reporting platform.

## Features

- ✅ **JWT Authentication** with role-based access control (Citizen, Municipal Staff, Admin)
- ✅ **MongoDB** with Beanie ODM for document modeling
- ✅ **AWS S3** integration for image and audio uploads
- ✅ **AI/ML** integration for issue classification and duplicate detection
- ✅ **Geospatial** queries for location-based issue filtering
- ✅ **Real-time analytics** with heatmap and trend data
- ✅ **Comprehensive API documentation** via Swagger UI

## Quick Start

### Prerequisites

- Python 3.9+
- MongoDB (local or Atlas)
- (Optional) AWS S3 account for file uploads

### Installation

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Seed demo data (optional):**
```bash
python seed_data.py
```

4. **Run the server:**
```bash
uvicorn app.main:app --reload
```

Server will start at `http://localhost:8000`

## API Documentation

Once the server is running:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/fcm-token` - Update FCM token for push notifications

### Issues
- `POST /api/issues` - Create new issue (with file upload)
- `GET /api/issues` - List issues with filters
- `GET /api/issues/{id}` - Get issue details
- `PUT /api/issues/{id}/status` - Update issue status (staff only)
- `GET /api/issues/{id}/timeline` - Get status history
- `GET /api/issues/my/reports` - Get current user's reports

### Analytics
- `GET /api/analytics/summary` - City-wide statistics
- `GET /api/analytics/heatmap` - Heatmap data for mapping
- `GET /api/analytics/trends` - Time-series trends
- `GET /api/analytics/department/{id}` - Department performance metrics

## Demo Credentials

After running `seed_data.py`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@civisense.gov.in | admin123 |
| Municipal Staff | staff.road@civisense.gov.in | staff123 |
| Citizen | citizen1@example.com | citizen123 |

## Environment Variables

```env
# Database
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=civisense

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AWS S3 (optional for development)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=civisense-uploads

# AI Service
AI_SERVICE_URL=http://localhost:8001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── database.py          # MongoDB setup
│   ├── models/              # Database models
│   ├── schemas/             # Pydantic schemas
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   ├── middleware/          # Auth middleware
│   └── utils/               # Helper functions
├── seed_data.py             # Demo data script
├── requirements.txt         # Dependencies
└── .env.example             # Environment template
```

## Features in Detail

### AI Integration
- Automatic issue classification using NLP
- Duplicate detection via geospatial + text similarity
- Priority scoring with XGBoost model
- Auto-routing to appropriate department

### File Uploads
- Multipart form data for images and audio
- S3 upload with fallback to local storage
- File type and size validation

### Security
- JWT access and refresh tokens
- Password hashing with bcrypt
- Role-based access control
- Protected routes with dependencies

### Analytics
- Real-time city-wide metrics
- Heatmap coordinates for visualization
- Department performance tracking
- SLA compliance monitoring

## Testing

```bash
pytest tests/ -v --cov=app
```

## Deployment

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Considerations
- Use production MongoDB (Atlas)
- Set DEBUG=False
- Use strong JWT_SECRET_KEY
- Configure AWS S3 for file storage
- Use environment variables for secrets
- Add rate limiting
- Enable HTTPS
- Configure logging and monitoring

## License

MIT License - CiviSense Platform
