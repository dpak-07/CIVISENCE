import asyncio
import logging
from typing import Any

from app.core.runtime import RuntimeStats
from app.db import MongoDB
from app.workers.processing_queue import ProcessingQueue

logger = logging.getLogger(__name__)


class ChangeStreamListener:
    def __init__(self, mongodb: MongoDB, queue: ProcessingQueue, runtime_stats: RuntimeStats) -> None:
        self.mongodb = mongodb
        self.queue = queue
        self.runtime_stats = runtime_stats
        self._task: asyncio.Task | None = None
        self._stopping = asyncio.Event()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="mongo-change-stream-listener")

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run(self) -> None:
        if not self.mongodb.replica_set_enabled:
            logger.warning("Change stream listener disabled because replica set is not enabled.")
            self.runtime_stats.change_stream_running = False
            return

        assert self.mongodb.complaints is not None

        pipeline: list[dict[str, Any]] = [
            {
                "$match": {
                    "operationType": "insert",
                    "fullDocument.priority.aiProcessed": False,
                    "fullDocument.priority.aiProcessingStatus": "pending",
                }
            }
        ]

        while not self._stopping.is_set():
            try:
                async with self.mongodb.complaints.watch(
                    pipeline=pipeline,
                    full_document="updateLookup",
                    max_await_time_ms=1000,
                ) as stream:
                    self.runtime_stats.change_stream_running = True
                    logger.info("Mongo change stream listener started")

                    async for change in stream:
                        if self._stopping.is_set():
                            break

                        document = change.get("fullDocument") or {}
                        complaint_id = document.get("_id")
                        if complaint_id is not None:
                            await self.queue.enqueue(str(complaint_id))
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.runtime_stats.change_stream_running = False
                logger.exception("Change stream listener error: %s", exc)
                await asyncio.sleep(5)
