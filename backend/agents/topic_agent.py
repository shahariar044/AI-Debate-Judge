"""Agent 1: Topic Context Agent — classifies domain, extracts entities, identifies debate intent."""
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import TopicContext

SYSTEM_PROMPT = """You are a debate topic classification expert.
Given a debate topic and two arguments, you must output ONLY a valid JSON object with:
- "domain": one of ["education", "environment", "policy", "social", "technology", "health", "economy", "other"]
- "entities": list of key named entities (people, places, organizations, concepts) mentioned
- "debate_intent": a one-sentence description of what this debate is trying to decide

Return ONLY the JSON object. No explanation, no markdown, no code fences."""

HUMAN_PROMPT = """Topic: {topic}

FOR Argument (excerpt): {for_excerpt}

AGAINST Argument (excerpt): {against_excerpt}

Classify this debate topic now."""


def run_topic_agent(topic: str, for_argument: str, against_argument: str, provider: str = "groq") -> TopicContext:
    llm = get_llm(temperature=0.0, provider=provider)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", HUMAN_PROMPT),
    ])
    chain = prompt | llm | StrOutputParser()
    
    raw = chain.invoke({
        "topic": topic,
        "for_excerpt": for_argument[:500],
        "against_excerpt": against_argument[:500],
    })
    
    data = parse_json_object(raw)
    return TopicContext(
        domain=data.get("domain", "other"),
        entities=data.get("entities", []),
        debate_intent=data.get("debate_intent", ""),
    )
