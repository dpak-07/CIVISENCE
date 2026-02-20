import asyncio
import logging
import math
from dataclasses import dataclass
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo.errors import OperationFailure


logger = logging.getLogger(__name__)

GEO_RADIUS_METERS = 2000


@dataclass(frozen=True)
class GeoMultiplierResult:
    multiplier: float
    matched_type: str


class GeoMultiplier:
    def __init__(self, sensitive_locations: AsyncIOMotorCollection) -> None:
        self.sensitive_locations = sensitive_locations
        self._rules: list[tuple[str, float, list[str]]] = [
            ("school", 1.5, ["school"]),
            ("hospital", 1.4, ["hospital", "clinic", "medical"]),
            ("metro", 1.2, ["metro", "subway", "station"]),
        ]
        self._geo_query_supported: bool | None = None
        self._geo_support_lock = asyncio.Lock()
        self._geo_warning_emitted = False

    async def resolve(self, complaint: dict[str, Any]) -> GeoMultiplierResult:
        coordinates = self._extract_coordinates(complaint)
        if coordinates is None:
            return GeoMultiplierResult(multiplier=1.0, matched_type="none")

        lng, lat = coordinates
        for location_type, multiplier, keywords in self._rules:
            if await self._is_near_location_type(lng, lat, keywords):
                return GeoMultiplierResult(multiplier=multiplier, matched_type=location_type)

        return GeoMultiplierResult(multiplier=1.0, matched_type="none")

    async def _is_near_location_type(self, lng: float, lat: float, keywords: list[str]) -> bool:
        if not await self._is_geo_query_supported():
            return await self._fallback_scan(lng, lat, keywords)

        conditions = []
        for keyword in keywords:
            conditions.extend(
                [
                    {"type": {"$regex": keyword, "$options": "i"}},
                    {"name": {"$regex": keyword, "$options": "i"}},
                    {"category": {"$regex": keyword, "$options": "i"}},
                ]
            )

        query = {
            "location": {
                "$nearSphere": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": GEO_RADIUS_METERS,
                }
            },
            "$or": conditions,
        }

        try:
            match = await self.sensitive_locations.find_one(query, projection={"_id": 1})
            return match is not None
        except OperationFailure as exc:
            if getattr(exc, "code", None) == 291:
                self._geo_query_supported = False
                self._log_geo_disabled_once(exc)
                return await self._fallback_scan(lng, lat, keywords)
            logger.warning("Geo multiplier fallback due to operation error: %s", exc)
            return await self._fallback_scan(lng, lat, keywords)
        except Exception as exc:
            logger.warning("Geo multiplier fallback due to query error: %s", exc)
            return await self._fallback_scan(lng, lat, keywords)

    async def _fallback_scan(self, lng: float, lat: float, keywords: list[str]) -> bool:
        cursor = self.sensitive_locations.find(
            {},
            projection={"location": 1, "type": 1, "name": 1, "category": 1},
        )

        async for document in cursor:
            if not self._matches_keywords(document, keywords):
                continue

            coordinates = self._extract_coordinates(document)
            if coordinates is None:
                continue

            distance = self._haversine_meters(lng, lat, coordinates[0], coordinates[1])
            if distance <= GEO_RADIUS_METERS:
                return True

        return False

    async def _is_geo_query_supported(self) -> bool:
        if self._geo_query_supported is not None:
            return self._geo_query_supported

        async with self._geo_support_lock:
            if self._geo_query_supported is not None:
                return self._geo_query_supported

            try:
                index_info = await self.sensitive_locations.index_information()
                self._geo_query_supported = self._has_location_geo_index(index_info)
                if not self._geo_query_supported:
                    self._log_geo_disabled_once(
                        "missing geo index on sensitive_locations.location; using fallback scan"
                    )
            except Exception as exc:
                self._geo_query_supported = False
                self._log_geo_disabled_once(f"index inspection failed ({exc}); using fallback scan")

            return self._geo_query_supported

    def _log_geo_disabled_once(self, detail: Any) -> None:
        if self._geo_warning_emitted:
            return

        self._geo_warning_emitted = True
        logger.warning("Geo multiplier geo query disabled: %s", detail)

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
    def _matches_keywords(document: dict[str, Any], keywords: list[str]) -> bool:
        text_parts = []
        for field in ("type", "name", "category"):
            value = document.get(field)
            if isinstance(value, str):
                text_parts.append(value.lower())

        if not text_parts:
            return False

        joined = " ".join(text_parts)
        return any(keyword in joined for keyword in keywords)

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
