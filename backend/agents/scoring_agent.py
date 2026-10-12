"""Agent 6: Scoring Agent — scores arguments on 6 criteria totaling 100 points."""
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import SideScore, ScoreBreakdown

SYSTEM_PROMPT = """You are a professional academic debate judge scoring an argument.

Score the argument on these criteria (use the EXACT ranges given):

1. claim_clarity (0-15): Is the main claim clear, specific, and unambiguous?
2. reasoning_quality (0-20): Are the reasons logical, well-structured, and coherent?
3. causal_strength (0-25): Are cause-effect relationships strong, well-supported, and logically sound?
4. evidence_quality (0-20): Is the evidence specific, credible, relevant, and verifiable?
5. rebuttal (0-10): Does the argument anticipate or address opposing viewpoints?
6. clarity (0-10): Is the writing clear, organized, and easy to follow?

Total: 100 points maximum.

IMPORTANT: Apply penalties for fallacies detected (each fallacy -2 points from relevant criterion).
IMPORTANT: Causal issues like false causation reduce causal_strength significantly.

Return ONLY a valid JSON object:
{{
  "score": <total integer>,
  "breakdown": {{
    "claim_clarity": <0-15>,
    "reasoning_quality": <0-20>,
    "causal_strength": <0-25>,
    "evidence_quality": <0-20>,
    "rebuttal": <0-10>,
    "clarity": <0-10>
  }}
}}

Return ONLY JSON. No markdown, no code fences."""

HUMAN_PROMPT = """DEBATE TOPIC: {topic}
SIDE: {side}

ARGUMENT TEXT:
{argument}

ARGUMENT STRUCTURE:
- Claim: {claim}
- Reasons: {reasons}
- Evidence: {evidence}
- Conclusion: {conclusion}

CAUSAL ANALYSIS:
- Causal Chains: {causal_chains}
- Causal Issues: {causal_issues}

EVIDENCE QUALITY: {evidence_quality}

FALLACIES DETECTED: {fallacies}

Score this argument now."""


def run_scoring_agent(
    topic: str,
    side: str,
    argument: str,
    claim: str,
    reasons: list[str],
    evidence: list[str],
    conclusion: str,
    causal_chains: list[dict],
    causal_issues: list[str],
    evidence_quality: str,
    fallacies: list[dict],
    provider: str = "groq"
) -> SideScore:
    llm = get_llm(temperature=0.0, provider=provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_PROMPT),
    ])
    chain = prompt | llm | StrOutputParser()

    raw = chain.invoke({
        "topic": topic,
        "side": side,
        "argument": argument,
        "claim": claim,
        "reasons": json.dumps(reasons),
        "evidence": json.dumps(evidence),
        "conclusion": conclusion,
        "causal_chains": json.dumps(causal_chains),
        "causal_issues": json.dumps(causal_issues),
        "evidence_quality": evidence_quality,
        "fallacies": json.dumps(fallacies),
    })

    data = parse_json_object(raw)
    bd = data.get("breakdown", {})

    # Clamp values to valid ranges
    breakdown = ScoreBreakdown(
        claim_clarity=max(0, min(15, int(bd.get("claim_clarity", 0)))),
        reasoning_quality=max(0, min(20, int(bd.get("reasoning_quality", 0)))),
        causal_strength=max(0, min(25, int(bd.get("causal_strength", 0)))),
        evidence_quality=max(0, min(20, int(bd.get("evidence_quality", 0)))),
        rebuttal=max(0, min(10, int(bd.get("rebuttal", 0)))),
        clarity=max(0, min(10, int(bd.get("clarity", 0)))),
    )
    total = (
        breakdown.claim_clarity + breakdown.reasoning_quality +
        breakdown.causal_strength + breakdown.evidence_quality +
        breakdown.rebuttal + breakdown.clarity
    )
    return SideScore(score=total, breakdown=breakdown)
