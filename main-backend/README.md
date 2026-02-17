# Main Backend (Node) + AI Service (FastAPI)

`main-backend` now hosts the full backend API in Node.
`ai_service` is used only for AI operations:
- text/image classification
- duplicate detection
- priority scoring
- department routing

## Run

1. Install AI dependencies once:
   - `cd ../ai_service`
   - `python -m pip install -r requirements_ai.txt`
2. Install Node dependencies:
   - `cd ../main-backend`
   - `npm install`
3. Create env:
   - `copy .env.example .env`
4. Start:
   - `npm start`

Node starts on `http://127.0.0.1:5000`.
It auto-starts AI service on `http://127.0.0.1:8001`.

## Node API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `PUT /api/auth/fcm-token`
- `POST /api/report`
- `GET /api/report/:complaint_id`
- `POST /api/report/text`
- `POST /api/report/image`
- `POST /api/report/voice`
- `POST /api/issues`
- `GET /api/issues/my/reports`
- `GET /api/issues`
- `GET /api/issues/:issue_id`
- `PUT /api/issues/:issue_id/status`
- `GET /api/issues/:issue_id/timeline`
- `GET /api/analytics/summary`
- `GET /api/analytics/heatmap`
- `GET /api/analytics/trends`
- `GET /api/analytics/department/:department_id`

## Notes

- Uploads are stored locally in `main-backend/uploads` and served via `/uploads/*`.
- Voice endpoint currently stores voice file and uses provided text fields for AI; transcription is not implemented in `ai_service/main.py` yet.
