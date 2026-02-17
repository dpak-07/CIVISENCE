"""
Authentication API routes
Handles user registration, login, token refresh, and profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import (
    UserRegisterSchema,
    UserLoginSchema, 
    TokenResponse,
    UserResponse,
    RefreshTokenSchema,
    UpdateFCMTokenSchema
)
from app.services.auth_service import AuthService
from app.middleware.auth_middleware import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegisterSchema):
    """Register a new user account"""
    try:
        user = await auth_service.register_user(user_data)
        
        # Auto-login after registration
        access_token, refresh_token, _ = await auth_service.authenticate_user(
            UserLoginSchema(email=user_data.email, password=user_data.password)
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                phone=user.phone,
                department_id=user.department_id,
                ward_number=user.ward_number,
                is_active=user.is_active,
                is_verified=user.is_verified
            )
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log the full error and return detailed message
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Registration error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLoginSchema):
    """Login with email and password"""
    access_token, refresh_token, user = await auth_service.authenticate_user(login_data)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            phone=user.phone,
            department_id=user.department_id,
            ward_number=user.ward_number,
            is_active=user.is_active,
            is_verified=user.is_verified
        )
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(token_data: RefreshTokenSchema):
    """Refresh access token using refresh token"""
    new_access_token, new_refresh_token = await auth_service.refresh_access_token(
        token_data.refresh_token
    )
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        phone=current_user.phone,
        department_id=current_user.department_id,
        ward_number=current_user.ward_number,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified
    )


@router.put("/fcm-token", response_model=dict)
async def update_fcm_token(
    token_data: UpdateFCMTokenSchema,
    current_user: User = Depends(get_current_user)
):
    """Update FCM token for push notifications"""
    await auth_service.update_fcm_token(current_user, token_data.fcm_token)
    return {"message": "FCM token updated successfully"}
