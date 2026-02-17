"""
Issue model for civic issue reports
Includes geospatial data, AI classification, and status tracking
"""
from beanie import Document
from pydantic import Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IssueCategory(str, Enum):
    """Civic issue categories"""
    POTHOLE = "pothole"
    GARBAGE = "garbage"
    BROKEN_STREETLIGHT = "broken_streetlight"
    WATER_LEAKAGE = "water_leakage"
    ROAD_DAMAGE = "road_damage"
    DRAINAGE_OVERFLOW = "drainage_overflow"
    OTHER = "other"


class IssueStatus(str, Enum):
    """Issue workflow status"""
    PENDING = "pending"
    REPORTED = "reported"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    DUPLICATE = "duplicate"


class IssuePriority(str, Enum):
    """Issue priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GeoLocation(dict):
    """GeoJSON Point for geospatial queries"""
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]


class AIClassification(dict):
    """AI classification metadata"""
    category: str
    confidence: float
    model_version: str
    timestamp: datetime


class StatusUpdate(dict):
    """Status history entry"""
    status: str
    updated_by: str  # User ID
    timestamp: datetime
    note: Optional[str] = None


class Issue(Document):
    """Civic issue document model"""
    
    # Basic information
    complaint_id: Optional[str] = None  # CIVI-YYYY-NNNNN format
    title: str
    description: str
    category: str  # Changed from IssueCategory to str for flexibility
    status: IssueStatus = Field(default=IssueStatus.PENDING)
    priority: IssuePriority = Field(default=IssuePriority.MEDIUM)
    priority_score: Optional[float] = None  # AI-calculated score
    
    # Location
    location: dict  # GeoJSON Point: {"type": "Point", "coordinates": [lng, lat]}
    address: Optional[str] = None
    ward_number: Optional[int] = None
    
    # Media attachments
    image_url: Optional[str] = None  # Primary image S3 URL
    images: List[str] = Field(default_factory=list)  # Additional S3 URLs
    voice_note_url: Optional[str] = None
    
    # Relationships
    reporter: str  # User ID of citizen who reported
    assigned_to: Optional[str] = None  # User ID of assigned municipal staff
    department: Optional[str] = None  # Department name
    
    # AI metadata
    confidence_score: Optional[float] = None  # Combined AI confidence
    ai_metadata: Optional[dict] = None  # Full AI classification details
    duplicate_of: Optional[str] = None  # Issue ID if duplicate
    is_duplicate: bool = False
    estimated_resolution_time: Optional[str] = None  # e.g., "2 days"
    
    # Status tracking
    status_history: List[dict] = Field(default_factory=list)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # SLA tracking
    sla_deadline: Optional[datetime] = None
    is_overdue: bool = False
    
    class Settings:
        name = "issues"
        indexes = [
            "status",
            "category",
            "ward_number",
            "reporter",
            "assigned_to",
            "department",
            "created_at",
            [("location", "2dsphere")]  # Geospatial index
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Large pothole on Main Street",
                "description": "Deep pothole causing traffic issues",
                "category": "pothole",
                "status": "reported",
                "priority": "high",
                "location": {
                    "type": "Point",
                    "coordinates": [77.5946, 12.9716]
                },
                "address": "123 Main St, Bangalore",
                "ward_number": 42,
                "images": ["https://s3.amazonaws.com/..."],
                "reporter": "user_id_123"
            }
        }
