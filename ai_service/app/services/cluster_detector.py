import asyncio
import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo.errors import OperationFailure


logger = logging.getLogger(__name__)

CLUSTER_RADIUS_METERS = 500
CLUSTER_LOOKBACK_DAYS = 3
CLUSTER_THRESHOLD = 3


@dataclass(frozen=True)
class ClusterResult:
    nearby_count: int
    cluster_boost: float


class ClusterDetector:
    def __init__(self, complaints: AsyncIOMotorCollection) -> None:
        self.complaints = complaints
        self._geo_query_supported: bool | None = None
        self._geo_support_lock = asyncio.Lock()
        self._geo_warning_emitted = False

    async def detect(self, complaint: dict[str, Any]) -> ClusterResult:
        coordinates = self._extract_coordinates(complaint)
        if coordinates is None:
            return ClusterResult(nearby_count=0, cluster_boost=0.0)

        complaint_id = complaint.get("_id")
        object_id = complaint_id if isinstance(complaint_id, ObjectId) else None
        lng, lat = coordinates
        lookback_start = datetime.now(timezone.utc) - timedelta(days=CLUSTER_LOOKBACK_DAYS)

        count = await self._nearby_count(
            lng=lng,
            lat=lat,
            lookback_start=lookback_start,
            excluded_id=object_id,
        )
        boost = 1.0 if count >= CLUSTER_THRESHOLD else 0.0
        return ClusterResult(nearby_count=count, cluster_boost=boost)

    async def _nearby_count(
        self,
        lng: float,
        lat: float,
        lookback_start: datetime,
        excluded_id: ObjectId | None,
    ) -> int:
        if not await self._is_geo_query_supported():
            return await self._fallback_count(
                lng=lng,
                lat=lat,
                lookback_start=lookback_start,
                excluded_id=excluded_id,
            )

        query: dict[str, Any] = {
            "createdAt": {"$gte": lookback_start},
            "location": {
                "$nearSphere": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": CLUSTER_RADIUS_METERS,
                }
            },
        }
        if excluded_id is not None:
            query["_id"] = {"$ne": excluded_id}

        try:
            cursor = self.complaints.find(query, projection={"_id": 1}).limit(CLUSTER_THRESHOLD)
            count = 0
            async for _ in cursor:
                count += 1
            return count
        except OperationFailure as exc:
            if getattr(exc, "code", None) == 291:
                self._geo_query_supported = False
                self._log_geo_disabled_once(exc)
                return await self._fallback_count(
                    lng=lng,
                    lat=lat,
                    lookback_start=lookback_start,
                    excluded_id=excluded_id,
                )
            logger.warning("Cluster query fallback due to operation error: %s", exc)
            return await self._fallback_count(
                lng=lng,
                lat=lat,
                lookback_start=lookback_start,
                excluded_id=excluded_id,
            )
        except Exception as exc:
            logger.warning("Cluster query fallback due to error: %s", exc)
            return await self._fallback_count(
                lng=lng,
                lat=lat,
                lookback_start=lookback_start,
                excluded_id=excluded_id,
            )

    async def _fallback_count(
        self,
        lng: float,
        lat: float,
        lookback_start: datetime,
        excluded_id: ObjectId | None,
    ) -> int:
        filter_query: dict[str, Any] = {"createdAt": {"$gte": lookback_start}}
        if excluded_id is not None:
            filter_query["_id"] = {"$ne": excluded_id}

        cursor = self.complaints.find(
            filter_query,
            projection={"location": 1},
        )

        count = 0
        async for document in cursor:
            coordinates = self._extract_coordinates(document)
            if coordinates is None:
                continue

            distance = self._haversine_meters(lng, lat, coordinates[0], coordinates[1])
            if distance <= CLUSTER_RADIUS_METERS:
                count += 1
                if count >= CLUSTER_THRESHOLD:
                    return count

        return count

    async def _is_geo_query_supported(self) -> bool:
        if self._geo_query_supported is not None:
            return self._geo_query_supported

        async with self._geo_support_lock:
            if self._geo_query_supported is not None:
                return self._geo_query_supported

            try:
                index_info = await self.complaints.index_information()
                self._geo_query_supported = self._has_location_geo_index(index_info)
                if not self._geo_query_supported:
                    self._log_geo_disabled_once(
                        "missing geo index on complaints.location; using fallback scan"
                    )
            except Exception as exc:
                self._geo_query_supported = False
                self._log_geo_disabled_once(f"index inspection failed ({exc}); using fallback scan")

            return self._geo_query_supported

    def _log_geo_disabled_once(self, detail: Any) -> None:
        if self._geo_warning_emitted:
            return

        self._geo_warning_emitted = True
        logger.warning("Cluster geo query disabled: %s", detail)

    @staticmethod
    def _has_location_geo_index(index_info: dict[str, Any]) -> bool:
        for _, details in index_info.items():
            key_spec = details.get("key")
            if not isinstance(key_spec, list):
                continue
            for entry in key_spec:
                if not isinstance(entry, tuple) or len(entry) != 2:
                    continue
                field_name, index_type = entry
                if field_name == "location" and str(index_type) in {"2dsphere", "2d"}:
                    return True
        return False

    @staticmethod
    def _extract_coordinates(document: dict[str, Any]) -> tuple[float, float] | None:
        location = document.get("location")
        if not isinstance(location, dict):
            return None

        coordinates = location.get("coordinates")
        if not isinstance(coordinates, list) or len(coordinates) != 2:
            return None

        try:
            return float(coordinates[0]), float(coordinates[1])
        except (TypeError, ValueError):
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
