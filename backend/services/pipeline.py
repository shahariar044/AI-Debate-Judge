"""Pipeline orchestrator — runs all 7 agents in sequence and assembles the final DebateResult.
Each agent is wrapped in try/except so a single LLM hiccup does NOT crash the full pipeline.
"""
import uuid
import time
from backend.models.schemas import (
    DebateRequest, DebateResult,
    TopicContext, ArgumentStructure, CausalAnalysis, CausalChain,
    EvidenceQuality, SideScore, ScoreBreakdown, Explanation, Improvement,
    CausalGraph, PipelineMetadata,
)
from backend.agents.topic_agent import run_topic_agent
from backend.agents.extraction_agent import run_extraction_agent
from backend.agents.causal_agent import run_causal_agent
from backend.agents.fallacy_agent import run_fallacy_agent
from backend.agents.evidence_agent import run_evidence_agent
from backend.agents.scoring_agent import run_scoring_agent
from backend.agents.explanation_agent import run_explanation_agent


# ── Fallback defaults ─────────────────────────────────────────────────────────

def _default_topic_ctx(topic: str) -> TopicContext:
    return TopicContext(domain="other", entities=[topic], debate_intent="Analyzing the debate topic.")

def _default_structure(side: str, argument: str) -> ArgumentStructure:
    return ArgumentStructure(
        claim=f"{side} argument (extraction failed — raw text follows)",
        reasons=[argument[:200]],
        evidence=[], assumptions=[], conclusion=""
    )

def _default_causal(side: str) -> tuple:
    return CausalAnalysis(causal_chains=[], issues=["Causal analysis unavailable"]), CausalGraph(nodes=[], edges=[])

def _default_evidence(side: str) -> EvidenceQuality:
    return EvidenceQuality(
        quality="medium", reason="Evidence analysis unavailable.",
        scores={"specificity": 5, "relevance": 5, "credibility": 5, "measurability": 5}
    )

def _default_score(side: str) -> SideScore:
    return SideScore(
        score=50,
        breakdown=ScoreBreakdown(
            claim_clarity=8, reasoning_quality=10, causal_strength=12,
            evidence_quality=10, rebuttal=5, clarity=5,
        )
    )

