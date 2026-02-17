"""
Status Log model for tracking issue status changes
Used for analytics and timeline tracking
"""
from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime


class StatusLog(Document):
    """Status change log document model"""
    
    issue_id: str = Field(..., index=True)
    old_status: str
    new_status: str
    updated_by: str  # User ID
    note: Optional[str] = None
    
    # Timestamps
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    # Duration metrics (in minutes)
    duration_minutes: Optional[int] = None
    
    class Settings:
        name = "status_logs"
        indexes = [
            "issue_id",
            "timestamp",
            "new_status"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "issue_id": "issue_123",
                "old_status": "reported",
                "new_status": "assigned",
                "updated_by": "staff_456",
                "note": "Assigned to road maintenance team",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }
