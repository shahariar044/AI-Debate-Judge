"""FastAPI routes for the debate analysis API."""
import asyncio
from functools import partial
from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    DebateRequest, DebateResult, CausalGraph,
    ImprovementRequest, ImprovementResponse, ImprovementChange,
)
from backend.services.pipeline import run_pipeline
from backend.services import result_store
from backend.agents.improvement_agent import run_improvement_agent

router = APIRouter(prefix="/api", tags=["debate"])


import hashlib

@router.post("/analyze-debate", response_model=dict)
async def analyze_debate(request: DebateRequest):
    """
    Submit a debate for analysis. Runs the full 8-agent pipeline.

    The pipeline calls Groq LLaMA-3.3-70B multiple times and takes 45-90 seconds.
    It runs in a thread pool executor so the event loop is not blocked and other
    requests (e.g. health checks) remain responsive during processing.
    """
    try:
        provider = request.provider.lower()
        if provider not in ("groq", "gemini"):
            raise HTTPException(status_code=400, detail="provider must be 'groq' or 'gemini'")
        request.provider = provider

        # Generate a unique hash for the request
        hash_input = f"{request.topic}|{request.for_argument}|{request.against_argument}|{request.provider}"
        request_hash = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()

        # Check if we already have this exact debate in the cache
        cached_id = result_store.get_cached_result_id(request_hash)
        if cached_id:
            print(f"[API] Cache hit! Returning cached result ID: {cached_id}")
            return {"id": cached_id, "status": "completed", "cached": True}

        print(f"[API] Cache miss. Running pipeline for new request...")
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, partial(run_pipeline, request))
        result_store.save_result(result, request_hash=request_hash)
        return {"id": result.id, "status": "completed", "cached": False}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{result_id}", response_model=DebateResult)
async def get_results(result_id: str):
    """Retrieve the full debate analysis result by ID."""
    result = result_store.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found")
    return result


@router.get("/history", response_model=list[dict])
async def get_history():
    """Return a summary list of all past debate analyses (for the session)."""
    all_results = result_store.list_results_summary()
    return all_results


@router.get("/causal-graph/{result_id}/for", response_model=CausalGraph)
async def get_causal_graph_for(result_id: str):
    """Retrieve the causal graph for the FOR side."""
    result = result_store.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found")
    return result.causal_graph_for


@router.get("/causal-graph/{result_id}/against", response_model=CausalGraph)
async def get_causal_graph_against(result_id: str):
    """Retrieve the causal graph for the AGAINST side."""
    result = result_store.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found")
    return result.causal_graph_against


@router.post("/improve-argument", response_model=ImprovementResponse)
async def improve_argument(request: ImprovementRequest):
    """
    Agent 8: Given a debate result ID and a side (FOR/AGAINST),
    use the AI to rewrite the argument into a significantly stronger version.
    Returns the improved argument text, specific changes, and predicted score boost.

    Runs in a thread pool executor so the event loop is not blocked.
    """
    result = result_store.get_result(request.result_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Result '{request.result_id}' not found")

    side = request.side.upper()
    if side not in ("FOR", "AGAINST"):
        raise HTTPException(status_code=400, detail="side must be FOR or AGAINST")

    if side == "FOR":
        argument = result.for_structure.claim + ". " + " ".join(result.for_structure.reasons)
        fallacies = [f.model_dump() for f in result.for_fallacies]
        causal_issues = result.for_causal.issues
        evidence_quality = result.for_evidence.quality
        evidence_scores = result.for_evidence.scores
        current_score = result.for_score.score
        score_breakdown = result.for_score.breakdown.model_dump()
        weakest_sentence = result.explanation.weakest_sentence_for
    else:
        argument = result.against_structure.claim + ". " + " ".join(result.against_structure.reasons)
        fallacies = [f.model_dump() for f in result.against_fallacies]
        causal_issues = result.against_causal.issues
        evidence_quality = result.against_evidence.quality
        evidence_scores = result.against_evidence.scores
        current_score = result.against_score.score
        score_breakdown = result.against_score.breakdown.model_dump()
        weakest_sentence = result.explanation.weakest_sentence_against

    try:
        loop = asyncio.get_event_loop()
        improvement = await loop.run_in_executor(
            None,
            partial(
                run_improvement_agent,
                topic=result.topic,
                side=side,
                argument=argument,
                fallacies=fallacies,
                causal_issues=causal_issues,
                evidence_quality=evidence_quality,
                evidence_scores=evidence_scores,
                current_score=current_score,
                score_breakdown=score_breakdown,
                weakest_sentence=weakest_sentence,
                provider=getattr(result, 'provider', 'groq'),
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Improvement agent failed: {str(e)}")

    changes = [
        ImprovementChange(change=c.get("change", ""), reason=c.get("reason", ""))
        for c in improvement.get("changes_made", [])
    ]

    return ImprovementResponse(
        side=side,
        original_score=current_score,
        improved_argument=improvement.get("improved_argument", ""),
        changes_made=changes,
        predicted_score_boost=improvement.get("predicted_score_boost", ""),
        key_additions=improvement.get("key_additions", []),
    )


@router.get("/health")
async def health():
    """Health check endpoint — verify the API is running."""
    from backend.config import GROQ_API_KEY, GEMINI_API_KEY, LLM_MODEL, GEMINI_MODEL
    providers = {
        "groq": bool(GROQ_API_KEY),
        "gemini": bool(GEMINI_API_KEY),
    }
    return {
        "status": "ok",
        "service": "DebateLens",
        "agents": 8,
        "model": LLM_MODEL,
        "gemini_model": GEMINI_MODEL,
        "groq_key_loaded": bool(GROQ_API_KEY),
        "gemini_key_loaded": bool(GEMINI_API_KEY),
        "providers": providers,
    }
