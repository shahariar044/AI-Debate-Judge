"""Agent 3: Causal Reasoning Agent — CORE NOVELTY.
Detects cause-effect chains, classifies strength, builds NetworkX graph,
and serializes to React Flow-compatible format.
"""
import json
import math
import networkx as nx
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.config import get_llm
from backend.agents.json_utils import parse_json_object
from backend.models.schemas import (
    CausalAnalysis, CausalChain, CausalGraph, GraphNode, GraphEdge
)

SYSTEM_PROMPT = """You are a causal reasoning expert specializing in detecting cause-effect relationships in arguments.

Analyze the argument and identify ALL causal relationships present.

For each causal relationship, classify its strength:
- "strong": well-supported, direct causal link with evidence
- "weak": plausible but lacks strong evidence or is indirect
- "missing_link": causal claim made but intermediate steps are missing
- "false_causation": correlation mistaken for causation, or flawed causal logic

Also list any causal issues (e.g., circular reasoning, confounding variables).

Return ONLY a valid JSON object:
{{
  "causal_chains": [
    {{"cause": "...", "effect": "...", "strength": "strong|weak|missing_link|false_causation"}}
  ],
  "issues": ["issue1", "issue2"]
}}

Return ONLY JSON. No markdown, no code fences, no explanation."""

HUMAN_PROMPT = """Topic: {topic}
Side: {side}

Argument:
{argument}

Extracted Reasons: {reasons}
Extracted Evidence: {evidence}

Identify all causal relationships now."""


def run_causal_agent(
    topic: str,
    side: str,
    argument: str,
    reasons: list[str],
    evidence: list[str],
    provider: str = "groq"
) -> tuple[CausalAnalysis, CausalGraph]:
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
        "reasons": json.dumps(reasons),
        "evidence": json.dumps(evidence),
    })

    data = parse_json_object(raw)
    chains_raw = data.get("causal_chains", [])
    issues = data.get("issues", [])

    causal_chains = [
        CausalChain(
            cause=c.get("cause", ""),
            effect=c.get("effect", ""),
            strength=c.get("strength", "weak"),
        )
        for c in chains_raw
    ]

    analysis = CausalAnalysis(causal_chains=causal_chains, issues=issues)
    graph = _build_graph(causal_chains, side)
    return analysis, graph


def _build_graph(chains: list[CausalChain], side: str) -> CausalGraph:
    """Build a NetworkX DiGraph and convert to React Flow format."""
    G = nx.DiGraph()

    strength_colors = {
        "strong": "#6C63FF",
        "weak": "#F59E0B",
        "missing_link": "#EF4444",
        "false_causation": "#EC4899",
    }

    # Add nodes and edges
    node_set: dict[str, dict] = {}
    for i, chain in enumerate(chains):
        cause_id = f"{side}_c_{i}"
        effect_id = f"{side}_e_{i}"

        if chain.cause not in node_set:
            node_set[chain.cause] = {"id": cause_id, "label": chain.cause, "type": "cause"}
        if chain.effect not in node_set:
            node_set[chain.effect] = {"id": effect_id, "label": chain.effect, "type": "effect"}

        G.add_node(node_set[chain.cause]["id"], label=chain.cause, node_type="cause")
        G.add_node(node_set[chain.effect]["id"], label=chain.effect, node_type="effect")
        G.add_edge(
            node_set[chain.cause]["id"],
            node_set[chain.effect]["id"],
            strength=chain.strength,
        )

    if len(G.nodes) == 0:
        return CausalGraph(nodes=[], edges=[])

    # Compute layout positions
    pos = nx.spring_layout(G, seed=42, k=2.0)

    # Convert to React Flow nodes
    rf_nodes = []
    for node_id, attrs in G.nodes(data=True):
        x, y = pos.get(node_id, (0.0, 0.0))
        node_type_val = attrs.get("node_type", "cause")
        bg_color = "#6C63FF" if node_type_val == "cause" else "#A78BFA"
        rf_nodes.append(GraphNode(
            id=node_id,
            data={"label": attrs.get("label", node_id)},
            position={"x": float(x) * 400, "y": float(y) * 300},
            style={
                "background": bg_color,
                "color": "#fff",
                "border": "2px solid #fff",
                "borderRadius": "8px",
                "padding": "8px",
                "fontSize": "12px",
                "maxWidth": "160px",
            }
        ))

    # Convert to React Flow edges
    rf_edges = []
    for i, (u, v, attrs) in enumerate(G.edges(data=True)):
        strength = attrs.get("strength", "weak")
        color = strength_colors.get(strength, "#888")
        rf_edges.append(GraphEdge(
            id=f"edge_{i}_{u}_{v}",
            source=u,
            target=v,
            label=strength.replace("_", " "),
            animated=strength == "strong",
            style={"stroke": color, "strokeWidth": 2},
        ))

    return CausalGraph(nodes=rf_nodes, edges=rf_edges)
