"""Backend configuration — loads from .env and provides a shared LLM factory."""
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path, override=True)


def _read_secret(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value or value.startswith("YOUR_"):
        return ""
    return value


GROQ_API_KEY: str = _read_secret("GROQ_API_KEY")
GEMINI_API_KEY: str = _read_secret("GEMINI_API_KEY")
LLM_MODEL: str    = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_MAX_TOKENS: int = int(os.getenv("GEMINI_MAX_TOKENS", "8192"))
GEMINI_THINKING_LEVEL: str = os.getenv("GEMINI_THINKING_LEVEL", "").strip()
GEMINI_FALLBACK_MODELS: list[str] = [
    model.strip()
    for model in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash,gemini-2.5-flash-lite",
    ).split(",")
    if model.strip()
]

# NOTE: We do NOT raise here — main.py lifespan event validates the key at
# startup and gives a clear error message. Raising at import time would make
# every unit-test import crash with no helpful message.


def get_llm(temperature: float = 0.1, provider: str = "groq"):
    """Return a configured LLM instance based on the provider.
    Raises a clear RuntimeError if the required API key is missing.
    """
    if provider.lower() == "gemini":
        if not GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Please add it to your .env file."
            )
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            def build_gemini(model: str):
                kwargs = {
                    "model": model,
                    "api_key": GEMINI_API_KEY,
                    "temperature": temperature,
                    "max_tokens": GEMINI_MAX_TOKENS,
                    "response_mime_type": "application/json",
                    "request_timeout": 120,
                    "retries": 2,
                    "client_args": {"trust_env": False},
                }
                if GEMINI_THINKING_LEVEL and model.startswith("gemini-3"):
                    kwargs["thinking_level"] = GEMINI_THINKING_LEVEL
                return ChatGoogleGenerativeAI(**kwargs)

            primary = build_gemini(GEMINI_MODEL)
            fallback_models = [
                model for model in GEMINI_FALLBACK_MODELS if model != GEMINI_MODEL
            ]
            if fallback_models:
                return primary.with_fallbacks(
                    [build_gemini(model) for model in fallback_models]
                )
            return primary
        except ImportError as exc:
            raise RuntimeError(
                "langchain-google-genai is not installed. Run: pip install langchain-google-genai"
            ) from exc

    # Default to Groq
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Please add it to your .env file and restart."
        )
    try:
        from langchain_groq import ChatGroq  # imported lazily so tests can mock
        return ChatGroq(
            model=LLM_MODEL,
            api_key=GROQ_API_KEY,
            temperature=temperature,
        )
    except ImportError as exc:
        raise RuntimeError(
            "langchain_groq is not installed. Run: pip install langchain-groq"
        ) from exc
