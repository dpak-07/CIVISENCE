import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from pymongo import ReturnDocument

from app.config import Settings
from app.core.runtime import RuntimeStats
from app.db import MongoDB
from app.services.image_downloader import ImageDownloader
from app.services.mobilenet_service import MobileNetClassification, MobileNetService
from app.services.model_loader import Detection, YOLOModelService
from app.services.priority_engine import PriorityEngine, PriorityResult
from app.utils.cosine_similarity import cosine_similarity

logger = logging.getLogger(__name__)


@dataclass
class DuplicateMatch:
    is_duplicate: bool
    similarity: float
    matched_complaint_id: str | None


class AIProcessor:
    def __init__(
        self,
        settings: Settings,
        mongodb: MongoDB,
        model_service: YOLOModelService,
        mobilenet_service: MobileNetService,
        image_downloader: ImageDownloader,
        priority_engine: PriorityEngine,
        runtime_stats: RuntimeStats,
    ) -> None:
        self.settings = settings
        self.mongodb = mongodb
        self.model_service = model_service
        self.mobilenet_service = mobilenet_service
        self.image_downloader = image_downloader
        self.priority_engine = priority_engine
        self.runtime_stats = runtime_stats

    async def process_complaint(self, complaint_id: str) -> None:
        try:
            object_id = ObjectId(complaint_id)
        except Exception:
            logger.warning("Skipping invalid complaint id: %s", complaint_id)
            return

        complaint = await self._claim_for_processing(object_id)
        if complaint is None:
            return

        try:
            image_url = self._extract_image_url(complaint)
            if not image_url:
                raise ValueError("No image URL found on complaint")

            image = await self.image_downloader.download_image(image_url)

            # CPU-safe sequential inference.
            yolo_detections = await self.model_service.detect(image)
            mobilenet_result = await self.mobilenet_service.classify(image)
            embedding = await self.mobilenet_service.extract_embedding(image)

            base_priority = await self.priority_engine.compute(complaint, yolo_detections)
            duplicate_match = await self._check_embedding_duplicate(
                complaint_id=object_id,
                embedding=embedding,
            )

            category = str(complaint.get("category") or "").lower()
            yolo_agree = self._yolo_agrees_with_category(category, yolo_detections)
            mobilenet_agree = self._mobilenet_agrees_with_category(category, mobilenet_result)
            mismatch = not (yolo_agree and mobilenet_agree)

            mismatch_record = await self._update_mismatch_counter(
                user_id=complaint.get("reportedBy"),
                mismatch=mismatch,
            )
            blacklisted = mismatch_record.get("blacklisted", False)

            final_priority, final_status, review_required = self._apply_governance_rules(
                complaint=complaint,
                base_priority=base_priority,
                duplicate_match=duplicate_match,
                yolo_agree=yolo_agree,
                mobilenet_agree=mobilenet_agree,
                blacklisted=blacklisted,
            )

            ai_meta = self._build_ai_meta(
                embedding=embedding,
                duplicate_match=duplicate_match,
                yolo_detections=yolo_detections,
                mobilenet_result=mobilenet_result,
                yolo_agree=yolo_agree,
                mobilenet_agree=mobilenet_agree,
                mismatch_record=mismatch_record,
                review_required=review_required,
            )

            await self._mark_success(object_id, final_priority, ai_meta, final_status)
            self.runtime_stats.processed_success += 1
            self.runtime_stats.retry_attempts.pop(str(object_id), None)

            logger.info(
                "Processed complaint %s level=%s score=%.2f severity=%.2f yoloAgree=%s mobileAgree=%s duplicate=%.3f",
                complaint_id,
                final_priority.priority_level,
                final_priority.priority_score,
                final_priority.severity_score,
                yolo_agree,
                mobilenet_agree,
                duplicate_match.similarity,
            )
        except Exception as exc:
            self.runtime_stats.processed_failed += 1
            await self._mark_failed(object_id, str(exc))
            logger.exception("AI processing failed for complaint %s: %s", complaint_id, exc)

    async def _claim_for_processing(self, complaint_id: ObjectId) -> dict[str, Any] | None:
        assert self.mongodb.complaints is not None

        return await self.mongodb.complaints.find_one_and_update(
            {
                "_id": complaint_id,
                "priority.aiProcessed": False,
                "priority.aiProcessingStatus": "pending",
            },
            {"$set": {"priority.aiProcessingStatus": "processing"}},
            return_document=ReturnDocument.AFTER,
        )

    @staticmethod
    def _extract_image_url(complaint: dict[str, Any]) -> str | None:
        images = complaint.get("images")
        if isinstance(images, list) and images:
            first = images[0]
            if isinstance(first, dict):
                url = first.get("url")
                if isinstance(url, str) and url.strip():
                    return url.strip()
        return None

    async def _check_embedding_duplicate(
        self,
        complaint_id: ObjectId,
        embedding: list[float],
    ) -> DuplicateMatch:
        assert self.mongodb.complaints is not None

        lookback_start = datetime.now(timezone.utc) - timedelta(days=self.settings.duplicate_lookback_days)

        cursor = (
            self.mongodb.complaints.find(
                {
                    "_id": {"$ne": complaint_id},
                    "createdAt": {"$gte": lookback_start},
                    "aiMeta.embedding": {"$exists": True},
                },
                projection={"_id": 1, "aiMeta.embedding": 1},
            )
            .sort("createdAt", -1)
            .limit(self.settings.duplicate_compare_limit)
        )

        max_similarity = 0.0
        matched_id: str | None = None

        async for document in cursor:
            other_embedding = document.get("aiMeta", {}).get("embedding")
            if not isinstance(other_embedding, list):
                continue

            similarity = cosine_similarity(embedding, [float(value) for value in other_embedding])
            if similarity > max_similarity:
                max_similarity = similarity
                matched_id = str(document.get("_id"))

        return DuplicateMatch(
            is_duplicate=max_similarity > self.settings.duplicate_similarity_threshold,
            similarity=round(max_similarity, 6),
            matched_complaint_id=matched_id,
        )

    async def _update_mismatch_counter(self, user_id: Any, mismatch: bool) -> dict[str, Any]:
        assert self.mongodb.ai_blacklist is not None

        object_id = self._to_object_id(user_id)
        if object_id is None:
            return {"mismatchCount": 0, "blacklisted": False}

        existing = await self.mongodb.ai_blacklist.find_one({"userId": object_id})
        mismatch_count = int(existing.get("mismatchCount", 0)) if existing else 0

        if mismatch:
            await self.mongodb.ai_blacklist.update_one(
                {"userId": object_id},
                {
                    "$set": {
                        "blacklisted": False,
                        "updatedAt": datetime.now(timezone.utc),
                    },
                    "$setOnInsert": {"userId": object_id},
                    "$inc": {"mismatchCount": 1},
                },
                upsert=True,
            )
            mismatch_count += 1
        else:
            await self.mongodb.ai_blacklist.update_one(
                {"userId": object_id},
                {
                    "$setOnInsert": {
                        "userId": object_id,
                        "mismatchCount": 0,
                    },
                    "$set": {
                        "blacklisted": False,
                        "updatedAt": datetime.now(timezone.utc),
                    },
                },
                upsert=True,
            )

        return {"mismatchCount": mismatch_count, "blacklisted": False}

    def _apply_governance_rules(
        self,
        complaint: dict[str, Any],
        base_priority: PriorityResult,
        duplicate_match: DuplicateMatch,
        yolo_agree: bool,
        mobilenet_agree: bool,
        blacklisted: bool,
    ) -> tuple[PriorityResult, str, bool]:
        review_required = False
        final_status = "done"
        final_priority = base_priority

        # User blacklisting is disabled. Keep score deterministic and require manual review instead.
        _ = blacklisted

        if duplicate_match.is_duplicate:
            review_required = True
            final_status = "review_required"
            return (
                self._with_reason(base_priority, "Possible duplicate image detected; manual review required"),
                final_status,
                review_required,
            )

        if not yolo_agree and not mobilenet_agree:
            review_required = True
            final_status = "failed"
            return (
                PriorityEngine.force_low(base_priority, "Image does not match reported issue"),
                final_status,
                review_required,
            )

        if not yolo_agree or not mobilenet_agree:
            final_priority = self.priority_engine.apply_severity_reduction(
                base_result=base_priority,
                reduction_factor=0.7,
                note="ensemble_single_disagreement",
            )

        if final_priority.priority_level not in {"low", "medium", "high"}:
            final_priority = PriorityEngine.force_low(final_priority, "Priority normalized")

        return final_priority, final_status, review_required

    @staticmethod
    def _with_reason(result: PriorityResult, reason: str) -> PriorityResult:
        return PriorityResult(
            severity_score=result.severity_score,
            priority_score=result.priority_score,
            priority_level=result.priority_level,
            reason=reason,
            location_boost=result.location_boost,
            time_boost=result.time_boost,
            top_yolo_labels=result.top_yolo_labels,
        )

    def _build_ai_meta(
        self,
        embedding: list[float],
        duplicate_match: DuplicateMatch,
        yolo_detections: list[Detection],
        mobilenet_result: MobileNetClassification,
        yolo_agree: bool,
        mobilenet_agree: bool,
        mismatch_record: dict[str, Any],
        review_required: bool,
    ) -> dict[str, Any]:
        top_yolo = sorted(yolo_detections, key=lambda d: d.confidence, reverse=True)[:3]
        return {
            "embedding": embedding,
            "embeddingModel": "mobilenet_v2",
            "processedAt": datetime.now(timezone.utc),
            "isAIDuplicate": duplicate_match.is_duplicate,
            "duplicateSimilarity": duplicate_match.similarity,
            "duplicateComplaintId": duplicate_match.matched_complaint_id,
            "yoloTopDetections": [
                {"label": detection.label, "confidence": round(detection.confidence, 4)}
                for detection in top_yolo
            ],
            "mobilenetTopLabel": mobilenet_result.label,
            "mobilenetConfidence": round(mobilenet_result.confidence, 4),
            "yoloAgree": yolo_agree,
            "mobilenetAgree": mobilenet_agree,
            "mismatchCount": int(mismatch_record.get("mismatchCount", 0)),
            "blacklistedUser": bool(mismatch_record.get("blacklisted", False)),
            "reviewRequired": review_required,
        }

    def _yolo_agrees_with_category(self, category: str, detections: list[Detection]) -> bool:
        labels = [d.label.lower() for d in detections if d.confidence >= self.settings.yolo_min_confidence_for_severity]
        if not labels:
            return False

        mapping = {
            "pothole": {"car", "motorcycle", "bus", "truck", "bicycle", "person"},
            "garbage": {"person", "truck"},
            "drainage": {"person", "car", "truck", "bus", "fire hydrant"},
            "streetlight": {"traffic light"},
            "water_leak": {"fire hydrant", "person", "car", "truck"},
            "road_damage": {"car", "motorcycle", "bus", "truck", "bicycle", "person"},
        }

        allowed = mapping.get(category, set())
        return any(label in allowed for label in labels)

    @staticmethod
    def _mobilenet_agrees_with_category(category: str, result: MobileNetClassification) -> bool:
        joined = " ".join([result.label] + result.top_labels).lower()
        keyword_map = {
            "pothole": {"street", "road", "highway", "traffic"},
            "garbage": {"garbage", "trash", "waste", "bin", "truck"},
            "drainage": {"drain", "sewer", "water", "pipe", "fountain"},
            "streetlight": {"traffic light", "streetlight", "lamp", "light"},
            "water_leak": {"water", "fountain", "pipe", "hydrant", "valve"},
            "road_damage": {"street", "road", "highway", "traffic"},
        }
        return any(keyword in joined for keyword in keyword_map.get(category, set()))

    async def _mark_success(
        self,
        complaint_id: ObjectId,
        result: PriorityResult,
        ai_meta: dict[str, Any],
        ai_processing_status: str,
    ) -> None:
        assert self.mongodb.complaints is not None

        await self.mongodb.complaints.update_one(
            {"_id": complaint_id},
            {
                "$set": {
                    "severityScore": float(result.severity_score),
                    "priority.score": float(result.priority_score),
                    "priority.level": str(result.priority_level),
                    "priority.reason": str(result.reason),
                    "priority.aiProcessed": True,
                    "priority.aiProcessingStatus": ai_processing_status,
                    "aiMeta": ai_meta,
                }
            },
        )

    async def _mark_failed(self, complaint_id: ObjectId, error_message: str) -> None:
        assert self.mongodb.complaints is not None

        safe_message = error_message.strip().replace("\n", " ")[:240]
        await self.mongodb.complaints.update_one(
            {"_id": complaint_id},
            {
                "$set": {
                    "priority.reason": f"AI processing failed: {safe_message}",
                    "priority.aiProcessed": False,
                    "priority.aiProcessingStatus": "failed",
                    "aiMeta": {
                        "processedAt": datetime.now(timezone.utc),
                        "error": safe_message,
                    },
                }
            },
        )

    @staticmethod
    def _to_object_id(raw_value: Any) -> ObjectId | None:
        if isinstance(raw_value, ObjectId):
            return raw_value
        if isinstance(raw_value, str):
            try:
                return ObjectId(raw_value)
            except Exception:
                return None
        return None
