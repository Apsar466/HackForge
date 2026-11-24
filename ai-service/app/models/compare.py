"""
app/models/compare.py
Pydantic v2 schemas for POST /compare-team-formation.
"""
from typing import Literal, Optional
from pydantic import BaseModel, Field
from app.models.team_formation import AlgorithmicTeamResult, LLMTeamResult


class AlgorithmicResult(BaseModel):
    teams: list[AlgorithmicTeamResult]
    average_skill_coverage_score: float


class LLMResult(BaseModel):
    teams: list[LLMTeamResult]
    average_skill_coverage_score: float


class CompareTeamFormationResponse(BaseModel):
    algorithmic: AlgorithmicResult
    llm: Optional[LLMResult] = None
    winner: Literal["algorithmic", "llm", "tie"]
    llm_available: bool = True
    llm_error: Optional[str] = None

