"""
Issue service for issue management business logic.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status

from app.models.issue import Issue, IssuePriority, IssueStatus
from app.models.status_log import StatusLog
from app.models.user import User, UserRole
from app.schemas.issue import IssueCreateSchema, IssueFilterSchema
from app.services.ai_service import AIService


class IssueService:
    """Service for issue operations."""

    def __init__(self):
        self.ai_service = AIService()

    async def create_issue(
        self,
        issue_data: IssueCreateSchema,
        reporter: User,
        image_urls: Optional[List[str]] = None,
        voice_url: Optional[str] = None,
    ) -> Issue:
        """Create a new civic issue."""
        image_urls = image_urls or []

        ai_result = await self.ai_service.classify_issue(
            title=issue_data.title,
            description=issue_data.description,
            image_urls=image_urls,
            voice_url=voice_url,
            gps_coordinates=f"{issue_data.latitude},{issue_data.longitude}",
        )

        detected_category = ai_result.get("category", "other")
        category = (
            issue_data.category.value
            if issue_data.category is not None
            else str(detected_category).lower()
        )

        priority_result = await self.ai_service.calculate_priority(
            category=category,
            ward_number=issue_data.ward_number or 0,
            description=issue_data.description,
            image_count=len(image_urls),
            gps_coordinates=f"{issue_data.latitude},{issue_data.longitude}",
        )
        priority_value = str(priority_result.get("priority", "medium")).lower()
        priority = (
            IssuePriority(priority_value)
            if priority_value in {p.value for p in IssuePriority}
            else IssuePriority.MEDIUM
        )

        issue = Issue(
            title=issue_data.title,
            description=issue_data.description,
            category=category,
            priority=priority,
            priority_score=priority_result.get("score", 0.5),
            confidence_score=ai_result.get("confidence"),
            location={"type": "Point", "coordinates": [issue_data.longitude, issue_data.latitude]},
            address=issue_data.address,
            ward_number=issue_data.ward_number,
            image_url=image_urls[0] if image_urls else None,
            images=image_urls,
            voice_note_url=voice_url,
            reporter=str(reporter.id),
            department=await self.ai_service.route_to_department(category, priority.value),
            ai_metadata=ai_result,
            status=IssueStatus.REPORTED,
            status_history=[
                {
                    "status": IssueStatus.REPORTED.value,
                    "updated_by": str(reporter.id),
                    "timestamp": datetime.utcnow(),
                    "note": "Issue reported by citizen",
                }
            ],
        )
        await issue.insert()

        duplicates = await self.ai_service.detect_duplicates(
            issue_id=str(issue.id),
            title=issue.title,
            description=issue.description,
            longitude=issue_data.longitude,
            latitude=issue_data.latitude,
            category=category,
        )
        if duplicates:
            issue.is_duplicate = True
            issue.duplicate_of = duplicates[0]
            issue.status = IssueStatus.DUPLICATE
            issue.updated_at = datetime.utcnow()
            issue.status_history.append(
                {
                    "status": IssueStatus.DUPLICATE.value,
                    "updated_by": str(reporter.id),
                    "timestamp": datetime.utcnow(),
                    "note": "Potential duplicate detected by AI",
                }
            )
            await issue.save()

        return issue

    async def get_issues(
        self,
        filters: IssueFilterSchema,
        current_user: Optional[User] = None,
    ) -> List[Issue]:
        """Get filtered list of issues."""
        query = {}

        if filters.status:
            query["status"] = filters.status
        if filters.category:
            query["category"] = filters.category
        if filters.priority:
            query["priority"] = filters.priority
        if filters.ward_number is not None:
            query["ward_number"] = filters.ward_number
        if filters.department:
            query["department"] = filters.department
        if filters.assigned_to:
            query["assigned_to"] = filters.assigned_to
        if filters.start_date or filters.end_date:
            query["created_at"] = {}
            if filters.start_date:
                query["created_at"]["$gte"] = filters.start_date
            if filters.end_date:
                query["created_at"]["$lte"] = filters.end_date

        if current_user and current_user.role == UserRole.CITIZEN:
            query["reporter"] = str(current_user.id)

        return await (
            Issue.find(query)
            .sort("-created_at")
            .skip(filters.skip)
            .limit(filters.limit)
            .to_list()
        )

    async def get_issue_by_id(self, issue_id: str) -> Issue:
        """Get issue by id."""
        issue = await Issue.get(issue_id)
        if not issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found",
            )
        return issue

    async def update_status(
        self,
        issue_id: str,
        new_status: IssueStatus,
        updated_by: User,
        note: Optional[str] = None,
    ) -> Issue:
        """Update issue status."""
        issue = await self.get_issue_by_id(issue_id)

        old_status = issue.status
        issue.status = new_status
        issue.updated_at = datetime.utcnow()

        issue.status_history.append(
            {
                "status": new_status.value,
                "updated_by": str(updated_by.id),
                "timestamp": datetime.utcnow(),
                "note": note,
            }
        )

        if new_status == IssueStatus.RESOLVED and not issue.resolved_at:
            issue.resolved_at = datetime.utcnow()
        if new_status != IssueStatus.RESOLVED:
            issue.resolved_at = None

        await issue.save()
        await self._log_status_change(
            issue_id=issue_id,
            old_status=old_status.value,
            new_status=new_status.value,
            updated_by=str(updated_by.id),
            note=note,
        )
        return issue

    async def _log_status_change(
        self,
        issue_id: str,
        old_status: str,
        new_status: str,
        updated_by: str,
        note: Optional[str] = None,
    ) -> None:
        """Persist status changes for analytics."""
        log = StatusLog(
            issue_id=issue_id,
            old_status=old_status,
            new_status=new_status,
            updated_by=updated_by,
            note=note,
        )
        await log.insert()


issue_service = IssueService()
