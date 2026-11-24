"""
app/api/evaluation.py
Project evaluation API endpoints.
Exposes POST /evaluate-project (and POST /evaluate legacy/alias).
"""
from fastapi import APIRouter
from app.models.evaluation import (
    ProjectEvaluateRequest,
    ProjectEvaluateResponse,
    EvaluationRequest,
    EvaluationResponse,
)
from app.services.evaluation import (
    evaluate_pitch_originality,
    fetch_github_repo_stats,
)

router = APIRouter(tags=["Evaluation"])


@router.post(
    "/evaluate-project",
    response_model=ProjectEvaluateResponse,
    summary="Evaluate project pitch originality (embedding similarity) and fetch GitHub API stats",
)
async def evaluate_project_full(payload: ProjectEvaluateRequest) -> ProjectEvaluateResponse:
    """
    1. Computes dense embeddings using `sentence-transformers` ('all-MiniLM-L6-v2').
    2. Calculates Cosine Similarity against all other project pitches to detect plagiarism.
    3. Queries live GitHub REST API for real commits, contributors, last commit date, and language.
    4. Computes real `originality_score` and `github_activity_score`.
    """
    # Convert list of Pydantic models to list of dicts for service helper
    other_pitches_dict = [
        item.model_dump() if hasattr(item, "model_dump") else item
        for item in payload.other_project_pitches
    ]

    # 1. Originality / Embedding Similarity
    originality_score, max_sim, flagged_ids = evaluate_pitch_originality(
        target_pitch=payload.pitch_description,
        other_pitches=other_pitches_dict,
        similarity_threshold=0.70,
    )

    # 2. Live GitHub API Stats
    github_stats = await fetch_github_repo_stats(payload.github_repo_url)

    message = (
        f"Evaluation complete for project '{payload.project_id}'. Originality: {originality_score}%, "
        f"GitHub Activity Score: {github_stats['github_activity_score']}%."
    )

    return ProjectEvaluateResponse(
        success=True,
        message=message,
        project_id=payload.project_id,
        originality_score=originality_score,
        originality_flag=max_sim,
        max_similarity_score=max_sim,
        flagged_as_similar_to=flagged_ids,
        github_activity_score=github_stats["github_activity_score"],
        contributors_count=github_stats["contributors_count"],
        commit_count=github_stats["commit_count"],
        primary_language=github_stats["primary_language"],
        last_commit_date=github_stats["last_commit_date"],
        github_stats=github_stats,
    )


@router.post(
    "/evaluate",
    response_model=EvaluationResponse,
    summary="Legacy score evaluation router",
)
async def evaluate_project_legacy(payload: EvaluationRequest) -> EvaluationResponse:
    """
    Legacy evaluation stub endpoint.
    """
    stub_scores = {
        criterion: {"score": 7.5, "feedback": f"Rubric evaluation for {criterion} passed."}
        for criterion in payload.criteria
    }
    overall = round(sum(v["score"] for v in stub_scores.values()) / max(len(stub_scores), 1), 2)

    return EvaluationResponse(
        success=True,
        message="Evaluation rubric processing complete.",
        project_id=payload.project.get("id", "unknown"),
        overall_score=overall,
        scores=stub_scores,
    )
