"""
Issue API routes.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.middleware.auth_middleware import get_current_staff, get_current_user
from app.models.issue import Issue
from app.models.user import User
from app.schemas.issue import (
    IssueCreateSchema,
    IssueFilterSchema,
    IssueResponse,
    IssueUpdateStatusSchema,
    StatusHistoryResponse,
)
from app.services.issue_service import issue_service
from app.services.upload_service import upload_service

router = APIRouter(prefix="/issues", tags=["Issues"])


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    title: str = Form(...),
    description: str = Form(...),
    longitude: float = Form(...),
    latitude: float = Form(...),
    address: str = Form(...),
    category: Optional[str] = Form(None),
    ward_number: Optional[int] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    voice_note: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    """Create a new civic issue report with optional images and voice note."""
    import uuid

    temp_id = str(uuid.uuid4())
    image_urls: List[str] = []
    if images:
        for image in images:
            image_urls.append(await upload_service.upload_image(image, temp_id))

    voice_url = None
    if voice_note:
        voice_url = await upload_service.upload_audio(voice_note, temp_id)

    issue_data = IssueCreateSchema(
        title=title,
        description=description,
        longitude=longitude,
        latitude=latitude,
        address=address,
        category=category,
        ward_number=ward_number,
    )

    issue = await issue_service.create_issue(
        issue_data=issue_data,
        reporter=current_user,
        image_urls=image_urls,
        voice_url=voice_url,
    )
    return _issue_to_response(issue)


@router.get("/my/reports", response_model=List[IssueResponse])
async def get_my_reports(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Get issues reported by current user."""
    issues = (
        await Issue.find(Issue.reporter == str(current_user.id))
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    return [_issue_to_response(issue) for issue in issues]


@router.get("", response_model=List[IssueResponse])
async def list_issues(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    ward_number: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """List issues with optional filters."""
    filters = IssueFilterSchema(
        status=status,
        category=category,
        priority=priority,
        ward_number=ward_number,
        skip=skip,
        limit=limit,
    )
    issues = await issue_service.get_issues(filters, current_user)
    return [_issue_to_response(issue) for issue in issues]


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(issue_id: str, current_user: User = Depends(get_current_user)):
    """Get issue details by id."""
    issue = await issue_service.get_issue_by_id(issue_id)
    return _issue_to_response(issue)


@router.put("/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    issue_id: str,
    update_data: IssueUpdateStatusSchema,
    current_user: User = Depends(get_current_staff),
):
    """Update issue status (staff/admin only)."""
    issue = await issue_service.update_status(
        issue_id=issue_id,
        new_status=update_data.status,
        updated_by=current_user,
        note=update_data.note,
    )
    return _issue_to_response(issue)


@router.get("/{issue_id}/timeline", response_model=List[StatusHistoryResponse])
async def get_issue_timeline(
    issue_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get issue status history timeline."""
    issue = await issue_service.get_issue_by_id(issue_id)
    timeline = []
    for entry in issue.status_history:
        timeline.append(
            StatusHistoryResponse(
                status=str(entry.get("status", "")),
                updated_by=str(entry.get("updated_by", "")),
                timestamp=entry.get("timestamp"),
                note=entry.get("note"),
            )
        )
    return timeline


def _issue_to_response(issue: Issue) -> IssueResponse:
    """Convert Issue model to response schema."""
    return IssueResponse(
        id=str(issue.id),
        complaint_id=issue.complaint_id,
        title=issue.title,
        description=issue.description,
        category=issue.category,
        status=issue.status,
        priority=issue.priority,
        priority_score=issue.priority_score,
        confidence_score=issue.confidence_score,
        location=issue.location,
        address=issue.address,
        ward_number=issue.ward_number,
        image_url=issue.image_url,
        images=issue.images,
        voice_note_url=issue.voice_note_url,
        reporter=issue.reporter,
        assigned_to=issue.assigned_to,
        department=issue.department,
        ai_metadata=issue.ai_metadata,
        is_duplicate=issue.is_duplicate,
        duplicate_of=issue.duplicate_of,
        estimated_resolution_time=issue.estimated_resolution_time,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        resolved_at=issue.resolved_at,
    )
