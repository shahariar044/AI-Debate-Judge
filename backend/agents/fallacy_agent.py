"""Agent 4: Fallacy Detection Agent — identifies logical fallacies in arguments."""
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_array
from backend.models.schemas import Fallacy

# NOTE: All {{ and }} in the prompt are escaped curly braces (literal { and })
# because LangChain ChatPromptTemplate treats single {var} as template variables.
SYSTEM_PROMPT = """You are an expert in informal logic and fallacy detection.
Analyze the given argument for logical fallacies.

Detect any of these fallacy types (use these exact type names):
- "ad_hominem": attacking the person rather than the argument
- "strawman": misrepresenting the opponent's position
- "false_cause": assuming causation from correlation
- "slippery_slope": assuming one event will inevitably lead to extreme consequences without justification
- "emotional_appeal": using emotions instead of logical evidence
- "hasty_generalization": drawing broad conclusions from insufficient evidence
- "false_dichotomy": presenting only two options when more exist
- "circular_reasoning": using the conclusion as a premise
- "appeal_to_authority": citing authority without evidence
- "bandwagon": arguing something is true because many believe it

Return ONLY a valid JSON array of detected fallacies:
[
  {{
    "type": "fallacy_type_name",
    "sentence": "the exact sentence or phrase containing the fallacy",
    "explanation": "why this is a fallacy and how it weakens the argument"
  }}
]

If NO fallacies are detected, return an empty array: []
Return ONLY JSON. No markdown, no code fences."""

HUMAN_PROMPT = """Topic: {topic}
Side: {side}

Argument:
{argument}

Detect all logical fallacies now."""


def run_fallacy_agent(topic: str, side: str, argument: str, provider: str = "groq") -> list[Fallacy]:
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
    })

    data = parse_json_array(raw, wrapper_key="fallacies")
    return [
        Fallacy(
            type=f.get("type", "unknown"),
            sentence=f.get("sentence", ""),
            explanation=f.get("explanation", ""),
        )
        for f in data
        if isinstance(f, dict)
    ]
