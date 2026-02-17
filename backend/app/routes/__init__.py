"""Routes package initialization"""
from app.routes.auth import router as auth_router
from app.routes.issues import router as issues_router
from app.routes.analytics import router as analytics_router

__all__ = [
    "auth_router",
    "issues_router",
    "analytics_router"
]
