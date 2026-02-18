# CiviSense AI Decision Engine Service

Independent FastAPI microservice for complaint AI prioritization.

## Setup

1. Open terminal in `ai_service`.
2. Use Python 3.11 or 3.12 (Python 3.14 is not supported by current ML wheels).
3. Recommended one-command setup:
```powershell
.\setup.ps1
```
If an older `.venv` is locked/in use, the script will create a fallback environment like `.venv312`.

To leave an activated virtual environment in PowerShell, use:
```powershell
deactivate
```
4. Or manual setup: create and activate virtual environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
5. Install dependencies:
```powershell
python -m pip install --upgrade pip
pip install --only-binary=:all: -r requirements.txt
```
6. Configure environment:
```powershell
Copy-Item .env.example .env
```
For local standalone MongoDB, keep `MONGO_ALLOW_STANDALONE_FALLBACK=true` so a replica-set URI can automatically fall back to direct connection.

7. Run service:
```powershell
uvicorn app.main:app --reload
```

## Strict MongoDB Update Contract

This service updates only:

- `severityScore`
- `priority.score`
- `priority.level`
- `priority.reason`
- `priority.aiProcessed`
- `priority.aiProcessingStatus`

No routing, status, workload, duplicate, or assignment fields are modified.
