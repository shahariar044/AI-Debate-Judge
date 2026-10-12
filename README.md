# AI Debate Judge (DebateLens)

**A multi-agent LLM system that judges two-sided debates and explains its verdict. It breaks down argument structure, detects logical fallacies, maps cause-and-effect chains, scores each side and suggests improvements.**

![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.3-1C3C3C)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)

**Author:** Shahariar Hossain
**GitHub:** [github.com/shahariar044](https://github.com/shahariar044)

This project was built as a team course project in the Department of Computer Science and Engineering at Bangladesh University of Professionals (BUP).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Limitations and Future Work](#limitations-and-future-work)
- [License](#license)

---

## Overview

Large language models can act as debate judges, but a single prompt usually returns a score without showing how it was reached. **DebateLens** splits the judging task into a pipeline of specialised LLM agents. Each agent handles one part of the analysis: topic context, argument structure, causal reasoning, fallacies, evidence, scoring and the final explanation.

The user enters a debate motion with one **FOR** and one **AGAINST** argument. The system returns:

- a winner, with the reasoning behind it
- a 100-point score breakdown for each side
- the logical fallacies found, with the exact sentence that contains each one
- an interactive **causal graph** of each side's cause-and-effect claims
- the strongest and weakest sentences of each side, a counterfactual and prioritised suggestions
- an optional AI rewrite of either side's argument into a stronger version

---

## Key Features

- **7-agent analysis pipeline** plus an on-demand **8th improvement agent**, built with LangChain.
- **Two LLM providers:** Groq (LLaMA models) and Google Gemini, chosen per request. The UI can also run **both providers in parallel** for comparison.
- **Gemini model fallback:** if the main Gemini model fails, the configured fallback models are tried in order.
- **Causal reasoning graph:** cause-effect chains are labelled `strong`, `weak`, `missing_link` or `false_causation`, built with NetworkX and drawn with React Flow.
- **Fallacy detection** for 10 types: ad hominem, strawman, false cause, slippery slope, emotional appeal, hasty generalisation, false dichotomy, circular reasoning, appeal to authority and bandwagon.
- **Evidence-quality rating** on specificity, relevance, credibility and measurability.
- **Rubric-based scoring** out of 100: claim clarity (15), reasoning quality (20), causal strength (25), evidence quality (20), rebuttal (10), clarity (10). Detected fallacies and causal flaws reduce the score.
- **Fault-tolerant pipeline:** each agent runs inside its own `try/except` with safe default output, so one failed LLM call does not stop the whole analysis.
- **Per-agent timing** and provider metadata, shown on a *Performance* tab.
- **Results dashboard** with *Overview, Scores, Radar, Fallacies, Causal, Improvements* and *Performance* tabs, plus a confidence gauge, a radar chart and a PDF export.
- **Session history panel** and **request caching**: submitting the same debate again with the same provider returns the stored result.
- **Sample debates** that can be loaded with one click for a quick demo.

---

## How It Works

```text
            ┌──────────────── React + Vite frontend ────────────────┐
            │  Input page → POST /api/analyze-debate → Results page   │
            └───────────────────────────┬─────────────────────────────┘
                                        ▼
                         FastAPI backend (backend/main.py)
                                        │
                                        ▼
     ┌──────────────────── services/pipeline.py ─────────────────────┐
     │ Agent 1  Topic Context      → domain, entities, debate intent  │
     │ Agent 2  Argument Extraction→ claim, reasons, evidence,        │
     │                               assumptions, conclusion (×2)      │
     │ Agent 3  Causal Reasoning   → cause-effect chains + graph (×2)  │
     │ Agent 4  Fallacy Detection  → typed fallacies + sentence (×2)   │
     │ Agent 5  Evidence Quality   → strong / medium / weak (×2)       │
     │ Agent 6  Scoring            → 100-point rubric (×2)             │
     │ Agent 7  Explanation        → winner, counterfactual, tips      │
     └────────────────────────────────────────────────────────────────┘
                                        │
                     in-memory result store (keyed by UUID)
                                        │
          Agent 8  Improvement (on demand: POST /api/improve-argument)
```

Agents 2 to 6 run once for each side. All agents use the LLM selected by `backend/config.py:get_llm()`. Each agent asks for a JSON response, which is parsed and checked against Pydantic models in `backend/models/schemas.py`.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI, Uvicorn, Pydantic v2, python-dotenv |
| LLM orchestration | LangChain (`langchain-core`), `langchain-groq`, `langchain-google-genai` |
| LLM providers | Groq (LLaMA, e.g. `llama-3.3-70b-versatile`), Google Gemini (e.g. `gemini-2.5-flash`) |
| Graph processing | NetworkX |
| Frontend | React 19, Vite, Axios, React Flow |
| Export | jsPDF, html2canvas |
| Tooling | ESLint |

---

## Project Structure

```text
AI-Debate-Judge/
├── backend/
│   ├── main.py               # FastAPI app, CORS, startup key validation
│   ├── config.py             # .env loading + get_llm() provider factory
│   ├── requirements.txt      # Pinned Python dependencies
│   ├── agents/
│   │   ├── topic_agent.py        # Agent 1
│   │   ├── extraction_agent.py   # Agent 2
│   │   ├── causal_agent.py       # Agent 3 (+ NetworkX → React Flow graph)
│   │   ├── fallacy_agent.py      # Agent 4
│   │   ├── evidence_agent.py     # Agent 5
│   │   ├── scoring_agent.py      # Agent 6
│   │   ├── explanation_agent.py  # Agent 7
│   │   ├── improvement_agent.py  # Agent 8 (on demand)
│   │   └── json_utils.py         # Robust JSON extraction from LLM output
│   ├── models/schemas.py     # Pydantic request/response models
│   ├── routes/debate.py      # /api/* endpoints
│   ├── services/
│   │   ├── pipeline.py       # Orchestrates agents 1–7
│   │   └── result_store.py   # In-memory results + request cache
│   └── scripts/
│       └── probe_gemini_models.py  # Utility: test which Gemini models work for your key
├── frontend/
│   ├── src/
│   │   ├── pages/            # InputPage.jsx, ResultsPage.jsx
│   │   ├── components/       # CausalGraph, RadarChart, ScoreCard, FallacyList,
│   │   │                     # ExplanationPanel, ImprovementModal/Panel,
│   │   │                     # DebateHistory, ExportButton, Confetti, ToastProvider
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── .env.example              # Backend environment template
├── run_project.bat           # Windows launcher (backend + frontend)
├── test_api.py               # Smoke test: both providers
└── test_pipeline.py          # End-to-end smoke test of the full pipeline
```

---

## Getting Started

### Prerequisites

- **Python 3.9+**
- **Node.js** and npm. Vite 8 needs a current Node.js LTS release (20.19+ or 22.12+).
- An API key for **at least one** provider:
  - Groq: <https://console.groq.com/keys>
  - Google Gemini: <https://aistudio.google.com/apikey>

### 1. Clone the repository

```bash
git clone https://github.com/shahariar044/AI-Debate-Judge.git
cd AI-Debate-Judge
```

### 2. Configure environment variables

Copy the template to `.env` in the **project root** (the backend reads `.env` from there):

```bash
# macOS / Linux
cp .env.example .env
# Windows
copy .env.example .env
```

Then edit `.env`:

| Variable | Required | Description | Example / default |
|---|---|---|---|
| `GROQ_API_KEY` | One of the two keys | Groq API key | — |
| `GEMINI_API_KEY` | One of the two keys | Google Gemini API key | — |
| `LLM_MODEL` | No | Groq model ID | `.env.example`: `llama-3.3-70b-versatile` (code default: `llama-3.1-8b-instant`) |
| `GEMINI_MODEL` | No | Main Gemini model | `gemini-2.5-flash` |
| `GEMINI_MAX_TOKENS` | No | Max output tokens for Gemini | `8192` |
| `GEMINI_FALLBACK_MODELS` | No | Comma-separated fallback models | `gemini-2.5-flash,gemini-2.5-flash-lite` |
| `GEMINI_THINKING_LEVEL` | No | Only for Gemini 3 models: `minimal`, `low`, `medium` or `high` | `low` |

> 🔒 Never commit your `.env` file. It is already listed in `.gitignore`. The backend will not start unless at least one API key is set.

*(Optional)* The frontend points to `http://localhost:8005/api` by default. To change it, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.

### 3. Install the backend

```bash
python -m venv backend/venv
# Windows
backend\venv\Scripts\activate
# macOS / Linux
source backend/venv/bin/activate

pip install -r backend/requirements.txt
```

### 4. Install the frontend

```bash
cd frontend
npm install
cd ..
```

---

## Usage

### Option A: Windows one-click launcher

After completing the installation steps above, run:

```bat
run_project.bat
```

This opens two terminals, one for the backend on port **8005** and one for the frontend on port **5173**, and then opens <http://localhost:5173> in your browser.

### Option B: Manual start (any OS)

**Terminal 1: backend.** Run this from the project root with the virtual environment active:

```bash
uvicorn backend.main:app --reload --port 8005
```

**Terminal 2: frontend**

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. The backend API docs are at <http://localhost:8005/docs>.

### Using the app

1. Enter a debate **topic**, a **FOR** argument and an **AGAINST** argument, or load one of the sample debates.
2. Choose a provider: **Groq**, **Gemini** or **Compare Both**. The UI checks `/api/health` and disables Gemini and Compare Both when no Gemini key is configured.
3. Submit. The pipeline makes many LLM calls in sequence, so an analysis can take a minute or more depending on the provider.
4. Explore the result tabs. Use **Improve** to have Agent 8 rewrite a side, or export the analysis as a PDF.

### Example API request

```bash
curl -X POST http://localhost:8005/api/analyze-debate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI tools should be allowed in university exams",
    "for_argument": "AI tools prepare graduates for an AI-driven workplace...",
    "against_argument": "AI tools in exams undermine academic integrity...",
    "provider": "groq"
  }'
# → {"id": "<uuid>", "status": "completed", "cached": false}

curl http://localhost:8005/api/results/<uuid>
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze-debate` | Run the 7-agent pipeline. Body: `topic`, `for_argument`, `against_argument`, `provider` (`groq` \| `gemini`) |
| `GET` | `/api/results/{id}` | Full analysis result |
| `GET` | `/api/history` | Summaries of all analyses in the current server session |
| `GET` | `/api/causal-graph/{id}/for` | Causal graph (React Flow nodes/edges) for the FOR side |
| `GET` | `/api/causal-graph/{id}/against` | Causal graph for the AGAINST side |
| `POST` | `/api/improve-argument` | Agent 8 rewrite. Body: `result_id`, `side` (`FOR` \| `AGAINST`) |
| `GET` | `/api/health` | Service status and which provider keys are loaded |

Interactive documentation: Swagger UI at `/docs` and ReDoc at `/redoc`.

---

## Testing

The repository contains two **end-to-end smoke-test scripts**. They are not unit tests. Both need the backend to be running and valid API keys:

```bash
# Full pipeline check (uses the default provider) – prints winner, scores, fallacy/causal counts
python test_pipeline.py

# Calls /analyze-debate once with Gemini and once with Groq
python test_api.py
```

Both scripts use `http://localhost:8005/api` by default. Set `API_BASE_URL` to test another address.

To check which Gemini models work with your key, run the utility script. It needs the extra `google-genai` package, which is not in `requirements.txt`:

```bash
pip install google-genai
python backend/scripts/probe_gemini_models.py --models gemini-2.5-flash gemini-2.5-flash-lite
```

There is no automated unit-test suite yet.

---

## Limitations and Future Work

**Limitations**

- **Results are stored in memory.** History and cached results are lost when the backend restarts.
- **Verdicts come from LLMs.** Scores, fallacies and causal labels can vary between runs and providers, and they can be wrong. Treat them as decision support, not ground truth.
- **Latency:** each analysis makes many LLM calls one after another, so results are not instant.
- **CORS is limited** to `localhost:5173` and `localhost:3000`. Deployment would need configuration changes.
- At startup the backend prints the first 8 characters of each API key to the console. Keep server logs private.
- There is no authentication or rate limiting, and no automated unit tests.

**Possible future improvements**

- Store results in a persistent database such as SQLite or PostgreSQL.
- Run independent agents in parallel to reduce latency, and stream progress to the UI.
- Add unit tests with mocked LLM responses, plus CI.
- Support multi-round debates and rebuttals.
- Add containerisation (Docker) and a deployable configuration.

---

## License

No license file is included yet. Until one is added, all rights are reserved by default. Third-party libraries keep their own licenses (see `backend/requirements.txt` and `frontend/package.json`).
