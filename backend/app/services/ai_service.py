"""
AI Service - integrated open-source agent pipeline with fallbacks.
"""
import logging
from typing import Any, Dict, List, Optional

from app.ai_agents import get_agent_system

logger = logging.getLogger(__name__)


class AIService:
    """AI Service using the integrated agent pipeline."""

    def __init__(self):
        self.agent_system = get_agent_system()
        logger.info("AI Service initialized with integrated agents")

    async def classify_issue(
        self,
        title: str,
        description: str,
        image_urls: Optional[List[str]] = None,
        voice_url: Optional[str] = None,
        gps_coordinates: Optional[str] = None,
        area: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Classify an issue using available inputs."""
        try:
            text = f"{title}. {description}".strip()
            image_path = image_urls[0] if image_urls else None
            result = self.agent_system.process_issue(
                text=text,
                voice_path=voice_url,
                image_path=image_path,
                gps_coordinates=gps_coordinates,
                area=area,
            )
            return {
                "category": str(result.issue_type).lower(),
                "confidence": float(result.confidence_score),
                "priority": str(result.priority).lower(),
                "department": result.department,
                "sla": result.sla,
                "eta": result.eta,
                "location_insight": result.location_insight,
                "reference_case": result.reference_case,
                "model_version": "integrated-agents-v1",
            }
        except Exception as exc:
            logger.error(f"AI classification error: {exc}")
            return self._fallback_classification(title, description)

    async def classify_text(self, title: str, description: str) -> Dict[str, Any]:
        """Classify issue category from text only."""
        result = await self.classify_issue(title=title, description=description)
        return {
            "category": result.get("category", "other"),
            "confidence": result.get("confidence", 0.5),
            "model_version": result.get("model_version", "fallback-v1"),
        }

    async def classify_image(self, image_url: str) -> Dict[str, Any]:
        """Classify issue category from an image URL."""
        try:
            result = self.agent_system.process_issue(text="", image_path=image_url)
            return {
                "category": str(result.issue_type).lower(),
                "confidence": float(result.confidence_score),
                "model_version": "integrated-agents-v1",
            }
        except Exception as exc:
            logger.error(f"Image classification error: {exc}")
            return {"category": "other", "confidence": 0.5, "model_version": "fallback-v1"}

    async def transcribe_voice(self, voice_url: str) -> Dict[str, Any]:
        """Transcribe voice content from URL/path."""
        try:
            result = self.agent_system.process_issue(text="", voice_path=voice_url)
            text = result.reference_case or ""
            if not text:
                text = "Voice report received"
            return {"text": text, "model_version": "integrated-agents-v1"}
        except Exception as exc:
            logger.error(f"Voice transcription error: {exc}")
            return {"text": "", "model_version": "fallback-v1"}

    async def detect_duplicates(
        self,
        issue_id: str,
        title: str,
        description: str,
        longitude: float,
        latitude: float,
        category: str,
    ) -> List[str]:
        """Detect potential duplicate issues using internal KB."""
        try:
            query = f"{title}. {description} {category} {latitude},{longitude}"
            ref_case = self.agent_system.kb.search(query)
            if ref_case and ref_case != issue_id:
                return [str(ref_case)]
            return []
        except Exception as exc:
            logger.error(f"Duplicate detection error: {exc}")
            return []

    async def check_duplicates(
        self,
        text: str,
        longitude: float,
        latitude: float,
        category: str,
    ) -> List[Dict[str, Any]]:
        """Compatibility helper used by report routes."""
        matches = await self.detect_duplicates(
            issue_id="",
            title=text[:120],
            description=text,
            longitude=longitude,
            latitude=latitude,
            category=category,
        )
        return [{"issue_id": match, "score": 0.7} for match in matches]

    async def calculate_priority(
        self,
        category: str,
        ward_number: int,
        description: str,
        image_count: int,
        gps_coordinates: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Calculate issue priority."""
        try:
            coordinates = gps_coordinates
            if not coordinates and latitude is not None and longitude is not None:
                coordinates = f"{latitude},{longitude}"
            result = self.agent_system.process_issue(
                text=f"{category}. {description}",
                gps_coordinates=coordinates,
            )
            return {
                "priority": str(result.priority).lower(),
                "score": float(result.confidence_score),
                "reasoning": result.location_insight,
            }
        except Exception as exc:
            logger.error(f"Priority calculation error: {exc}")
            return {"priority": "medium", "score": 0.5}

    async def route_to_department(
        self,
        category: str,
        priority: Optional[str] = None,
        area: Optional[str] = None,
    ) -> Optional[str]:
        """Route issue to an appropriate department."""
        try:
            dispatch = self.agent_system.routing_agent.route(
                category,
                (priority or "medium").title(),
                area,
            )
            return dispatch.get("Department")
        except Exception as exc:
            logger.error(f"Department routing error: {exc}")
            return None

    def get_system_status(self) -> Dict[str, Any]:
        """Get status of all AI components."""
        return self.agent_system.get_system_status()

    def _fallback_classification(self, title: str, description: str) -> Dict[str, Any]:
        """Fallback rule-based classification."""
        text = f"{title} {description}".lower()
        keywords = {
            "pothole": ["pothole", "pit", "hole", "crater", "road damage"],
            "garbage": ["garbage", "waste", "trash", "litter", "dump"],
            "broken_streetlight": ["streetlight", "street light", "lamp", "lighting"],
            "water_leakage": ["water", "leak", "pipe", "burst", "overflow"],
            "road_damage": ["road", "pavement", "crack", "broken"],
            "drainage_overflow": ["drain", "drainage", "sewer", "blocked", "clog"],
        }
        for category, words in keywords.items():
            if any(word in text for word in words):
                return {
                    "category": category,
                    "confidence": 0.7,
                    "priority": "medium",
                    "model_version": "fallback-v1",
                }
        return {
            "category": "other",
            "confidence": 0.5,
            "priority": "medium",
            "model_version": "fallback-v1",
        }


_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get singleton AIService instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
