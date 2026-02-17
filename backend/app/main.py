"""
FastAPI Backend for CiviSense
Civic Issue Reporting and Resolution Platform with AI intelligence
"""
import logging
import time
from contextlib import asynccontextmanager

from beanie import init_beanie
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.models.department import Department
from app.models.issue import Issue
from app.models.status_log import StatusLog
from app.models.user import User
from app.routes import analytics, auth, issues, report

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.DEBUG),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting CiviSense Backend...")

    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=client[settings.MONGODB_DB_NAME],
            document_models=[User, Issue, Department, StatusLog],
        )
        logger.info("MongoDB connected successfully")
    except Exception as exc:
        logger.error(f"MongoDB connection failed: {exc}")
        raise

    logger.info("Using AI Agent Pipeline (Whisper, Transformers, FAISS, spaCy)")
    logger.info("CiviSense Backend started successfully")

    yield

    logger.info("Shutting down CiviSense Backend...")
    client.close()


app = FastAPI(
    title="CiviSense API",
    description="AI-Driven Civic Issue Reporting and Resolution Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(report.router)
app.include_router(issues.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """
    Log every request with method, path, status code, and latency.
    """
    start = time.perf_counter()
    logger.info(f"REQUEST START {request.method} {request.url.path}")
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"REQUEST END {request.method} {request.url.path} "
        f"status={response.status_code} duration_ms={duration_ms:.2f}"
    )
    return response


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "CiviSense API v2.0 - AI-Driven Civic Intelligence Platform",
        "status": "operational",
        "features": [
            "Intelligent issue reporting with AI classification",
            "Duplicate detection using hybrid approach",
            "Priority scoring with weighted formula",
            "Automated department routing",
            "Real-time analytics and tracking",
        ],
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_system": "operational",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True,
    )
