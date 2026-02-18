import asyncio
import logging

from app.config import Settings
from app.core.runtime import RuntimeStats
from app.db import MongoDB
from app.workers.processing_queue import ProcessingQueue

logger = logging.getLogger(__name__)


class RetryWorker:
    def __init__(
        self,
        settings: Settings,
        mongodb: MongoDB,
        queue: ProcessingQueue,
        runtime_stats: RuntimeStats,
    ) -> None:
        self.settings = settings
        self.mongodb = mongodb
        self.queue = queue
        self.runtime_stats = runtime_stats
        self._task: asyncio.Task | None = None
        self._stopping = asyncio.Event()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="retry-worker")

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        while not self._stopping.is_set():
            await self.run_once()

            try:
                await asyncio.wait_for(self._stopping.wait(), timeout=self.settings.retry_interval_seconds)
            except asyncio.TimeoutError:
                continue

    async def run_once(self) -> None:
        assert self.mongodb.complaints is not None

        pending_cursor = self.mongodb.complaints.find(
            {
                "priority.aiProcessed": False,
                "priority.aiProcessingStatus": "pending",
            },
            projection={"_id": 1},
        ).sort("createdAt", 1).limit(self.settings.retry_batch_size)

        async for complaint in pending_cursor:
            await self.queue.enqueue(str(complaint["_id"]))

        failed_cursor = self.mongodb.complaints.find(
            {
                "priority.aiProcessed": False,
                "priority.aiProcessingStatus": "failed",
            },
            projection={"_id": 1},
        ).sort("createdAt", 1).limit(self.settings.retry_batch_size)

        async for complaint in failed_cursor:
            complaint_id = str(complaint["_id"])
            attempt_count = self.runtime_stats.retry_attempts.get(complaint_id, 0)

            if attempt_count >= self.settings.max_retry_attempts:
                continue

            result = await self.mongodb.complaints.update_one(
                {
                    "_id": complaint["_id"],
                    "priority.aiProcessed": False,
                    "priority.aiProcessingStatus": "failed",
                },
                {
                    "$set": {
                        "priority.aiProcessed": False,
                        "priority.aiProcessingStatus": "pending",
                    }
                },
            )

            if result.modified_count == 1:
                self.runtime_stats.retry_attempts[complaint_id] = attempt_count + 1
                self.runtime_stats.retried += 1
                await self.queue.enqueue(complaint_id)

        logger.debug("Retry worker run complete")
