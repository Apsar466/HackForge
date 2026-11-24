"""
app/models/team_formation.py
Pydantic v2 schemas for the team formation & /match-teams API.
"""
from typing import Any, Optional
from pydantic import BaseModel, Field


class Participant(BaseModel):
    id: str
    name: str
    skills: list[str] = Field(default_factory=list)
    experienceLevel: Optional[str] = Field(default="intermediate")
    meta: dict[str, Any] = Field(default_factory=dict)


class TeamFormationRequest(BaseModel):
    participants: list[Participant] = Field(..., min_length=1)
    team_size: int = Field(default=4, ge=2, le=10)


class TeamResult(BaseModel):
    team_id: int
    member_ids: list[str] = Field(default_factory=list)
    members: list[Participant]
    covered_skills: list[str] = Field(default_factory=list)
    skill_coverage_score: float = Field(..., ge=0.0, le=100.0)
    rationale: str


class TeamFormationResponse(BaseModel):
    success: bool
    message: str
    unique_skills_count: int = 0
    unique_skills_derived: list[str] = Field(default_factory=list)
    teams: list[TeamResult]


class AlgorithmicTeamResult(BaseModel):
    team_id: int
    members: list[str]  # list of participant_ids
    skill_coverage_score: float


class AlgorithmicMatchResponse(BaseModel):
    method: str = "algorithmic"
    teams: list[AlgorithmicTeamResult]


class LLMTeamResult(BaseModel):
    team_id: int
    members: list[str]  # list of participant_ids
    skill_coverage_score: float
    reasoning: str


class LLMMatchResponse(BaseModel):
    method: str = "llm"
    teams: list[LLMTeamResult]


