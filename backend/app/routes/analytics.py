"""
Analytics API routes.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth_middleware import get_current_staff, get_current_user
from app.models.department import Department
from app.models.issue import Issue, IssueStatus
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=Dict[str, Any])
async def get_city_summary(current_user: User = Depends(get_current_user)):
    """Get city-wide summary statistics."""
    total_issues = await Issue.count()
    reported = await Issue.find(Issue.status == IssueStatus.REPORTED).count()
    in_progress = await Issue.find(Issue.status == IssueStatus.IN_PROGRESS).count()
    resolved = await Issue.find(Issue.status == IssueStatus.RESOLVED).count()

    categories: Dict[str, int] = {}
    for category in [
        "pothole",
        "garbage",
        "broken_streetlight",
        "water_leakage",
        "road_damage",
        "drainage_overflow",
        "other",
    ]:
        categories[category] = await Issue.find(Issue.category == category).count()

    resolved_issues = await Issue.find(
        Issue.status == IssueStatus.RESOLVED,
        Issue.resolved_at != None,
    ).to_list()
    avg_resolution_hours = 0.0
    if resolved_issues:
        total_hours = sum(
            (issue.resolved_at - issue.created_at).total_seconds() / 3600
            for issue in resolved_issues
            if issue.resolved_at is not None
        )
        avg_resolution_hours = total_hours / len(resolved_issues)

    return {
        "total_issues": total_issues,
        "reported": reported,
        "in_progress": in_progress,
        "resolved": resolved,
        "categories": categories,
        "avg_resolution_hours": round(avg_resolution_hours, 2),
    }


@router.get("/heatmap", response_model=List[Dict[str, Any]])
async def get_heatmap_data(
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Get issue density data for heatmap visualization."""
    query: Dict[str, Any] = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    issues = await Issue.find(query).to_list()
    heatmap_data = []
    for issue in issues:
        coords = issue.location.get("coordinates", [0.0, 0.0])
        heatmap_data.append(
            {
                "lat": float(coords[1]),
                "lng": float(coords[0]),
                "intensity": 1,
            }
        )
    return heatmap_data


@router.get("/trends", response_model=Dict[str, Any])
async def get_trends(
    days: int = Query(default=30, ge=1, le=365),
    current_user: User = Depends(get_current_staff),
):
    """Get time-series trend data for last N days."""
    start_date = datetime.utcnow() - timedelta(days=days)
    issues = await Issue.find(Issue.created_at >= start_date).to_list()
    resolved_issues = await Issue.find(Issue.resolved_at >= start_date).to_list()

    daily_counts: Dict[str, int] = {}
    for issue in issues:
        day = issue.created_at.strftime("%Y-%m-%d")
        daily_counts[day] = daily_counts.get(day, 0) + 1

    daily_resolutions: Dict[str, int] = {}
    for issue in resolved_issues:
        if issue.resolved_at is None:
            continue
        day = issue.resolved_at.strftime("%Y-%m-%d")
        daily_resolutions[day] = daily_resolutions.get(day, 0) + 1

    return {"daily_reported": daily_counts, "daily_resolved": daily_resolutions}


@router.get("/department/{department_id}", response_model=Dict[str, Any])
async def get_department_metrics(
    department_id: str,
    current_user: User = Depends(get_current_staff),
):
    """Get performance metrics for a specific department."""
    department = await Department.get(department_id)
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    total = await Issue.find(Issue.department == department.name).count()
    resolved = await Issue.find(
        Issue.department == department.name,
        Issue.status == IssueStatus.RESOLVED,
    ).count()
    resolved_issues = await Issue.find(
        Issue.department == department.name,
        Issue.status == IssueStatus.RESOLVED,
        Issue.resolved_at != None,
    ).to_list()

    avg_resolution_hours = 0.0
    if resolved_issues:
        total_hours = sum(
            (issue.resolved_at - issue.created_at).total_seconds() / 3600
            for issue in resolved_issues
            if issue.resolved_at is not None
        )
        avg_resolution_hours = total_hours / len(resolved_issues)

    within_sla = sum(
        1
        for issue in resolved_issues
        if issue.resolved_at is not None
        and (issue.resolved_at - issue.created_at).total_seconds() / 3600 <= department.sla_hours
    )
    sla_compliance = (within_sla / len(resolved_issues) * 100) if resolved_issues else 0.0

    return {
        "department_name": department.name,
        "total_issues": total,
        "resolved_issues": resolved,
        "avg_resolution_hours": round(avg_resolution_hours, 2),
        "sla_hours": department.sla_hours,
        "sla_compliance_percent": round(sla_compliance, 2),
    }
