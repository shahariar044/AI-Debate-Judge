"""FastAPI application entry point."""
import sys
import io
# Force UTF-8 output on Windows (avoids charmap codec errors with emoji in logs)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.debate import router
from backend.config import GROQ_API_KEY, GEMINI_API_KEY, LLM_MODEL, GEMINI_MODEL


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup validation ────────────────────────────────────────────────────
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        raise RuntimeError(
            "No LLM API key is configured. Add GROQ_API_KEY or GEMINI_API_KEY to your .env file and restart the server."
        )
    print("[OK] DebateLens - 8-Agent Pipeline Ready")
    if GROQ_API_KEY:
        print(f"[OK] Groq API key loaded ({GROQ_API_KEY[:8]}...)")
        print(f"[OK] Groq model: {LLM_MODEL}")
    if GEMINI_API_KEY:
        print(f"[OK] Gemini API key loaded ({GEMINI_API_KEY[:8]}...)")
        print(f"[OK] Gemini model: {GEMINI_MODEL}")
    print("[OK] Backend started. Use the Uvicorn URL shown above.")
    print("[OK] API docs available at /docs")
    yield
    # ── Shutdown ──────────────────────────────────────────────────────────────
    print("[--] Shutting down DebateLens.")


app = FastAPI(
    title="DebateLens",
    description=(
        "A multi-agent AI system for causal explainable debate analysis. "
        "Runs an 8-agent LangChain pipeline powered by Groq or Gemini. "
        "Analyzes arguments, detects fallacies, maps causal chains, and "
        "provides actionable improvement suggestions."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS: Allow frontend dev server ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "message": "DebateLens API v2.0",
        "status": "online",
        "agents": 8,
        "model": LLM_MODEL,
        "gemini_model": GEMINI_MODEL,
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": [
            "POST /api/analyze-debate",
            "GET  /api/results/{id}",
            "GET  /api/history",
            "POST /api/improve-argument",
            "GET  /api/causal-graph/{id}/for",
            "GET  /api/causal-graph/{id}/against",
            "GET  /api/health",
        ],
    }
