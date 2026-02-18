import asyncio
import io
import logging

import aiohttp
from PIL import Image

from app.config import Settings

logger = logging.getLogger(__name__)


class ImageDownloader:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._session: aiohttp.ClientSession | None = None

    async def start(self) -> None:
        timeout = aiohttp.ClientTimeout(total=self.settings.image_download_timeout_seconds)
        self._session = aiohttp.ClientSession(timeout=timeout, raise_for_status=True)

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None

    async def download_image(self, url: str) -> Image.Image:
        if self._session is None:
            raise RuntimeError("Image downloader has not been started")

        async with self._session.get(url) as response:
            content_type = (response.headers.get("Content-Type") or "").lower()
            if "image" not in content_type:
                raise ValueError(f"Expected image content type, got: {content_type or 'unknown'}")

            chunks = bytearray()
            async for chunk in response.content.iter_chunked(64 * 1024):
                chunks.extend(chunk)
                if len(chunks) > self.settings.image_max_bytes:
                    raise ValueError("Image size exceeds configured max size")

        return await asyncio.to_thread(self._bytes_to_image, bytes(chunks))

    @staticmethod
    def _bytes_to_image(data: bytes) -> Image.Image:
        with Image.open(io.BytesIO(data)) as image:
            return image.convert("RGB")
