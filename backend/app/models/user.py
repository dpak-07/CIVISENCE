"""
User model for MongoDB using Beanie ODM
Represents citizens, municipal staff, and admins
"""
from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    CITIZEN = "citizen"
    MUNICIPAL_STAFF = "municipal_staff"
    ADMIN = "admin"


class User(Document):
    """User document model"""
    
    email: EmailStr = Field(..., unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.CITIZEN)
    full_name: str
    phone: Optional[str] = None
    
    # Municipal staff specific fields
    department_id: Optional[str] = None  # Reference to Department
    ward_number: Optional[int] = None
    
    # Metadata
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # FCM token for push notifications
    fcm_token: Optional[str] = None
    
    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "department_id"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "citizen@example.com",
                "password_hash": "$2b$12$...",
                "role": "citizen",
                "full_name": "John Doe",
                "phone": "+919876543210",
                "is_active": True
            }
        }
