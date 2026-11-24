"""
app/api/team_formation.py
Team formation & matching API endpoints.
Exposes POST /team-formation, POST /match-teams, POST /match-teams-algorithmic, and POST /match-teams-llm.
"""
from fastapi import APIRouter
from app.models.team_formation import (
    TeamFormationRequest,
    TeamFormationResponse,
    AlgorithmicMatchResponse,
    AlgorithmicTeamResult,
    LLMMatchResponse,
    LLMTeamResult,
)
from app.services.matching import match_teams_greedy
from app.services.llm_matching import match_teams_llm

router = APIRouter(tags=["Team Formation"])


@router.post(
    "/team-formation",
    response_model=TeamFormationResponse,
    summary="Suggest optimal team groupings using skill diversity algorithm",
)
@router.post(
    "/match-teams",
    response_model=TeamFormationResponse,
    summary="Suggest optimal team groupings (alias for /match-teams)",
)
async def form_teams(payload: TeamFormationRequest) -> TeamFormationResponse:
    """
    Accepts a list of participant skill profiles and a target team size.
    
    1. Converts skills into binary vectors via dynamic multi-label one-hot encoding.
    2. Runs Greedy Complementary Skill Allocation to build balanced teams.
    3. Calculates real `skill_coverage_score` metrics for each team.
    """
    participants_dict = [p.model_dump() for p in payload.participants]
    
    teams_result, vocab = match_teams_greedy(
        participants=participants_dict,
        team_size=payload.team_size
    )

    return TeamFormationResponse(
        success=True,
        message=(
            f"Successfully formed {len(teams_result)} team(s) from {len(payload.participants)} "
            f"participants across {len(vocab)} unique skills using Greedy Complementary Allocation."
        ),
        unique_skills_count=len(vocab),
        unique_skills_derived=vocab,
        teams=teams_result,
    )


@router.post(
    "/match-teams-algorithmic",
    response_model=AlgorithmicMatchResponse,
    summary="Match teams using dynamic multi-label one-hot encoding & greedy complementary skill allocation",
)
async def match_teams_algorithmic(payload: TeamFormationRequest) -> AlgorithmicMatchResponse:
    """
    1. Converts each participant's skills into a numeric vector using multi-label one-hot encoding across all unique skills.
    2. Uses greedy complementary skill allocation to split participants into diverse, balanced teams of size `team_size`.
    3. Computes real non-hardcoded `skill_coverage_score` (breadth + Shannon entropy) for each team.
    4. Returns: { method: "algorithmic", teams: [{ team_id, members: [participant_ids], skill_coverage_score }] }
    """
    participants_dict = [p.model_dump() for p in payload.participants]
    
    teams_result, vocab = match_teams_greedy(
        participants=participants_dict,
        team_size=payload.team_size
    )
    
    print(f"[Match-Teams Algorithmic Log] Derived {len(vocab)} unique skills dynamically: {vocab[:8]}... ({len(vocab)} total)")
    
    algorithmic_teams = []
    for team in teams_result:
        member_ids = team.get("member_ids") or [str(m.get("id") or m.get("_id")) for m in team.get("members", [])]
        score = team.get("skill_coverage_score", 0.0)
        print(f"[Match-Teams Algorithmic Log] Team {team['team_id']}: Members={member_ids}, Score={score}%")
        
        algorithmic_teams.append(
            AlgorithmicTeamResult(
                team_id=team["team_id"],
                members=member_ids,
                skill_coverage_score=score
            )
        )

    return AlgorithmicMatchResponse(
        method="algorithmic",
        teams=algorithmic_teams
    )


@router.post(
    "/match-teams-llm",
    response_model=LLMMatchResponse,
    summary="Match teams using Anthropic Claude LLM (claude-sonnet-4-6) with skill coverage score",
)
async def match_teams_llm_endpoint(payload: TeamFormationRequest) -> LLMMatchResponse:
    """
    1. Calls Anthropic API (claude-sonnet-4-6) using ANTHROPIC_API_KEY from environment.
    2. Constructs prompt with participant skills & experience level to form balanced teams.
    3. Validates that every participant appears in exactly one team, retrying once if needed.
    4. Computes the same skill_coverage_score (breadth + Shannon entropy) for comparison.
    5. Returns: { method: "llm", teams: [{ team_id, members: [participant_ids], skill_coverage_score, reasoning }] }
    """
    participants_dict = [p.model_dump() for p in payload.participants]
    
    llm_teams_result = match_teams_llm(
        participants=participants_dict,
        team_size=payload.team_size
    )
    
    formatted_teams = [
        LLMTeamResult(
            team_id=t["team_id"],
            members=t["members"],
            skill_coverage_score=t["skill_coverage_score"],
            reasoning=t["reasoning"]
        )
        for t in llm_teams_result
    ]

    return LLMMatchResponse(
        method="llm",
        teams=formatted_teams
    )
