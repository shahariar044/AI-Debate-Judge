"""Probe Gemini models for this debate app.

The script loads GEMINI_API_KEY from the repo .env, tries a shortlist of
free-tier Flash-family models, and reports which model returns complete JSON for
the app's agent-style prompts.
"""
from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CANDIDATES = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-3-flash-preview",
]

PROMPT = """Return ONLY valid JSON for this debate topic analysis:
{
  "domain": "education|environment|policy|social|technology|health|economy|other",
  "entities": ["entity"],
  "debate_intent": "one sentence"
}

Topic: Should schools ban smartphones?
FOR: Schools should ban smartphones because they distract students and reduce classroom focus.
AGAINST: Schools should not ban smartphones because they are useful for safety and learning."""


@dataclass
class ProbeResult:
    model: str
    ok: bool
    score: int
    latency_seconds: float
    output_chars: int
    reason: str
    sample: str = ""


def _load_key() -> str:
    load_dotenv(REPO_ROOT / ".env", override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key.startswith("YOUR_"):
        raise SystemExit("GEMINI_API_KEY is missing in .env")
    return api_key


def _model_id(name: str) -> str:
    return name.removeprefix("models/")


def _available_model_ids(client: genai.Client) -> set[str]:
    try:
        return {_model_id(model.name or "") for model in client.models.list()}
    except Exception as exc:
        print(f"Could not list Gemini models; probing shortlist only: {exc}")
        return set()


def _validate_response(text: str) -> tuple[int, str, dict[str, Any] | None]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        return 0, f"invalid JSON: {exc}", None

    required = {"domain", "entities", "debate_intent"}
    missing = sorted(required - set(data))
    if missing:
        return 40, f"missing fields: {', '.join(missing)}", data
    if not isinstance(data.get("entities"), list) or not data["entities"]:
        return 70, "entities is empty or not a list", data
    if not str(data.get("debate_intent", "")).strip():
        return 70, "debate_intent is empty", data
    return 100, "complete JSON", data


def _probe_one(client: genai.Client, model: str) -> ProbeResult:
    started = time.perf_counter()
    try:
        response = client.models.generate_content(
            model=model,
            contents=PROMPT,
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=512,
                response_mime_type="application/json",
            ),
        )
        latency = time.perf_counter() - started
        text = (response.text or "").strip()
        score, reason, _ = _validate_response(text)
        return ProbeResult(
            model=model,
            ok=score == 100,
            score=score,
            latency_seconds=round(latency, 2),
            output_chars=len(text),
            reason=reason,
            sample=text[:220],
        )
    except Exception as exc:
        latency = time.perf_counter() - started
        return ProbeResult(
            model=model,
            ok=False,
            score=0,
            latency_seconds=round(latency, 2),
            output_chars=0,
            reason=str(exc).replace("\n", " ")[:260],
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--models",
        nargs="*",
        default=DEFAULT_CANDIDATES,
        help="Model IDs to probe, in priority order.",
    )
    args = parser.parse_args()

    client = genai.Client(api_key=_load_key())
    available = _available_model_ids(client)
    candidates = list(dict.fromkeys(args.models))
    if available:
        candidates = [model for model in candidates if model in available]
        print("Available shortlist:", ", ".join(candidates) or "none")

    if not candidates:
        raise SystemExit("No candidate models are available for this key.")

    results = [_probe_one(client, model) for model in candidates]
    ranked = sorted(results, key=lambda r: (-r.score, r.latency_seconds, candidates.index(r.model)))

    print("\nGemini probe results")
    print("====================")
    for result in ranked:
        status = "OK" if result.ok else "FAIL"
        print(
            f"{status:4} {result.model:28} "
            f"score={result.score:3} latency={result.latency_seconds:5.2f}s "
            f"chars={result.output_chars:4} reason={result.reason}"
        )
        if result.sample:
            print(f"     sample: {result.sample}")

    best = ranked[0]
    if not best.ok:
        print("\nNo model returned complete JSON.")
        return 1

    print(f"\nRecommended GEMINI_MODEL={best.model}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
