"""
Department model for municipal departments
Manages category assignments and SLA configuration
"""
from beanie import Document
from pydantic import EmailStr, Field
from typing import List, Optional
from datetime import datetime


class Department(Document):
    """Municipal department document model"""
    
    name: str = Field(..., unique=True)
    description: Optional[str] = None
    
    # Category assignments
    category_assignments: List[str] = Field(default_factory=list)
    
    # Contact information
    head_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    
    # SLA configuration (in hours)
    sla_hours: int = Field(default=24)
    
    # Metadata
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "departments"
        indexes = [
            "name",
            "category_assignments"
        ]
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Road Maintenance Department",
                "description": "Handles road repairs and pothole fixing",
                "category_assignments": ["pothole", "road_damage"],
                "head_name": "Mr. Kumar",
                "contact_email": "roads@municipality.gov.in",
                "contact_phone": "+919876543210",
                "sla_hours": 48
            }
        }
