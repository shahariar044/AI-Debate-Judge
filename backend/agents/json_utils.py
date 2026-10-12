"""Shared helpers for parsing LLM JSON responses."""
import json
import re
from typing import Any


def _strip_code_fence(raw: str) -> str:
    text = raw.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL | re.IGNORECASE)
    return fence.group(1).strip() if fence else text


def _extract_balanced_json(raw: str, opener: str, closer: str) -> str:
    start = raw.find(opener)
    if start == -1:
        raise ValueError(f"No JSON value starting with {opener!r} found in LLM response.")

    depth = 0
    in_string = False
    escaped = False
    for index, char in enumerate(raw[start:], start=start):
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return raw[start:index + 1]

    raise ValueError("LLM response contains incomplete JSON.")


def parse_json_object(raw: str) -> dict[str, Any]:
    """Parse a JSON object from a model response, tolerating fences/preamble."""
    text = _strip_code_fence(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        text = _extract_balanced_json(text, "{", "}")
        text = re.sub(r",\s*([}\]])", r"\1", text)
        data = json.loads(text)

    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object from LLM response.")
    return data


def parse_json_array(raw: str, wrapper_key: str | None = None) -> list[Any]:
    """Parse a JSON array, or an object containing an array under wrapper_key."""
    text = _strip_code_fence(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        try:
            text = _extract_balanced_json(text, "[", "]")
        except ValueError:
            data = parse_json_object(raw)
        else:
            text = re.sub(r",\s*([}\]])", r"\1", text)
            data = json.loads(text)

    if isinstance(data, dict) and wrapper_key:
        data = data.get(wrapper_key, [])
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array from LLM response.")
    return data
