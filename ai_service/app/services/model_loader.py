import asyncio
import logging
import os
from dataclasses import dataclass

import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO

from app.config import Settings

logger = logging.getLogger(__name__)

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")


@dataclass
class Detection:
    label: str
    confidence: float
    bbox: tuple[float, float, float, float]
    area_percentage: float


class YOLOModelService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model: YOLO | None = None

    async def load(self) -> None:
        await asyncio.to_thread(self._load_sync)

    def _load_sync(self) -> None:
        torch.set_num_threads(max(1, self.settings.cpu_threads))
        try:
            torch.set_num_interop_threads(1)
        except RuntimeError:
            pass

        self._model = YOLO(self.settings.yolo_model_name)
        self._model.to("cpu")
        logger.info("YOLO model loaded: %s on CPU", self.settings.yolo_model_name)

    async def detect(self, image: Image.Image) -> list[Detection]:
        if self._model is None:
            raise RuntimeError("YOLO model is not loaded")

        prepared = await asyncio.to_thread(self._prepare_image, image)
        return await asyncio.to_thread(self._predict_sync, prepared)

    def _prepare_image(self, image: Image.Image) -> np.ndarray:
        image = image.convert("RGB")
        width, height = image.size
        max_dim = self.settings.yolo_max_image_dimension

        if max(width, height) > max_dim:
            scale = max_dim / max(width, height)
            resized = (
                max(1, int(width * scale)),
                max(1, int(height * scale)),
            )
            image = image.resize(resized, Image.Resampling.BILINEAR)

        return np.asarray(image, dtype=np.uint8)

    def _predict_sync(self, image_array: np.ndarray) -> list[Detection]:
        assert self._model is not None
        results = self._model.predict(
            source=image_array,
            conf=self.settings.yolo_confidence_threshold,
            imgsz=self.settings.yolo_image_size,
            device="cpu",
            verbose=False,
        )

        if not results:
            return []

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return []

        image_h, image_w = result.orig_shape
        image_area = max(1.0, float(image_w * image_h))
        detections: list[Detection] = []

        for idx in range(len(boxes)):
            cls_idx = int(boxes.cls[idx].item())
            label = result.names.get(cls_idx, str(cls_idx))
            confidence = float(boxes.conf[idx].item())
            x1, y1, x2, y2 = [float(v) for v in boxes.xyxy[idx].tolist()]
            area = max(0.0, x2 - x1) * max(0.0, y2 - y1)
            area_percentage = min(100.0, (area / image_area) * 100.0)

            detections.append(
                Detection(
                    label=label,
                    confidence=confidence,
                    bbox=(x1, y1, x2, y2),
                    area_percentage=area_percentage,
                )
            )

        return detections
