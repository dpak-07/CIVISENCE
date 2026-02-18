from datetime import datetime, timezone


class RuntimeStats:
    def __init__(self) -> None:
        self.started_at = datetime.now(timezone.utc)
        self.processed_success = 0
        self.processed_failed = 0
        self.retried = 0
        self.queue_enqueued = 0
        self.in_flight_complaint_id: str | None = None
        self.change_stream_running = False
        self.replica_set_enabled = False
        self.retry_attempts: dict[str, int] = {}

    def uptime_seconds(self) -> int:
        return int((datetime.now(timezone.utc) - self.started_at).total_seconds())

    def to_dict(self, queue_size: int) -> dict:
        return {
            "uptimeSeconds": self.uptime_seconds(),
            "processedSuccess": self.processed_success,
            "processedFailed": self.processed_failed,
            "retried": self.retried,
            "queueEnqueued": self.queue_enqueued,
            "queueSize": queue_size,
            "inFlightComplaintId": self.in_flight_complaint_id,
            "changeStreamRunning": self.change_stream_running,
            "replicaSetEnabled": self.replica_set_enabled,
            "trackedRetryAttempts": len(self.retry_attempts),
        }