def _default_explanation(for_score: int, against_score: int) -> Explanation:
    winner = "FOR" if for_score >= against_score else "AGAINST"
    return Explanation(
        winner=winner, winner_reason="Determined by overall score comparison.",
        strongest_sentence_for="N/A", weakest_sentence_for="N/A",
        strongest_sentence_against="N/A", weakest_sentence_against="N/A",
        counterfactual="If the losing side addressed its key weaknesses, the result might differ.",
        improvements=[],
    )


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(request: DebateRequest) -> DebateResult:
    result_id = str(uuid.uuid4())
    topic = request.topic
    provider = getattr(request, 'provider', 'groq')
    for_arg = request.for_argument
    against_arg = request.against_argument
    pipeline_start = time.time()
    agent_timings = {}

    # ── Agent 1: Topic Context ────────────────────────────────────────────────
    print(f"[Pipeline] Agent 1: Topic Context — {result_id}")
    t0 = time.time()
    try:
        topic_ctx = run_topic_agent(topic, for_arg, against_arg, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 1 failed: {exc}. Using fallback.")
        topic_ctx = _default_topic_ctx(topic)
    agent_timings['Agent 1: Topic Context'] = round(time.time() - t0, 2)

    # ── Agent 2: Argument Extraction (both sides) ─────────────────────────────
    print("[Pipeline] Agent 2: Argument Extraction")
    t0 = time.time()
    try:
        for_structure = run_extraction_agent(topic, "FOR", for_arg, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 2 (FOR) failed: {exc}. Using fallback.")
        for_structure = _default_structure("FOR", for_arg)
    try:
        against_structure = run_extraction_agent(topic, "AGAINST", against_arg, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 2 (AGAINST) failed: {exc}. Using fallback.")
        against_structure = _default_structure("AGAINST", against_arg)
    agent_timings['Agent 2: Extraction'] = round(time.time() - t0, 2)

    # ── Agent 3: Causal Reasoning (both sides) ────────────────────────────────
    print("[Pipeline] Agent 3: Causal Reasoning")
    t0 = time.time()
    try:
        for_causal, for_graph = run_causal_agent(
            topic, "FOR", for_arg, for_structure.reasons, for_structure.evidence, provider=provider
        )
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 3 (FOR) failed: {exc}. Using fallback.")
        for_causal, for_graph = _default_causal("FOR")
    try:
        against_causal, against_graph = run_causal_agent(
            topic, "AGAINST", against_arg, against_structure.reasons, against_structure.evidence, provider=provider
        )
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 3 (AGAINST) failed: {exc}. Using fallback.")
        against_causal, against_graph = _default_causal("AGAINST")
    agent_timings['Agent 3: Causal'] = round(time.time() - t0, 2)

    # ── Agent 4: Fallacy Detection (both sides) ───────────────────────────────
    print("[Pipeline] Agent 4: Fallacy Detection")
    t0 = time.time()
    try:
        for_fallacies = run_fallacy_agent(topic, "FOR", for_arg, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 4 (FOR) failed: {exc}. Using fallback.")
        for_fallacies = []
    try:
        against_fallacies = run_fallacy_agent(topic, "AGAINST", against_arg, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 4 (AGAINST) failed: {exc}. Using fallback.")
        against_fallacies = []
    agent_timings['Agent 4: Fallacy'] = round(time.time() - t0, 2)

    # ── Agent 5: Evidence Quality (both sides) ────────────────────────────────
    print("[Pipeline] Agent 5: Evidence Quality")
    t0 = time.time()
    try:
        for_evidence = run_evidence_agent(topic, "FOR", for_arg, for_structure.evidence, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 5 (FOR) failed: {exc}. Using fallback.")
        for_evidence = _default_evidence("FOR")
    try:
        against_evidence = run_evidence_agent(topic, "AGAINST", against_arg, against_structure.evidence, provider=provider)
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 5 (AGAINST) failed: {exc}. Using fallback.")
        against_evidence = _default_evidence("AGAINST")
    agent_timings['Agent 5: Evidence'] = round(time.time() - t0, 2)

    # ── Agent 6: Scoring (both sides) ─────────────────────────────────────────
    print("[Pipeline] Agent 6: Scoring")
    t0 = time.time()
    try:
        for_score = run_scoring_agent(
            topic=topic, side="FOR", argument=for_arg,
            claim=for_structure.claim, reasons=for_structure.reasons,
            evidence=for_structure.evidence, conclusion=for_structure.conclusion,
            causal_chains=[c.model_dump() for c in for_causal.causal_chains],
            causal_issues=for_causal.issues,
            evidence_quality=for_evidence.quality,
            fallacies=[f.model_dump() for f in for_fallacies],
            provider=provider
        )
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 6 (FOR) failed: {exc}. Using fallback.")
        for_score = _default_score("FOR")
    try:
        against_score = run_scoring_agent(
            topic=topic, side="AGAINST", argument=against_arg,
            claim=against_structure.claim, reasons=against_structure.reasons,
            evidence=against_structure.evidence, conclusion=against_structure.conclusion,
            causal_chains=[c.model_dump() for c in against_causal.causal_chains],
            causal_issues=against_causal.issues,
            evidence_quality=against_evidence.quality,
            fallacies=[f.model_dump() for f in against_fallacies],
            provider=provider
        )
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 6 (AGAINST) failed: {exc}. Using fallback.")
        against_score = _default_score("AGAINST")
    agent_timings['Agent 6: Scoring'] = round(time.time() - t0, 2)

    # ── Agent 7: Explanation & Improvement ───────────────────────────────────
    print("[Pipeline] Agent 7: Explanation")
    t0 = time.time()
    try:
        explanation = run_explanation_agent(
            topic=topic,
            domain=topic_ctx.domain,
            for_argument=for_arg,
            against_argument=against_arg,
            for_score=for_score.score,
            against_score=against_score.score,
            for_breakdown=for_score.breakdown.model_dump(),
            against_breakdown=against_score.breakdown.model_dump(),
            for_fallacies=[f.model_dump() for f in for_fallacies],
            against_fallacies=[f.model_dump() for f in against_fallacies],
            for_causal_issues=for_causal.issues,
            against_causal_issues=against_causal.issues,
            for_evidence_quality=for_evidence.quality,
            against_evidence_quality=against_evidence.quality,
            provider=provider
        )
    except Exception as exc:
        print(f"[Pipeline] WARNING: Agent 7 failed: {exc}. Using fallback.")
        explanation = _default_explanation(for_score.score, against_score.score)
    agent_timings['Agent 7: Explanation'] = round(time.time() - t0, 2)

    # ── Build pipeline metadata ────────────────────────────────────────────────
    total_time = round(time.time() - pipeline_start, 2)
    metadata = PipelineMetadata(
        total_time_seconds=total_time,
        agent_timings=agent_timings,
        provider_used=provider,
        pipeline_version="2.1.0",
    )

    # ── Assemble Final Result ─────────────────────────────────────────────────
    print(f"[Pipeline] DONE: Pipeline complete in {total_time}s -- {result_id}")
    return DebateResult(
        id=result_id,
        topic=topic,
        provider=provider,
        topic_context=topic_ctx,
        for_structure=for_structure,
        against_structure=against_structure,
        for_causal=for_causal,
        against_causal=against_causal,
        for_fallacies=for_fallacies,
        against_fallacies=against_fallacies,
        for_evidence=for_evidence,
        against_evidence=against_evidence,
        for_score=for_score,
        against_score=against_score,
        explanation=explanation,
        causal_graph_for=for_graph,
        causal_graph_against=against_graph,
        pipeline_metadata=metadata,
        status="completed",
    )
