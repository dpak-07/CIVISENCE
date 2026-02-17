"""
Pydantic schemas for issue-related endpoints.
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.issue import IssueCategory, IssuePriority, IssueStatus


class IssueCreateSchema(BaseModel):
    """Schema for creating a new issue."""

    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    category: Optional[IssueCategory] = None
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)
    address: str
    ward_number: Optional[int] = None


class IssueResponse(BaseModel):
    """Schema for issue response."""

    id: str
    complaint_id: Optional[str] = None
    title: str
    description: str
    category: str
    status: IssueStatus
    priority: IssuePriority
    priority_score: Optional[float] = None
    confidence_score: Optional[float] = None
    location: dict
    address: Optional[str] = None
    ward_number: Optional[int] = None
    image_url: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    voice_note_url: Optional[str] = None
    reporter: str
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    ai_metadata: Optional[dict] = None
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    estimated_resolution_time: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None


class IssueUpdateStatusSchema(BaseModel):
    """Schema for updating issue status (municipal staff only)."""

    status: IssueStatus
    note: Optional[str] = None


class IssueFilterSchema(BaseModel):
    """Schema for filtering issues."""

    status: Optional[IssueStatus] = None
    category: Optional[str] = None
    priority: Optional[IssuePriority] = None
    ward_number: Optional[int] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=100)


class StatusHistoryResponse(BaseModel):
    """Schema for status history entry."""

    status: str
    updated_by: str
    timestamp: datetime
    note: Optional[str] = None
