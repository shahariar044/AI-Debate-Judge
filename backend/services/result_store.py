"""In-memory result store keyed by UUID."""
from typing import Dict, Optional
from backend.models.schemas import DebateResult

_store: Dict[str, DebateResult] = {}
_request_cache: Dict[str, str] = {}  # Maps hash(topic, for, against, provider) -> result_id


def save_result(result: DebateResult, request_hash: Optional[str] = None) -> None:
    _store[result.id] = result
    if request_hash:
        _request_cache[request_hash] = result.id


def get_result(result_id: str) -> Optional[DebateResult]:
    return _store.get(result_id)


def get_cached_result_id(request_hash: str) -> Optional[str]:
    return _request_cache.get(request_hash)


def list_results() -> list[str]:
    return list(_store.keys())


def list_results_summary() -> list[dict]:
    """Return lightweight summaries for the debate history panel."""
    summaries = []
    for result in _store.values():
        summaries.append({
            "id": result.id,
            "topic": result.topic,
            "winner": result.explanation.winner,
            "for_score": result.for_score.score,
            "against_score": result.against_score.score,
            "domain": result.topic_context.domain,
            "created_at": result.created_at,
        })
    # Most recent first
    return sorted(summaries, key=lambda x: x["created_at"], reverse=True)
