"""
app/api/llm_evaluation.py
POST /evaluate-project-llm endpoint.

Combines:
  1. Real GitHub REST API stats (commit count, contributors, language, last commit)
  2. Anthropic Claude LLM evaluation (originality vs other pitches, technical effort)

Zero fabrication — every score comes from the actual LLM call on real submitted data.
"""
from fastapi import APIRouter
from app.models.llm_evaluation import (
    EvaluateProjectLLMRequest,
    EvaluateProjectLLMResponse,
    GitHubStatsResult,
)
from app.services.llm_evaluation import evaluate_project_llm

router = APIRouter(tags=["LLM Project Evaluation"])


@router.post(
    "/evaluate-project-llm",
    response_model=EvaluateProjectLLMResponse,
    summary="LLM-powered project evaluation with real GitHub stats",
    description=(
        "Fetches live GitHub repository statistics (commit count, contributor count, "
        "primary language, last commit date) and calls **claude-sonnet-4-6** to produce:\n\n"
        "- `originality_score` (0-100): How conceptually unique this pitch is vs `other_pitches`.\n"
        "- `technical_effort_score` (0-100): Technical depth inferred from real GitHub activity.\n"
        "- `flagged_as_similar_to`: Excerpts of any pitch from `other_pitches` deemed >60% conceptually similar.\n"
        "- `summary_feedback`: 2-3 sentence prose critique.\n\n"
        "**Requires** `ANTHROPIC_API_KEY` in environment. "
        "Returns `HTTP 500` with a clear message if key is absent. "
        "Returns `HTTP 422` if the GitHub repo URL is invalid or private."
    ),
)
async def evaluate_project_llm_endpoint(
    payload: EvaluateProjectLLMRequest,
) -> EvaluateProjectLLMResponse:
    result = await evaluate_project_llm(
        project_id=payload.project_id,
        team_name=payload.team_name,
        pitch_description=payload.pitch_description,
        github_repo_url=payload.github_repo_url,
        other_pitches=payload.other_pitches,
    )

    return EvaluateProjectLLMResponse(
        success=True,
        project_id=payload.project_id,
        team_name=payload.team_name,
        originality_score=result["originality_score"],
        technical_effort_score=result["technical_effort_score"],
        flagged_as_similar_to=result["flagged_as_similar_to"],
        summary_feedback=result["summary_feedback"],
        github_stats=GitHubStatsResult(**result["github_stats"]),
    )
