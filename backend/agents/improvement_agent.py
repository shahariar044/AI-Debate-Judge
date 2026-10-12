"""Agent 8: Argument Improvement Agent — rewrites a weak argument into a stronger version.

This is the novel "Agent 8" addition. Given an original argument, its weaknesses
(fallacies, causal issues, evidence gaps), and the debate topic, the agent produces:
  - A rewritten, improved version of the argument
  - A list of specific changes made and why
  - A predicted new score range
"""
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object

SYSTEM_PROMPT = """You are a world-class debate coach who specializes in strengthening weak arguments.

Given a debate argument with its identified weaknesses, rewrite it into a significantly stronger version by:
1. Fixing any logical fallacies
2. Strengthening causal claims with evidence
3. Adding specific data, statistics, or credible references
4. Improving the structure: clear claim → reasons → evidence → conclusion
5. Addressing the opposing side's strongest point (rebuttal)
6. Making the language clear and persuasive

Return ONLY a valid JSON object:
{{
  "improved_argument": "The full rewritten argument text (3-5 paragraphs, significantly stronger)",
  "changes_made": [
    {{"change": "what was changed", "reason": "why this improves the argument"}}
  ],
  "predicted_score_boost": "estimated additional points (e.g. '+15 to +25 points')",
  "key_additions": ["specific fact/stat/reference added", "..."]
}}

Make the rewritten argument sound natural, academic, and compelling — not robotic.
Return ONLY JSON. No markdown, no code fences."""

HUMAN_PROMPT = """DEBATE TOPIC: {topic}
SIDE: {side}

ORIGINAL ARGUMENT:
{argument}

IDENTIFIED WEAKNESSES:
- Fallacies: {fallacies}
- Causal Issues: {causal_issues}
- Evidence Quality: {evidence_quality} (scores: {evidence_scores})
- Current Score: {current_score}/100
- Weakest Sentence: "{weakest_sentence}"

SCORING BREAKDOWN (where points were lost):
{score_breakdown}

Rewrite this argument to be significantly stronger now."""


def run_improvement_agent(
    topic: str,
    side: str,
    argument: str,
    fallacies: list[dict],
    causal_issues: list[str],
    evidence_quality: str,
    evidence_scores: dict,
    current_score: int,
    score_breakdown: dict,
    weakest_sentence: str,
    provider: str = "groq"
) -> dict:
    """
    Returns a dict with keys:
      improved_argument, changes_made, predicted_score_boost, key_additions
    """
    llm = get_llm(temperature=0.4, provider=provider)  # slightly creative for natural writing
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_PROMPT),
    ])
    chain = prompt | llm | StrOutputParser()

    fallacy_summary = [f"{f.get('type', '?')}: {f.get('sentence', '')[:60]}" for f in fallacies] if fallacies else ["None detected"]

    raw = chain.invoke({
        "topic": topic,
        "side": side,
        "argument": argument[:1200],
        "fallacies": json.dumps(fallacy_summary),
        "causal_issues": json.dumps(causal_issues) if causal_issues else "[]",
        "evidence_quality": evidence_quality,
        "evidence_scores": json.dumps(evidence_scores),
        "current_score": current_score,
        "weakest_sentence": weakest_sentence or "N/A",
        "score_breakdown": json.dumps(score_breakdown),
    })

    data = parse_json_object(raw)
    return {
        "improved_argument": data.get("improved_argument", ""),
        "changes_made": data.get("changes_made", []),
        "predicted_score_boost": data.get("predicted_score_boost", "+10 to +20 points"),
        "key_additions": data.get("key_additions", []),
    }
