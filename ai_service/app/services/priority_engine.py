import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.services.cluster_detector import ClusterDetector
from app.services.geo_multiplier import GeoMultiplier
from app.services.text_scoring_engine import TextScoringEngine


@dataclass(frozen=True)
class PriorityResult:
    base_score: float
    geo_multiplier: float
    geo_context: str
    time_score: float
    cluster_count: int
    cluster_boost: float
    priority_score: float
    priority_level: str
    reason: str


class PriorityEngine:
    def __init__(
        self,
        complaints: AsyncIOMotorCollection,
        sensitive_locations: AsyncIOMotorCollection,
    ) -> None:
        self.text_engine = TextScoringEngine()
        self.geo_multiplier = GeoMultiplier(sensitive_locations)
        self.cluster_detector = ClusterDetector(complaints)

    async def compute(self, complaint: dict[str, Any]) -> PriorityResult:
        title = complaint.get("title")
        description = complaint.get("description")

        text_result = self.text_engine.score(
            title=title if isinstance(title, str) else "",
            description=description if isinstance(description, str) else "",
        )
        geo_result = await self.geo_multiplier.resolve(complaint)
        cluster_result = await self.cluster_detector.detect(complaint)
        time_score = self._time_score(complaint.get("createdAt"))

        final_score = round(
            (text_result.base_score * geo_result.multiplier) + time_score + cluster_result.cluster_boost,
            2,
        )
        level = self._map_level(final_score)

        reason = (
            "Text score="
            f"{text_result.base_score:.2f} "
            f"(high={text_result.high_count}, medium={text_result.medium_count}, normal={text_result.normal_count}); "
            f"Geo multiplier={geo_result.multiplier:.2f} ({geo_result.matched_type}); "
            f"Time score={time_score:.2f}; "
            f"Cluster boost={cluster_result.cluster_boost:.2f} (count={cluster_result.nearby_count})"
        )

        return PriorityResult(
            base_score=text_result.base_score,
            geo_multiplier=geo_result.multiplier,
            geo_context=geo_result.matched_type,
            time_score=time_score,
            cluster_count=cluster_result.nearby_count,
            cluster_boost=cluster_result.cluster_boost,
            priority_score=final_score,
            priority_level=level,
            reason=reason,
        )

    def _time_score(self, created_at: Any) -> float:
        parsed = self._parse_datetime(created_at)
        if parsed is None:
            return 0.0

        now = datetime.now(timezone.utc)
        elapsed_seconds = max(0.0, (now - parsed).total_seconds())
        days_pending = elapsed_seconds / 86_400.0
        score = math.log(days_pending + 1.0) * 2.0
        return round(min(3.0, score), 2)

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)

        if isinstance(value, str):
            text = value.strip().replace("Z", "+00:00")
            if not text:
                return None

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
        if score < 3.0:
            return "low"
        if score <= 6.0:
            return "medium"
        return "high"
