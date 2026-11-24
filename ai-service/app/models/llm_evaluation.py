"""
app/models/llm_evaluation.py
Pydantic v2 schemas for POST /evaluate-project-llm.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, HttpUrl


class EvaluateProjectLLMRequest(BaseModel):
    project_id: str = Field(..., description="Unique identifier for this project submission.")
    team_name: str = Field(..., description="Name of the submitting team.")
    pitch_description: str = Field(
        ..., min_length=10, description="The project's pitch / description text."
    )
    github_repo_url: str = Field(
        ..., description="Full GitHub repository URL, e.g. https://github.com/owner/repo"
    )
    other_pitches: List[str] = Field(
        default_factory=list,
        description=(
            "List of all OTHER teams' pitch description strings from the same event. "
            "Used for originality/similarity comparison. Pass [] if this is the only submission."
        ),
    )

    model_config = {"json_schema_extra": {
        "example": {
            "project_id": "proj-001",
            "team_name": "Team Alpha",
            "pitch_description": "An AI-powered mental health journaling app that detects mood patterns from text and suggests personalized coping strategies.",
            "github_repo_url": "https://github.com/expressjs/express",
            "other_pitches": [
                "A journaling app that uses AI to analyze user emotions and recommend therapy techniques.",
                "A blockchain-based voting system for decentralized governance in DAOs.",
            ],
        }
    }}


class GitHubStatsResult(BaseModel):
    commit_count: int
    contributors_count: int
    primary_language: Optional[str] = None
    last_commit_date: Optional[str] = None
    github_activity_score: float = Field(
        description="Pre-computed activity score (0-100) based on commits, contributors, and recency."
    )


class EvaluateProjectLLMResponse(BaseModel):
    success: bool = True
    project_id: str
    team_name: str
    originality_score: float = Field(
        description="0-100 score from Claude assessing conceptual uniqueness vs other_pitches."
    )
    technical_effort_score: float = Field(
        description="0-100 score from Claude based on real GitHub activity stats."
    )
    flagged_as_similar_to: List[str] = Field(
        description="Excerpts of other pitches Claude identified as conceptually similar (>60% concept overlap)."
    )
    summary_feedback: str = Field(
        description="2-3 sentence prose critique from Claude covering originality, technical execution, and concerns."
    )
    github_stats: GitHubStatsResult
