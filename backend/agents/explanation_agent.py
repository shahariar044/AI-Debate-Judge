"""Agent 7: Explanation & Improvement Agent — declares winner, explains reasoning,
identifies strongest/weakest sentences, suggests improvements, provides counterfactual."""
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import Explanation, Improvement

SYSTEM_PROMPT = """You are a master debate judge providing a comprehensive, fair, and detailed final judgment.

Given the full debate analysis, you must:
1. Declare a winner (FOR or AGAINST) based on the scores
2. Explain WHY the winner won in 2-3 sentences
3. Identify the single strongest sentence from each side
4. Identify the single weakest sentence from each side
5. Provide a counterfactual explanation: "If [losing side] had done X differently, they could have scored Y more points"
6. Suggest 3-5 specific, actionable improvements (indicate which side each is for)

Return ONLY a valid JSON object:
{{
  "winner": "FOR|AGAINST",
  "winner_reason": "2-3 sentence explanation",
  "confidence_score": 0-100,
  "strongest_sentence_for": "exact sentence from FOR argument",
  "weakest_sentence_for": "exact sentence from FOR argument",
  "strongest_sentence_against": "exact sentence from AGAINST argument",
  "weakest_sentence_against": "exact sentence from AGAINST argument",
  "counterfactual": "If [losing side] had... they could have scored X more points because...",
  "improvements": [
    {{"side": "FOR|AGAINST", "suggestion": "specific actionable suggestion", "priority": "high|medium|low"}}
  ]
}}

The confidence_score (0-100) reflects how certain you are about your judgment.
- 90-100: Overwhelming evidence for one side, clear winner
- 70-89: Strong case, but some counterpoints exist
- 50-69: Close debate, marginal winner
- Below 50: Very close, judgment could go either way

Return ONLY JSON. No markdown, no code fences."""

HUMAN_PROMPT = """DEBATE TOPIC: {topic}
DOMAIN: {domain}

=== FOR SIDE ===
Argument: {for_argument}
Score: {for_score}/100
Breakdown: {for_breakdown}
Fallacies ({for_fallacy_count}): {for_fallacies}
Causal Issues: {for_causal_issues}
Evidence Quality: {for_evidence_quality}

=== AGAINST SIDE ===
Argument: {against_argument}
Score: {against_score}/100
Breakdown: {against_breakdown}
Fallacies ({against_fallacy_count}): {against_fallacies}
Causal Issues: {against_causal_issues}
Evidence Quality: {against_evidence_quality}

Provide your final judgment and improvements now."""


def run_explanation_agent(
    topic: str,
    domain: str,
    for_argument: str,
    against_argument: str,
    for_score: int,
    against_score: int,
    for_breakdown: dict,
    against_breakdown: dict,
    for_fallacies: list[dict],
    against_fallacies: list[dict],
    for_causal_issues: list[str],
    against_causal_issues: list[str],
    for_evidence_quality: str,
    against_evidence_quality: str,
    provider: str = "groq"
) -> Explanation:
    llm = get_llm(temperature=0.2, provider=provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_PROMPT),
    ])
    chain = prompt | llm | StrOutputParser()

    raw = chain.invoke({
        "topic": topic,
        "domain": domain,
        "for_argument": for_argument[:800],
        "for_score": for_score,
        "for_breakdown": json.dumps(for_breakdown),
        "for_fallacy_count": len(for_fallacies),
        "for_fallacies": json.dumps([f.get("type", "") for f in for_fallacies]),
        "for_causal_issues": json.dumps(for_causal_issues),
        "for_evidence_quality": for_evidence_quality,
        "against_argument": against_argument[:800],
        "against_score": against_score,
        "against_breakdown": json.dumps(against_breakdown),
        "against_fallacy_count": len(against_fallacies),
        "against_fallacies": json.dumps([f.get("type", "") for f in against_fallacies]),
        "against_causal_issues": json.dumps(against_causal_issues),
        "against_evidence_quality": against_evidence_quality,
    })

    data = parse_json_object(raw)
    improvements = [
        Improvement(
            side=imp.get("side", "FOR"),
            suggestion=imp.get("suggestion", ""),
            priority=imp.get("priority", "medium"),
        )
        for imp in data.get("improvements", [])
    ]

    # Determine winner by score if LLM disagrees
    score_winner = "FOR" if for_score >= against_score else "AGAINST"
    winner = data.get("winner", score_winner)

    return Explanation(
        winner=winner,
        winner_reason=data.get("winner_reason", ""),
        strongest_sentence_for=data.get("strongest_sentence_for", ""),
        weakest_sentence_for=data.get("weakest_sentence_for", ""),
        strongest_sentence_against=data.get("strongest_sentence_against", ""),
        weakest_sentence_against=data.get("weakest_sentence_against", ""),
        counterfactual=data.get("counterfactual", ""),
        confidence_score=max(0, min(100, int(data.get("confidence_score", 75)))),
        improvements=improvements,
    )
