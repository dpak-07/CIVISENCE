"""Middleware package initialization"""
from app.middleware.auth_middleware import (
    get_current_user,
    get_current_citizen,
    get_current_staff,
    get_current_admin,
    optional_auth
)

__all__ = [
    "get_current_user",
    "get_current_citizen",
    "get_current_staff",
    "get_current_admin",
    "optional_auth"
]
