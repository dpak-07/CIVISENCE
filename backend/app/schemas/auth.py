"""
Pydantic schemas for authentication endpoints
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole


class UserRegisterSchema(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    
    # Municipal staff fields
    department_id: Optional[str] = None
    ward_number: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "citizen@example.com",
                "password": "securepass123",
                "full_name": "John Doe",
                "phone": "+919876543210",
                "role": "citizen"
            }
        }


class UserLoginSchema(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "citizen@example.com",
                "password": "securepass123"
            }
        }


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "user_123",
                    "email": "citizen@example.com",
                    "full_name": "John Doe",
                    "role": "citizen"
                }
            }
        }


class UserResponse(BaseModel):
    """Schema for user response (excludes password)"""
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None
    department_id: Optional[str] = None
    ward_number: Optional[int] = None
    is_active: bool
    is_verified: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "user_123",
                "email": "citizen@example.com",
                "full_name": "John Doe",
                "role": "citizen",
                "phone": "+919876543210",
                "is_active": True,
                "is_verified": False
            }
        }


class RefreshTokenSchema(BaseModel):
    """Schema for refresh token request"""
    refresh_token: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class UpdateFCMTokenSchema(BaseModel):
    """Schema for updating FCM token"""
    fcm_token: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "fcm_token": "fHxY9..."
            }
        }
