import asyncio
import logging

from app.core.runtime import RuntimeStats
from app.services.ai_processor import AIProcessor

logger = logging.getLogger(__name__)


class ProcessingQueue:
    def __init__(self, ai_processor: AIProcessor, runtime_stats: RuntimeStats) -> None:
        self.ai_processor = ai_processor
        self.runtime_stats = runtime_stats
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._queued_ids: set[str] = set()
        self._lock = asyncio.Lock()
        self._worker_task: asyncio.Task | None = None
        self._stopping = asyncio.Event()

    async def start(self) -> None:
        self._worker_task = asyncio.create_task(self._run(), name="processing-queue-worker")

    async def stop(self) -> None:
        self._stopping.set()
        if self._worker_task is not None:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass

    async def enqueue(self, complaint_id: str) -> bool:
        async with self._lock:
            if complaint_id in self._queued_ids or complaint_id == self.runtime_stats.in_flight_complaint_id:
                return False
            self._queued_ids.add(complaint_id)

        await self._queue.put(complaint_id)
        self.runtime_stats.queue_enqueued += 1
        return True

    def queue_size(self) -> int:
        return self._queue.qsize()

    async def _run(self) -> None:
        logger.info("Processing queue worker started")
        while not self._stopping.is_set():
            complaint_id = await self._queue.get()
            self.runtime_stats.in_flight_complaint_id = complaint_id

            async with self._lock:
                self._queued_ids.discard(complaint_id)

            try:
                await self.ai_processor.process_complaint(complaint_id)
            except Exception:
                logger.exception("Unexpected processing queue error for complaint %s", complaint_id)
            finally:
                self.runtime_stats.in_flight_complaint_id = None
                self._queue.task_done()
