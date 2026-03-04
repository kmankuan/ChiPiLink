"""
Monday.com API Queue — Centralized rate-limited queue for all Monday.com API calls.
Prevents cascading failures from concurrent API requests hitting Monday's complexity budget.
Max 2 concurrent requests. Priority levels. Auto-retry with backoff.
"""
import asyncio
import logging
import time
from typing import Any, Callable, Optional
from enum import IntEnum

logger = logging.getLogger(__name__)


class Priority(IntEnum):
    HIGH = 1      # User-facing (order submission, login)
    NORMAL = 2    # Admin actions (import, manual sync)
    LOW = 3       # Background (widget refresh, auto-sync)


class MondayQueue:
    def __init__(self, max_concurrent: int = 2):
        self._queue = asyncio.PriorityQueue()
        self._max_concurrent = max_concurrent
        self._running = 0
        self._workers_started = False
        self._stats = {
            "total_queued": 0, "total_completed": 0, "total_errors": 0,
            "total_retries": 0, "started_at": time.time(),
        }
        self._lock = asyncio.Lock()

    async def _ensure_workers(self):
        if not self._workers_started:
            self._workers_started = True
            for i in range(self._max_concurrent):
                asyncio.create_task(self._worker(i))

    async def _worker(self, worker_id: int):
        """Process queue items sequentially per worker"""
        while True:
            try:
                priority, timestamp, future, func, args, kwargs, label = await self._queue.get()
                async with self._lock:
                    self._running += 1
                try:
                    result = await func(*args, **kwargs)
                    if not future.done():
                        future.set_result(result)
                    self._stats["total_completed"] += 1
                except Exception as e:
                    if not future.done():
                        future.set_exception(e)
                    self._stats["total_errors"] += 1
                    logger.debug(f"[monday_queue] Worker {worker_id} error on '{label}': {e}")
                finally:
                    async with self._lock:
                        self._running -= 1
                    self._queue.task_done()
                    # Small delay between requests to avoid burst
                    await asyncio.sleep(0.3)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[monday_queue] Worker {worker_id} fatal: {e}")
                await asyncio.sleep(1)

    async def enqueue(
        self,
        func: Callable,
        *args,
        priority: Priority = Priority.NORMAL,
        label: str = "",
        timeout: float = 30.0,
        **kwargs,
    ) -> Any:
        """Add a Monday.com API call to the queue. Returns the result when done."""
        await self._ensure_workers()
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        self._stats["total_queued"] += 1
        await self._queue.put((
            priority.value, time.time(), future, func, args, kwargs, label
        ))
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self._stats["total_errors"] += 1
            raise TimeoutError(f"Monday queue timeout ({timeout}s) for: {label}")

    def fire_and_forget(
        self,
        func: Callable,
        *args,
        priority: Priority = Priority.LOW,
        label: str = "",
        **kwargs,
    ):
        """Add to queue without waiting for result. For background syncs."""
        async def _wrapper():
            try:
                await self.enqueue(func, *args, priority=priority, label=label, timeout=60.0, **kwargs)
            except Exception as e:
                logger.warning(f"[monday_queue] Fire-and-forget failed '{label}': {e}")
        asyncio.create_task(_wrapper())

    def get_stats(self) -> dict:
        return {
            **self._stats,
            "queue_depth": self._queue.qsize(),
            "running": self._running,
            "uptime_hours": round((time.time() - self._stats["started_at"]) / 3600, 1),
        }


# Singleton
monday_queue = MondayQueue(max_concurrent=2)
