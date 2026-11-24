"""
app/models/evaluation.py
Pydantic v2 schemas for the project evaluation & /evaluate-project API.
"""
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ProjectEvaluateRequest(BaseModel):
    project_id: str = Field(..., description="Target project ID to evaluate")
    pitch_description: str = Field(..., description="Target project pitch description")
    github_repo_url: str = Field(..., description="Target project GitHub repository URL")
    other_project_pitches: List[Any] = Field(
        default_factory=list,
        description="List of other submitted project pitches (strings or objects) for similarity/plagiarism check",
    )


class GitHubStats(BaseModel):
    valid: bool
    error: Optional[str] = None
    github_activity_score: float
    commit_count: int
    contributors_count: int
    primary_language: str
    last_commit_date: Optional[str] = None


class ProjectEvaluateResponse(BaseModel):
    success: bool
    message: str
    project_id: str
    originality_score: float = Field(..., description="Originality score (0 to 100), higher is more original")
    originality_flag: float = Field(..., description="Highest similarity score (0.0 to 1.0), lower = more original")
    max_similarity_score: float = Field(..., description="Highest similarity score (0.0 to 1.0)")
    flagged_as_similar_to: list[str] = Field(
        default_factory=list,
        description="List of project_ids or indices above similarity threshold (>= 0.70)",
    )
    github_activity_score: float
    contributors_count: int
    commit_count: int
    primary_language: str
    last_commit_date: Optional[str] = None
    github_stats: GitHubStats


# Legacy schema fallback support
class CriterionScore(BaseModel):
    score: float = Field(..., ge=0.0, le=10.0)
    feedback: str


class EvaluationRequest(BaseModel):
    project: dict[str, Any] = Field(..., description="Project submission payload")
    criteria: list[str] = Field(..., min_length=1, description="List of criterion names to score against")


class EvaluationResponse(BaseModel):
    success: bool
    message: str
    project_id: str
    overall_score: float
    scores: dict[str, CriterionScore]
