import asyncio
import logging
from dataclasses import dataclass

import numpy as np
import torch
from PIL import Image
from torchvision.models import MobileNet_V2_Weights, mobilenet_v2

from app.config import Settings

logger = logging.getLogger(__name__)


@dataclass
class MobileNetClassification:
    label: str
    confidence: float
    top_labels: list[str]


class MobileNetService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        self._feature_extractor = None
        self._preprocess = None
        self._categories: list[str] = []

    async def load(self) -> None:
        await asyncio.to_thread(self._load_sync)

    def _load_sync(self) -> None:
        weights = MobileNet_V2_Weights.DEFAULT
        model = mobilenet_v2(weights=weights)
        model.eval()
        model.to("cpu")

        self._model = model
        self._feature_extractor = torch.nn.Sequential(
            model.features,
            torch.nn.AdaptiveAvgPool2d((1, 1)),
        )
        self._preprocess = weights.transforms()
        self._categories = list(weights.meta.get("categories", []))

        logger.info("MobileNetV2 loaded on CPU")

    async def extract_embedding(self, image: Image.Image) -> list[float]:
        if self._model is None or self._feature_extractor is None or self._preprocess is None:
            raise RuntimeError("MobileNet model is not loaded")

        return await asyncio.to_thread(self._extract_embedding_sync, image)

    def _extract_embedding_sync(self, image: Image.Image) -> list[float]:
        assert self._feature_extractor is not None
        assert self._preprocess is not None

        tensor = self._preprocess(image.convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            features = self._feature_extractor(tensor)

        vector = features.flatten().cpu().numpy().astype(np.float32)
        norm = float(np.linalg.norm(vector))
        if norm > 0.0:
            vector = vector / norm

        return [float(value) for value in vector.tolist()]

    async def classify(self, image: Image.Image) -> MobileNetClassification:
        if self._model is None or self._preprocess is None:
            raise RuntimeError("MobileNet model is not loaded")

        return await asyncio.to_thread(self._classify_sync, image)

    def _classify_sync(self, image: Image.Image) -> MobileNetClassification:
        assert self._model is not None
        assert self._preprocess is not None

        tensor = self._preprocess(image.convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            logits = self._model(tensor)
            probabilities = torch.softmax(logits, dim=1)
            top_values, top_indices = torch.topk(probabilities, k=3, dim=1)

        top_labels: list[str] = []
        for idx in top_indices[0].tolist():
            if 0 <= idx < len(self._categories):
                top_labels.append(self._categories[idx])
            else:
                top_labels.append(str(idx))

        confidence = float(top_values[0][0].item())
        label = top_labels[0] if top_labels else "unknown"
        return MobileNetClassification(label=label, confidence=confidence, top_labels=top_labels)
