"""Agent 5: Evidence Quality Agent — evaluates specificity, relevance, credibility, measurability."""
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import EvidenceQuality

SYSTEM_PROMPT = """You are an evidence quality assessor trained in academic argumentation.
Evaluate the quality of evidence presented in the argument.

Score the evidence on four dimensions (0-10 each):
- "specificity": how specific and detailed is the evidence? (vague=0, very specific=10)
- "relevance": how directly relevant is it to the claim? (irrelevant=0, perfectly relevant=10)
- "credibility": how credible/verifiable is the source? (unverifiable=0, highly credible=10)
- "measurability": is the evidence quantifiable/measurable? (not at all=0, very measurable=10)

Overall quality:
- "strong": average score >= 7
- "medium": average score >= 4
- "weak": average score < 4

Return ONLY a valid JSON object:
{{
  "quality": "strong|medium|weak",
  "reason": "2-3 sentence explanation of your assessment",
  "scores": {{
    "specificity": 0-10,
    "relevance": 0-10,
    "credibility": 0-10,
    "measurability": 0-10
  }}
}}

Return ONLY JSON. No markdown, no code fences."""

HUMAN_PROMPT = """Topic: {topic}
Side: {side}

Full Argument:
{argument}

Extracted Evidence Items:
{evidence}

Evaluate evidence quality now."""


def run_evidence_agent(
    topic: str, side: str, argument: str, evidence: list[str], provider: str = "groq"
) -> EvidenceQuality:
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
        "evidence": json.dumps(evidence) if evidence else "No explicit evidence cited.",
    })

    data = parse_json_object(raw)
    scores = data.get("scores", {})
    return EvidenceQuality(
        quality=data.get("quality", "weak"),
        reason=data.get("reason", ""),
        scores={
            "specificity": int(scores.get("specificity", 0)),
            "relevance": int(scores.get("relevance", 0)),
            "credibility": int(scores.get("credibility", 0)),
            "measurability": int(scores.get("measurability", 0)),
        }
    )
