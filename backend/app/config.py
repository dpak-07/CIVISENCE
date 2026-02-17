"""
Configuration management for CiviSense backend
Loads environment variables and provides app settings
"""
from typing import Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App
    APP_NAME: str = "CiviSense"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "civisense"
    
    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "civisense-uploads"
    AWS_REGION: str = "us-east-1"
    
    # AI Service
    AI_SERVICE_URL: str = "http://localhost:8001"
    
    # Firebase
    FIREBASE_SERVER_KEY: str = ""
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8081"
    
    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/jpg"
    ALLOWED_AUDIO_TYPES: str = "audio/mpeg,audio/wav,audio/webm"
    
    # Logging
    LOG_LEVEL: str = "DEBUG"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        """
        Accept bool-like values and safely handle misconfigured strings
        (for example DEBUG=WARN) without crashing settings loading.
        """
        if isinstance(value, bool):
            return value
        if value is None:
            return True
        text = str(value).strip().lower()
        if text in {"1", "true", "yes", "on", "debug"}:
            return True
        if text in {"0", "false", "no", "off", "warn", "warning", "info", "error"}:
            return False
        return True

    @field_validator("LOG_LEVEL", mode="before")
    @classmethod
    def parse_log_level(cls, value: Any) -> str:
        """Normalize log level and default to DEBUG for full terminal logging."""
        allowed = {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG", "NOTSET"}
        if value is None:
            return "DEBUG"
        level = str(value).strip().upper()
        if level == "WARN":
            level = "WARNING"
        return level if level in allowed else "DEBUG"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def allowed_image_types_list(self) -> List[str]:
        """Parse allowed image types"""
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",")]
    
    @property
    def allowed_audio_types_list(self) -> List[str]:
        """Parse allowed audio types"""
        return [t.strip() for t in self.ALLOWED_AUDIO_TYPES.split(",")]
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


# Global settings instance
settings = Settings()
