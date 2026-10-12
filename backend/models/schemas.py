from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ──────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────
class DebateRequest(BaseModel):
    topic: str = Field(..., description="The debate topic / motion")
    for_argument: str = Field(..., description="The FOR side's argument text")
    against_argument: str = Field(..., description="The AGAINST side's argument text")
    provider: str = Field(default="groq", description="LLM provider: groq or gemini")


# ──────────────────────────────────────────────
# Agent output models
# ──────────────────────────────────────────────
class TopicContext(BaseModel):
    domain: str
    entities: List[str]
    debate_intent: str


class ArgumentStructure(BaseModel):
    claim: str
    reasons: List[str]
    evidence: List[str]
    assumptions: List[str]
    conclusion: str


class CausalChain(BaseModel):
    cause: str
    effect: str
    strength: str  # strong | weak | missing_link | false_causation


class CausalAnalysis(BaseModel):
    causal_chains: List[CausalChain]
    issues: List[str]


class Fallacy(BaseModel):
    type: str
    sentence: str
    explanation: str


class EvidenceQuality(BaseModel):
    quality: str  # strong | medium | weak
    reason: str
    scores: Dict[str, int]  # specificity, relevance, credibility, measurability


class ScoreBreakdown(BaseModel):
    claim_clarity: int
    reasoning_quality: int
    causal_strength: int
    evidence_quality: int
    rebuttal: int
    clarity: int


class SideScore(BaseModel):
    score: int
    breakdown: ScoreBreakdown


class Improvement(BaseModel):
    side: str
    suggestion: str
    priority: str  # high | medium | low


class Explanation(BaseModel):
    winner: str
    winner_reason: str
    strongest_sentence_for: str
    weakest_sentence_for: str
    strongest_sentence_against: str
    weakest_sentence_against: str
    counterfactual: str
    confidence_score: int = Field(default=75, description="AI confidence in verdict (0-100)")
    improvements: List[Improvement]


# ──────────────────────────────────────────────
# Graph node/edge for React Flow
# ──────────────────────────────────────────────
class GraphNode(BaseModel):
    id: str
    data: Dict[str, Any]
    position: Dict[str, float]
    type: Optional[str] = "default"
    style: Optional[Dict[str, Any]] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: Optional[bool] = False
    style: Optional[Dict[str, Any]] = None


class CausalGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ──────────────────────────────────────────────
# Full result
# ──────────────────────────────────────────────
class PipelineMetadata(BaseModel):
    total_time_seconds: float = 0.0
    agent_timings: Dict[str, float] = Field(default_factory=dict)  # e.g. {"Agent 1: Topic": 2.3}
    provider_used: str = ""
    pipeline_version: str = "2.1.0"


class DebateResult(BaseModel):
    id: str
    topic: str
    provider: str = "groq"
    topic_context: TopicContext
    for_structure: ArgumentStructure
    against_structure: ArgumentStructure
    for_causal: CausalAnalysis
    against_causal: CausalAnalysis
    for_fallacies: List[Fallacy]
    against_fallacies: List[Fallacy]
    for_evidence: EvidenceQuality
    against_evidence: EvidenceQuality
    for_score: SideScore
    against_score: SideScore
    explanation: Explanation
    causal_graph_for: CausalGraph
    causal_graph_against: CausalGraph
    pipeline_metadata: PipelineMetadata = Field(default_factory=PipelineMetadata)
    status: str = "completed"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ──────────────────────────────────────────────
# Agent 8: Argument Improvement (novel endpoint)
# ──────────────────────────────────────────────
class ImprovementRequest(BaseModel):
    result_id: str = Field(..., description="The debate result ID to improve")
    side: str = Field(..., description="Which side to improve: FOR or AGAINST")


class ImprovementChange(BaseModel):
    change: str
    reason: str


class ImprovementResponse(BaseModel):
    side: str
    original_score: int
    improved_argument: str
    changes_made: List[ImprovementChange]
    predicted_score_boost: str
    key_additions: List[str]
