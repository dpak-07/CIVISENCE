from fastapi import APIRouter, Request

router = APIRouter(tags=["monitoring"])


@router.get("/health")
async def health(request: Request) -> dict:
    runtime = request.app.state.runtime_stats
    queue = request.app.state.processing_queue
    db = request.app.state.mongodb

    return {
        "status": "ok",
        "service": "civisence-ai-service",
        "replicaSetEnabled": runtime.replica_set_enabled,
        "changeStreamRunning": runtime.change_stream_running,
        "queueSize": queue.queue_size(),
        "pendingCount": await db.count_pending_complaints(),
    }


@router.get("/stats")
async def stats(request: Request) -> dict:
    runtime = request.app.state.runtime_stats
    queue = request.app.state.processing_queue

    return runtime.to_dict(queue_size=queue.queue_size())


@router.get("/pending-count")
async def pending_count(request: Request) -> dict:
    db = request.app.state.mongodb
    count = await db.count_pending_complaints()
    return {"pendingCount": count}
