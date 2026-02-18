import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.config import Settings
from app.services.model_loader import Detection

logger = logging.getLogger(__name__)


@dataclass
class PriorityResult:
    severity_score: float
    priority_score: float
    priority_level: str
    reason: str
    location_boost: int
    time_boost: int
    top_yolo_labels: list[str]


class PriorityEngine:
    def __init__(self, settings: Settings, sensitive_locations: AsyncIOMotorCollection) -> None:
        self.settings = settings
        self.sensitive_locations = sensitive_locations

    async def compute(self, complaint: dict[str, Any], detections: list[Detection]) -> PriorityResult:
        top_detections = self._top_detections_for_severity(detections)
        severity_score = self._calculate_severity(top_detections)
        location_boost = await self._location_boost(complaint)
        time_boost = self._time_boost(complaint.get("createdAt"))
        return self._compose_result(
            severity_score=severity_score,
            location_boost=location_boost,
            time_boost=time_boost,
            top_detections=top_detections,
            note="normal",
        )

    def apply_severity_reduction(
        self,
        base_result: PriorityResult,
        reduction_factor: float,
        note: str,
    ) -> PriorityResult:
        reduced = max(0.0, min(10.0, base_result.severity_score * reduction_factor))
        return self._compose_result(
            severity_score=reduced,
            location_boost=base_result.location_boost,
            time_boost=base_result.time_boost,
            top_detections=[],
            note=note,
            top_labels=base_result.top_yolo_labels,
        )

    @staticmethod
    def force_low(base_result: PriorityResult, reason: str) -> PriorityResult:
        return PriorityResult(
            severity_score=base_result.severity_score,
            priority_score=0.0,
            priority_level="low",
            reason=reason,
            location_boost=base_result.location_boost,
            time_boost=base_result.time_boost,
            top_yolo_labels=base_result.top_yolo_labels,
        )

    def _compose_result(
        self,
        severity_score: float,
        location_boost: int,
        time_boost: int,
        top_detections: list[Detection],
        note: str,
        top_labels: list[str] | None = None,
    ) -> PriorityResult:
        priority_score = round(min(10.0, max(0.0, severity_score + location_boost + time_boost)), 2)
        priority_level = self._map_level(priority_score)

        if top_labels is None:
            top_labels = [d.label for d in top_detections]

        return PriorityResult(
            severity_score=round(severity_score, 2),
            priority_score=priority_score,
            priority_level=priority_level,
            reason=(
                f"severity={severity_score:.2f}; "
                f"location_boost={location_boost}; "
                f"time_boost={time_boost}; "
                f"yolo={','.join(top_labels) if top_labels else 'none'}; "
                f"mode={note}"
            ),
            location_boost=location_boost,
            time_boost=time_boost,
            top_yolo_labels=top_labels,
        )

    def _top_detections_for_severity(self, detections: list[Detection]) -> list[Detection]:
        eligible = [d for d in detections if d.confidence >= self.settings.yolo_min_confidence_for_severity]
        ordered = sorted(eligible, key=lambda d: d.confidence, reverse=True)
        return ordered[:3]

    @staticmethod
    def _calculate_severity(top_detections: list[Detection]) -> float:
        if not top_detections:
            return 1.0

        average_confidence = sum(d.confidence for d in top_detections) / len(top_detections)
        return min(10.0, average_confidence * 10.0)

    async def _location_boost(self, complaint: dict[str, Any]) -> int:
        location = complaint.get("location") or {}
        coordinates = location.get("coordinates")
        if not isinstance(coordinates, list) or len(coordinates) != 2:
            return 0

        try:
            lng = float(coordinates[0])
            lat = float(coordinates[1])
        except (TypeError, ValueError):
            return 0

        if await self._school_within_radius(lng, lat):
            return 1
        return 0

    async def _school_within_radius(self, lng: float, lat: float) -> bool:
        query = {
            "location": {
                "$nearSphere": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": self.settings.school_radius_meters,
                }
            },
            "$or": [
                {"type": {"$regex": "school", "$options": "i"}},
                {"name": {"$regex": "school", "$options": "i"}},
                {"category": {"$regex": "school", "$options": "i"}},
            ],
        }

        try:
            document = await self.sensitive_locations.find_one(query, projection={"_id": 1})
            return document is not None
        except Exception as exc:
            logger.warning("School proximity check fallback due to error: %s", exc)
            return await self._fallback_school_scan(lng, lat)

    async def _fallback_school_scan(self, lng: float, lat: float) -> bool:
        cursor = self.sensitive_locations.find(
            {},
            projection={"location": 1, "type": 1, "name": 1, "category": 1},
        ).limit(500)

        async for document in cursor:
            if not self._is_school_document(document):
                continue

            coordinates = self._extract_coordinates(document)
            if coordinates is None:
                continue

            distance = self._haversine_meters(lng, lat, coordinates[0], coordinates[1])
            if distance <= self.settings.school_radius_meters:
                return True

        return False

    @staticmethod
    def _is_school_document(document: dict[str, Any]) -> bool:
        for key in ("type", "name", "category"):
            value = document.get(key)
            if isinstance(value, str) and "school" in value.lower():
                return True
        return False

    @staticmethod
    def _extract_coordinates(document: dict[str, Any]) -> tuple[float, float] | None:
        location = document.get("location")
        if isinstance(location, dict):
            coordinates = location.get("coordinates")
            if isinstance(coordinates, list) and len(coordinates) == 2:
                try:
                    return float(coordinates[0]), float(coordinates[1])
                except (TypeError, ValueError):
                    return None
        return None

    @staticmethod
    def _haversine_meters(lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        radius = 6_371_000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        d_phi = math.radians(lat2 - lat1)
        d_lambda = math.radians(lng2 - lng1)

        value = (
            math.sin(d_phi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
        )
        value = min(1.0, max(0.0, value))
        return radius * (2 * math.atan2(math.sqrt(value), math.sqrt(1 - value)))

    def _time_boost(self, created_at: Any) -> int:
        created = self._parse_datetime(created_at)
        if created is None:
            return 0

        age = datetime.now(timezone.utc) - created
        if age > timedelta(days=14):
            return 3
        if age > timedelta(days=7):
            return 2
        if age > timedelta(days=3):
            return 1
        return 0

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)

        if isinstance(value, str):
            text = value.replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(text)
            except ValueError:
                return None
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)

        return None

    @staticmethod
    def _map_level(score: float) -> str:
        if score < 4:
            return "low"
        if score < 7:
            return "medium"
        return "high"
