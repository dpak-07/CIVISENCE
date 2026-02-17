"""
Unified Intelligent Report Endpoint
Orchestrates all AI modules for civic issue reporting
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, Dict, Any
from datetime import datetime
import logging
import uuid

from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.user import User
from app.services.upload_service import UploadService
from app.services.ai_service import AIService
from app.middleware.auth_middleware import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Intelligent Reporting"])

upload_service = UploadService()
ai_service = AIService()


def _to_priority_enum(priority: str) -> IssuePriority:
    normalized = (priority or "medium").strip().lower()
    for item in IssuePriority:
        if item.value == normalized:
            return item
    return IssuePriority.MEDIUM


def generate_complaint_id() -> str:
    """
    Generate unique complaint ID in format: CIVI-YYYY-NNNNN
    
    Returns:
        Formatted complaint ID
    """
    year = datetime.utcnow().year
    # Generate 5-digit random number
    random_num = str(uuid.uuid4().int)[:5].zfill(5)
    return f"CIVI-{year}-{random_num}"


def estimate_resolution_time(priority: str, category: str) -> str:
    """
    Estimate resolution time based on priority and category
    
    Args:
        priority: Issue priority (HIGH, MEDIUM, LOW)
        category: Issue category
    
    Returns:
        Estimated resolution time string
    """
    # Base resolution times in hours
    base_times = {
        "pothole": 48,
        "water_leakage": 24,
        "drainage_overflow": 36,
        "garbage": 72,
        "broken_streetlight": 48,
        "road_damage": 96
    }
    
    # Priority multipliers
    multipliers = {
        "high": 0.5,
        "medium": 1.0,
        "low": 1.5,
        "critical": 0.4,
    }
    
    base_hours = base_times.get(category, 72)
    multiplier = multipliers.get(priority.lower(), 1.0)
    
    estimated_hours = int(base_hours * multiplier)
    
    if estimated_hours < 24:
        return f"{estimated_hours} hours"
    else:
        days = estimated_hours // 24
        return f"{days} days"


@router.post("/report")
async def create_intelligent_report(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward_number: int = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Unified intelligent endpoint for civic issue reporting
    
    Orchestrates:
    - Image classification (if image provided)
    - Text classification
    - Confidence score combination
    - Duplicate detection
    - Priority calculation
    - Automated routing
    - MongoDB storage
    
    Args:
        title: Issue title
        description: Issue description
        latitude: Location latitude
        longitude: Location longitude
        ward_number: Ward number
        image: Optional image file
        current_user: Authenticated user
    
    Returns:
        Comprehensive report response with AI insights
    """
    try:
        logger.info(f"Processing intelligent report from user {current_user.email}")
        
        # Step 1: Image Classification (if provided)
        image_url = None
        image_result = None
        
        if image:
            logger.info("Processing image upload...")
            # Upload image to S3
            image_url = await upload_service.upload_file(image, "issues")
            
            # Classify image
            image_result = await ai_service.classify_image(image_url)
            logger.info(f"Image classification: {image_result}")
        
        # Step 2: Text Classification
        logger.info("Processing text classification...")
        text_result = await ai_service.classify_text(title, description)
        logger.info(f"Text classification: {text_result}")
        
        # Step 3: Combine Classifications
        if image_result and image_result.get('category'):
            # Weighted combination: image 60%, text 40%
            image_conf = image_result.get('confidence', 0)
            text_conf = text_result.get('confidence', 0)
            
            if image_conf > text_conf:
                final_category = image_result['category']
                confidence_score = (image_conf * 0.6) + (text_conf * 0.4)
            else:
                final_category = text_result['category']
                confidence_score = (text_conf * 0.6) + (image_conf * 0.4)
        else:
            # Text only
            final_category = text_result.get('category', 'road_damage')
            confidence_score = text_result.get('confidence', 0.5)
        
        logger.info(f"Final category: {final_category}, confidence: {confidence_score:.2f}")
        
        # Step 4: Duplicate Detection
        logger.info("Checking for duplicates...")
        duplicate_result = await ai_service.check_duplicates(
            text=f"{title}. {description}",
            longitude=longitude,
            latitude=latitude,
            category=final_category
        )
        
        is_duplicate = len(duplicate_result) > 0
        duplicate_of = duplicate_result[0]['issue_id'] if is_duplicate else None
        
        logger.info(f"Duplicate check: {is_duplicate}, duplicates found: {len(duplicate_result)}")
        
        # Step 5: Priority Calculation
        logger.info("Calculating priority...")
        priority_result = await ai_service.calculate_priority(
            category=final_category,
            ward_number=ward_number,
            description=description,
            image_count=1 if image else 0,
            latitude=latitude,
            longitude=longitude
        )
        
        priority = str(priority_result.get('priority', 'medium')).lower()
        priority_score = priority_result.get('score', 0.5)
        
        logger.info(f"Priority: {priority}, score: {priority_score:.2f}")
        
        # Step 6: Automated Routing
        logger.info("Routing to department...")
        department = await ai_service.route_to_department(final_category)
        if not department:
            department = "General Department"
        
        logger.info(f"Routed to: {department}")
        
        # Step 7: Generate Complaint ID
        complaint_id = generate_complaint_id()
        
        # Step 8: Estimate Resolution Time
        estimated_resolution = estimate_resolution_time(priority, final_category)
        
        # Step 9: Create Issue in Database
        issue = Issue(
            complaint_id=complaint_id,
            title=title,
            description=description,
            category=final_category,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            ward_number=ward_number,
            image_url=image_url,
            reporter=str(current_user.id),
            status=IssueStatus.PENDING if not is_duplicate else IssueStatus.DUPLICATE,
            priority=_to_priority_enum(priority),
            department=department,
            confidence_score=round(confidence_score, 3),
            duplicate_of=duplicate_of,
            estimated_resolution_time=estimated_resolution,
            ai_metadata={
                "image_classification": image_result,
                "text_classification": text_result,
                "priority_components": priority_result.get('components', {}),
                "duplicate_metadata": duplicate_result[:3] if duplicate_result else []
            }
        )
        
        await issue.insert()
        logger.info(f"Issue created: {complaint_id}")
        
        # Step 10: Construct Response
        response = {
            "success": True,
            "complaint_id": complaint_id,
            "issue_id": str(issue.id),
            "category": final_category,
            "priority": _to_priority_enum(priority).value,
            "department": department,
            "duplicate": is_duplicate,
            "duplicate_of": duplicate_of,
            "confidence_score": round(confidence_score, 3),
            "estimated_resolution_time": estimated_resolution,
            "status": issue.status.value,
            "ai_insights": {
                "image_confidence": round(image_result.get('confidence', 0), 3) if image_result else None,
                "text_confidence": round(text_result.get('confidence', 0), 3),
                "priority_score": round(priority_score, 3),
                "duplicate_count": len(duplicate_result)
            },
            "created_at": issue.created_at.isoformat()
        }
        
        logger.info(f"Report processed successfully: {complaint_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error processing intelligent report: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process report: {str(e)}"
        )


