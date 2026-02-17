"""
Department Routing Service
Maps issue categories to appropriate municipal departments
"""
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class DepartmentRouter:
    """Rule-based department routing"""
    
    # Category to department mapping
    DEPARTMENT_MAP = {
        "pothole": "Road Maintenance Department",
        "road_damage": "Road Maintenance Department",
        "water_leakage": "Water Supply Department",
        "drainage_overflow": "Drainage & Sewerage Department",
        "garbage": "Sanitation Department",
        "broken_streetlight": "Electrical Department"
    }
    
    def __init__(self):
        """Initialize department router"""
        pass
    
    def route(self, category: str) -> Dict[str, Any]:
        """
        Route issue to appropriate department
        
        Args:
            category: Issue category
        
        Returns:
            Dict with department information
        """
        department = self.DEPARTMENT_MAP.get(
            category,
            "General Maintenance Department"
        )
        
        return {
            "department": department,
            "category": category
        }


# Global instance
_department_router = None


def get_department_router() -> DepartmentRouter:
    """Get global department router instance"""
    global _department_router
    if _department_router is None:
        _department_router = DepartmentRouter()
    return _department_router
