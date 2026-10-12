"""Agent 2: Argument Extraction Agent — extracts claim, reasons, evidence, assumptions, conclusion."""
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import ArgumentStructure

SYSTEM_PROMPT = """You are an expert argument analyst trained in Toulmin argumentation theory.
Analyze the given argument text and extract its structural components.

Return ONLY a valid JSON object with:
- "claim": the main assertion being made (string)
- "reasons": list of reasons/premises supporting the claim (list of strings)
- "evidence": specific facts, data, examples, or references cited (list of strings)
- "assumptions": unstated premises the argument relies on (list of strings)  
- "conclusion": the final conclusion drawn (string)

If a component is missing, use an empty list [] or empty string "".
Return ONLY JSON. No markdown, no code fences, no explanation."""

HUMAN_PROMPT = """Topic: {topic}
Side: {side}

Argument Text:
{argument}

Extract the argument structure now."""


def run_extraction_agent(topic: str, side: str, argument: str, provider: str = "groq") -> ArgumentStructure:
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
    
    data = parse_json_object(raw)
    return ArgumentStructure(
        claim=data.get("claim", ""),
        reasons=data.get("reasons", []),
        evidence=data.get("evidence", []),
        assumptions=data.get("assumptions", []),
        conclusion=data.get("conclusion", ""),
    )
