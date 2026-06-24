"""Tiny in-memory sliding-window rate limiter (per-key)."""
import time
from collections import defaultdict

_hits: dict[str, list[float]] = defaultdict(list)


def allow(key: str, limit: int, window: int = 60) -> bool:
    """Return True if `key` is under `limit` hits in the last `window` seconds."""
    now = time.time()
    cutoff = now - window
    bucket = _hits[key]
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)
    if len(bucket) >= limit:
        return False
    bucket.append(now)
    return True