@router.get("/report/{complaint_id}")
async def get_report_status(
    complaint_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get report status by complaint ID
    
    Args:
        complaint_id: Complaint ID (CIVI-YYYY-NNNNN format)
        current_user: Authenticated user
    
    Returns:
        Report details and status
    """
    try:
        issue = await Issue.find_one({"complaint_id": complaint_id})
        
        if not issue:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "complaint_id": issue.complaint_id,
            "issue_id": str(issue.id),
            "title": issue.title,
            "description": issue.description,
            "category": issue.category,
            "priority": issue.priority.value,
            "status": issue.status.value,
            "department": issue.department,
            "duplicate": issue.duplicate_of is not None,
            "confidence_score": issue.confidence_score,
            "estimated_resolution_time": issue.estimated_resolution_time,
            "created_at": issue.created_at.isoformat(),
            "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
            "location": {
                "latitude": issue.location['coordinates'][1],
                "longitude": issue.location['coordinates'][0]
            },
            "ai_insights": issue.ai_metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# SEPARATE ENDPOINTS FOR DIFFERENT UPLOAD TYPES
# ========================================

@router.post("/report/text")
async def report_text_only(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward_number: int = Form(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Text-only report endpoint
    
    For citizens reporting issues with just text description
    
    Args:
        title: Issue title
        description: Detailed description
        latitude: Location latitude
        longitude: Location longitude
        ward_number: Ward number
        current_user: Authenticated user
    
    Returns:
        AI-classified report with department routing
    """
    try:
        logger.info(f"Processing text-only report from {current_user.email}")
        
        # Text Classification
        text_result = await ai_service.classify_text(title, description)
        final_category = text_result.get('category', 'road_damage')
        confidence_score = text_result.get('confidence', 0.5)
        
        # Duplicate Detection
        duplicate_result = await ai_service.check_duplicates(
            text=f"{title}. {description}",
            longitude=longitude,
            latitude=latitude,
            category=final_category
        )
        
        is_duplicate = len(duplicate_result) > 0
        duplicate_of = duplicate_result[0]['issue_id'] if is_duplicate else None
        
        # Priority Calculation
        priority_result = await ai_service.calculate_priority(
            category=final_category,
            ward_number=ward_number,
            description=description,
            image_count=0,
            latitude=latitude,
            longitude=longitude
        )
        
        priority = str(priority_result.get('priority', 'medium')).lower()
        
        # Department Routing
        department = await ai_service.route_to_department(final_category)
        if not department:
            department = "General Department"
        
        # Generate Complaint ID
        complaint_id = generate_complaint_id()
        estimated_resolution = estimate_resolution_time(priority, final_category)
        
        # Create Issue
        issue = Issue(
            complaint_id=complaint_id,
            title=title,
            description=description,
            category=final_category,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            ward_number=ward_number,
            reporter=str(current_user.id),
            status=IssueStatus.PENDING if not is_duplicate else IssueStatus.DUPLICATE,
            priority=_to_priority_enum(priority),
            department=department,
            confidence_score=round(confidence_score, 3),
            duplicate_of=duplicate_of,
            estimated_resolution_time=estimated_resolution,
            ai_metadata={
                "text_classification": text_result,
                "priority_components": priority_result.get('components', {}),
                "duplicate_metadata": duplicate_result[:3] if duplicate_result else [],
                "report_type": "text_only"
            }
        )
        
        await issue.insert()
        
        return {
            "success": True,
            "complaint_id": complaint_id,
            "issue_id": str(issue.id),
            "category": final_category,
            "priority": _to_priority_enum(priority).value,
            "department": department,
            "duplicate": is_duplicate,
            "confidence_score": round(confidence_score, 3),
            "estimated_resolution_time": estimated_resolution,
            "report_type": "text_only"
        }
        
    except Exception as e:
        logger.error(f"Error processing text report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/image")
async def report_with_image(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward_number: int = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Image upload report endpoint
    
    For citizens reporting issues with photo evidence
    
    Args:
        title: Issue title
        description: Detailed description
        latitude: Location latitude
        longitude: Location longitude
        ward_number: Ward number
        image: Image file (required)
        current_user: Authenticated user
    
    Returns:
        AI-classified report with image analysis
    """
    try:
        logger.info(f"Processing image report from {current_user.email}")
        
        # Upload image to S3
        image_url = await upload_service.upload_file(image, "issues")
        logger.info(f"Image uploaded: {image_url}")
        
        # Image Classification
        image_result = await ai_service.classify_image(image_url)
        
        # Text Classification
        text_result = await ai_service.classify_text(title, description)
        
        # Combine classifications (image weighted 60%, text 40%)
        image_conf = image_result.get('confidence', 0)
        text_conf = text_result.get('confidence', 0)
        
        if image_conf > text_conf:
            final_category = image_result['category']
            confidence_score = (image_conf * 0.6) + (text_conf * 0.4)
        else:
            final_category = text_result['category']
            confidence_score = (text_conf * 0.6) + (image_conf * 0.4)
        
        # Duplicate Detection
        duplicate_result = await ai_service.check_duplicates(
            text=f"{title}. {description}",
            longitude=longitude,
            latitude=latitude,
            category=final_category
        )
        
        is_duplicate = len(duplicate_result) > 0
        duplicate_of = duplicate_result[0]['issue_id'] if is_duplicate else None
        
        # Priority Calculation
        priority_result = await ai_service.calculate_priority(
            category=final_category,
            ward_number=ward_number,
            description=description,
            image_count=1,
            latitude=latitude,
            longitude=longitude
        )
        
        priority = str(priority_result.get('priority', 'medium')).lower()
        
        # Department Routing
        department = await ai_service.route_to_department(final_category)
        if not department:
            department = "General Department"
        
        # Generate Complaint ID
        complaint_id = generate_complaint_id()
        estimated_resolution = estimate_resolution_time(priority, final_category)
        
        # Create Issue
        issue = Issue(
            complaint_id=complaint_id,
            title=title,
            description=description,
            category=final_category,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            ward_number=ward_number,
            image_url=image_url,
            reporter=str(current_user.id),
            status=IssueStatus.PENDING if not is_duplicate else IssueStatus.DUPLICATE,
            priority=_to_priority_enum(priority),
            department=department,
            confidence_score=round(confidence_score, 3),
            duplicate_of=duplicate_of,
            estimated_resolution_time=estimated_resolution,
            ai_metadata={
                "image_classification": image_result,
                "text_classification": text_result,
                "priority_components": priority_result.get('components', {}),
                "duplicate_metadata": duplicate_result[:3] if duplicate_result else [],
                "report_type": "image_upload"
            }
        )
        
        await issue.insert()
        
        return {
            "success": True,
            "complaint_id": complaint_id,
            "issue_id": str(issue.id),
            "category": final_category,
            "priority": _to_priority_enum(priority).value,
            "department": department,
            "duplicate": is_duplicate,
            "confidence_score": round(confidence_score, 3),
            "estimated_resolution_time": estimated_resolution,
            "image_url": image_url,
            "ai_insights": {
                "image_confidence": round(image_conf, 3),
                "text_confidence": round(text_conf, 3)
            },
            "report_type": "image_upload"
        }
        
    except Exception as e:
        logger.error(f"Error processing image report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/voice")
async def report_with_voice(
    latitude: float = Form(...),
    longitude: float = Form(...),
    ward_number: int = Form(...),
    voice: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Voice upload report endpoint
    
    For citizens reporting issues via voice recording
    
    Args:
        latitude: Location latitude
        longitude: Location longitude
        ward_number: Ward number
        voice: Voice/audio file (required)
        title: Optional title (if not provided, generated from transcription)
        description: Optional description
        current_user: Authenticated user
    
    Returns:
        AI-classified report with voice transcription
    """
    try:
        logger.info(f"Processing voice report from {current_user.email}")
        
        # Upload voice to S3
        voice_url = await upload_service.upload_file(voice, "voice")
        logger.info(f"Voice uploaded: {voice_url}")
        
        # Transcribe voice using Whisper AI
        transcription_result = await ai_service.transcribe_voice(voice_url)
        transcribed_text = transcription_result.get('text', '')
        
        logger.info(f"Voice transcribed: {transcribed_text[:100]}...")
        
        # Use transcription as title/description if not provided
        if not title:
            # Use first sentence as title
            title = transcribed_text.split('.')[0][:100]
        
        if not description:
            description = transcribed_text
        
        # Text Classification on transcribed content
        text_result = await ai_service.classify_text(title, description)
        final_category = text_result.get('category', 'road_damage')
        confidence_score = text_result.get('confidence', 0.5)
        
        # Duplicate Detection
        duplicate_result = await ai_service.check_duplicates(
            text=transcribed_text,
            longitude=longitude,
            latitude=latitude,
            category=final_category
        )
        
        is_duplicate = len(duplicate_result) > 0
        duplicate_of = duplicate_result[0]['issue_id'] if is_duplicate else None
        
        # Priority Calculation
        priority_result = await ai_service.calculate_priority(
            category=final_category,
            ward_number=ward_number,
            description=description,
            image_count=0,
            latitude=latitude,
            longitude=longitude
        )
        
        priority = str(priority_result.get('priority', 'medium')).lower()
        
        # Department Routing
        department = await ai_service.route_to_department(final_category)
        if not department:
            department = "General Department"
        
        # Generate Complaint ID
        complaint_id = generate_complaint_id()
        estimated_resolution = estimate_resolution_time(priority, final_category)
        
        # Create Issue
        issue = Issue(
            complaint_id=complaint_id,
            title=title,
            description=description,
            category=final_category,
            location={
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            ward_number=ward_number,
            reporter=str(current_user.id),
            status=IssueStatus.PENDING if not is_duplicate else IssueStatus.DUPLICATE,
            priority=_to_priority_enum(priority),
            department=department,
            confidence_score=round(confidence_score, 3),
            duplicate_of=duplicate_of,
            estimated_resolution_time=estimated_resolution,
            ai_metadata={
                "voice_transcription": transcription_result,
                "text_classification": text_result,
                "priority_components": priority_result.get('components', {}),
                "duplicate_metadata": duplicate_result[:3] if duplicate_result else [],
                "voice_url": voice_url,
                "report_type": "voice_upload"
            }
        )
        
        await issue.insert()
        
        return {
            "success": True,
            "complaint_id": complaint_id,
            "issue_id": str(issue.id),
            "category": final_category,
            "priority": _to_priority_enum(priority).value,
            "department": department,
            "duplicate": is_duplicate,
            "confidence_score": round(confidence_score, 3),
            "estimated_resolution_time": estimated_resolution,
            "voice_url": voice_url,
            "transcription": transcribed_text,
            "report_type": "voice_upload"
        }
        
    except Exception as e:
        logger.error(f"Error processing voice report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

