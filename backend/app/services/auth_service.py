"""
Authentication service - handles user registration, login, and token management
"""
from typing import Optional, Tuple
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import UserRegisterSchema, UserLoginSchema
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token
)


class AuthService:
    """Authentication service for user management"""
    
    @staticmethod
    async def register_user(user_data: UserRegisterSchema) -> User:
        """
        Register a new user
        
        Args:
            user_data: User registration data
        
        Returns:
            Created user document
        
        Raises:
            HTTPException: If email already exists
        """
        # Check if user already exists
        existing_user = await User.find_one(User.email == user_data.email)
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            phone=user_data.phone,
            role=user_data.role,
            department_id=user_data.department_id,
            ward_number=user_data.ward_number
        )
        
        # Save to database
        await user.insert()
        
        return user
    
    @staticmethod
    async def authenticate_user(login_data: UserLoginSchema) -> Tuple[str, str, User]:
        """
        Authenticate user and generate tokens
        
        Args:
            login_data: User login credentials
        
        Returns:
            Tuple of (access_token, refresh_token, user)
        
        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user by email
        user = await User.find_one(User.email == login_data.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return access_token, refresh_token, user
    
    @staticmethod
    async def refresh_access_token(refresh_token: str) -> Tuple[str, str]:
        """
        Generate new access token from refresh token
        
        Args:
            refresh_token: Valid refresh token
        
        Returns:
            Tuple of (new_access_token, new_refresh_token)
        
        Raises:
            HTTPException: If refresh token is invalid
        """
        # Verify refresh token
        payload = verify_token(refresh_token, token_type="refresh")
        
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user ID
        user_id = payload.get("sub")
        
        # Verify user still exists
        user = await User.get(user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new tokens
        new_access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return new_access_token, new_refresh_token
    
    @staticmethod
    async def update_fcm_token(user: User, fcm_token: str) -> User:
        """
        Update user's FCM token for push notifications
        
        Args:
            user: User document
            fcm_token: Firebase Cloud Messaging token
        
        Returns:
            Updated user document
        """
        user.fcm_token = fcm_token
        await user.save()
        return user
