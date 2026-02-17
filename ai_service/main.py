"""
AI Service Main Application
Provides AI-powered classification, duplicate detection, and priority scoring
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from image_service import get_image_classifier
from nlp_service import get_nlp_classifier
from duplicate_detector import get_duplicate_detector
from priority_scorer import get_priority_scorer
from department_router import get_department_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="CiviSense AI Service",
    description="AI-powered civic issue intelligence",
    version="2.0.0"
)

# Initialize services
image_classifier = get_image_classifier()
nlp_classifier = get_nlp_classifier()
duplicate_detector = get_duplicate_detector()
priority_scorer = get_priority_scorer()
department_router = get_department_router()


# Request/Response Models
class TextClassificationRequest(BaseModel):
    title: str
    description: str


class ImageClassificationRequest(BaseModel):
    image_url: str


class DuplicateCheckRequest(BaseModel):
    text: str
    longitude: float
    latitude: float
    category: str


class PriorityRequest(BaseModel):
    category: str
    ward_number: int
    description: str
    image_count: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DepartmentRoutingRequest(BaseModel):
    category: str


# Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "CiviSense AI Service",
        "version": "2.0.0",
        "status": "operational",
        "models": {
            "image": image_classifier.is_model_available(),
            "text": nlp_classifier.is_model_available()
        }
    }


@app.post("/classify/text")
async def classify_text(request: TextClassificationRequest):
    """
    Classify issue from text
    
    Args:
        request: Text classification request
    
    Returns:
        Classification result with category and confidence
    """
    try:
        result = nlp_classifier.classify(request.title, request.description)
        return result
    except Exception as e:
        logger.error(f"Text classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/image")
async def classify_image(request: ImageClassificationRequest):
    """
    Classify issue from image
    
    Args:
        request: Image classification request
    
    Returns:
        Classification result with category and confidence
    """
    try:
        result = image_classifier.classify(image_url=request.image_url)
        return result
    except Exception as e:
        logger.error(f"Image classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/duplicates/check")
async def check_duplicates(request: DuplicateCheckRequest):
    """
    Check for duplicate issues
    
    Args:
        request: Duplicate check request
    
    Returns:
        List of potential duplicates
    """
    try:
        duplicates = await duplicate_detector.find_duplicates(
            text=request.text,
            longitude=request.longitude,
            latitude=request.latitude,
            category=request.category
        )
        return {"duplicates": duplicates, "count": len(duplicates)}
    except Exception as e:
        logger.error(f"Duplicate detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/priority/calculate")
async def calculate_priority(request: PriorityRequest):
    """
    Calculate issue priority
    
    Args:
        request: Priority calculation request
    
    Returns:
        Priority level and score
    """
    try:
        result = await priority_scorer.score(
            category=request.category,
            ward_number=request.ward_number,
            description=request.description,
            image_count=request.image_count,
            latitude=request.latitude,
            longitude=request.longitude
        )
        return result
    except Exception as e:
        logger.error(f"Priority calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/routing/department")
async def route_to_department(request: DepartmentRoutingRequest):
    """
    Route issue to appropriate department
    
    Args:
        request: Department routing request
    
    Returns:
        Department assignment
    """
    try:
        result = department_router.route(request.category)
        return result
    except Exception as e:
        logger.error(f"Department routing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models": {
            "image": {
                "available": image_classifier.is_model_available(),
                "info": image_classifier.get_model_info()
            },
            "text": {
                "available": nlp_classifier.is_model_available(),
                "info": nlp_classifier.get_model_info()
            }
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
