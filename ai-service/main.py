"""
main.py — HackForge AI Service entry point.

Run with:
    uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.health import router as health_router
from app.api.team_formation import router as team_router
from app.api.evaluation import router as eval_router
from app.api.compare import router as compare_router
from app.api.llm_evaluation import router as llm_eval_router

app = FastAPI(
    title="HackForge AI Service",
    description="AI-powered team formation, sentence-transformers embedding plagiarism check, and GitHub activity evaluation.",
    version="0.4.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)                    # GET  /health
app.include_router(team_router)                      # POST /match-teams, /match-teams-algorithmic, /match-teams-llm
app.include_router(eval_router)                      # POST /evaluate-project
app.include_router(compare_router)                   # POST /compare-team-formation
app.include_router(llm_eval_router)                  # POST /evaluate-project-llm
app.include_router(team_router, prefix="/ai")        # POST /ai/match-teams etc.
app.include_router(eval_router, prefix="/ai")        # POST /ai/evaluate-project
app.include_router(compare_router, prefix="/ai")     # POST /ai/compare-team-formation
app.include_router(llm_eval_router, prefix="/ai")   # POST /ai/evaluate-project-llm
