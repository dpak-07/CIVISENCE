"""
File upload service for AWS S3
Handles image and audio file uploads
"""
import boto3
from botocore.exceptions import ClientError
from typing import Optional
from fastapi import UploadFile, HTTPException, status
import uuid
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class UploadService:
    """Service for handling file uploads to AWS S3"""
    
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.AWS_S3_BUCKET
        
        # Initialize S3 client if credentials are provided
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_REGION
                )
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
    
    async def upload_image(self, file: UploadFile, issue_id: str) -> str:
        """
        Upload image file to S3
        
        Args:
            file: Image file to upload
            issue_id: Associated issue ID for organizing files
        
        Returns:
            S3 URL of uploaded file
        
        Raises:
            HTTPException: If upload fails or file type is invalid
        """
        # Validate file type
        if file.content_type not in settings.allowed_image_types_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image type. Allowed: {', '.join(settings.allowed_image_types_list)}"
            )
        
        # Validate file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to start
        
        if file_size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Generate unique filename
        file_extension = (file.filename or "file.jpg").split('.')[-1]
        unique_filename = f"issues/{issue_id}/images/{uuid.uuid4()}.{file_extension}"
        
        try:
            if self.s3_client:
                # Upload to S3
                self.s3_client.upload_fileobj(
                    file.file,
                    self.bucket_name,
                    unique_filename,
                    ExtraArgs={'ContentType': file.content_type}
                )
                
                # Return S3 URL
                url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
                return url
            else:
                # Fallback: return local path (for development without S3)
                logger.warning("S3 not configured, using local storage fallback")
                return f"/uploads/{unique_filename}"
                
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    
    async def upload_audio(self, file: UploadFile, issue_id: str) -> str:
        """
        Upload audio file (voice note) to S3
        
        Args:
            file: Audio file to upload
            issue_id: Associated issue ID
        
        Returns:
            S3 URL of uploaded file
        
        Raises:
            HTTPException: If upload fails or file type is invalid
        """
        # Validate file type
        if file.content_type not in settings.allowed_audio_types_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid audio type. Allowed: {', '.join(settings.allowed_audio_types_list)}"
            )
        
        # Validate file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Max size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Generate unique filename
        file_extension = (file.filename or "file.wav").split('.')[-1]
        unique_filename = f"issues/{issue_id}/audio/{uuid.uuid4()}.{file_extension}"
        
        try:
            if self.s3_client:
                # Upload to S3
                self.s3_client.upload_fileobj(
                    file.file,
                    self.bucket_name,
                    unique_filename,
                    ExtraArgs={'ContentType': file.content_type}
                )
                
                # Return S3 URL
                url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{unique_filename}"
                return url
            else:
                # Fallback: return local path
                logger.warning("S3 not configured, using local storage fallback")
                return f"/uploads/{unique_filename}"
                
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )

    async def upload_file(self, file: UploadFile, folder: str) -> str:
        """
        Generic uploader used by reporting endpoints.
        Routes to image/audio validators based on content type.
        """
        issue_id = str(uuid.uuid4())
        if file.content_type in settings.allowed_image_types_list:
            return await self.upload_image(file, issue_id)
        if file.content_type in settings.allowed_audio_types_list:
            return await self.upload_audio(file, issue_id)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. Allowed image/audio content types only. "
                f"folder={folder}"
            ),
        )
    
    async def delete_file(self, file_url: str) -> bool:
        """
        Delete file from S3
        
        Args:
            file_url: S3 URL of file to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if self.s3_client and file_url.startswith("https://"):
                # Extract key from URL
                key = file_url.split(f"{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/")[1]
                
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=key
                )
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete file from S3: {e}")
            return False


# Global upload service instance
upload_service = UploadService()
