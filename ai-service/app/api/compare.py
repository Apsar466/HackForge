"""
app/api/compare.py
POST /compare-team-formation endpoint.

Runs both algorithmic and LLM team formation on identical input,
computes average_skill_coverage_score for each, and declares a winner.

When ANTHROPIC_API_KEY is not configured, the LLM leg is skipped gracefully
and the response includes llm_available=false and a descriptive llm_error.
The algorithmic result is always returned.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from app.models.team_formation import (
    TeamFormationRequest,
    AlgorithmicTeamResult,
    LLMTeamResult,
)
from app.models.compare import (
    CompareTeamFormationResponse,
    AlgorithmicResult,
    LLMResult,
)
from app.services.matching import match_teams_greedy
from app.services.llm_matching import match_teams_llm

router = APIRouter(tags=["Team Formation Comparison"])


def _avg(scores: List[float]) -> float:
    """Safely compute average over a list of scores."""
    return round(sum(scores) / len(scores), 4) if scores else 0.0


@router.post(
    "/compare-team-formation",
    response_model=CompareTeamFormationResponse,
    summary="Compare algorithmic vs LLM team formation on identical input",
    description=(
        "Runs both the greedy complementary skill allocation algorithm AND the "
        "Anthropic Claude LLM-based team formation on the **exact same** participant list. "
        "Returns both sets of teams with their real `skill_coverage_score` values "
        "and an `average_skill_coverage_score` per method, plus a `winner` field indicating "
        "which method achieved higher average skill diversity.\n\n"
        "If `ANTHROPIC_API_KEY` is not set, `llm_available` will be `false`, "
        "`llm` will be `null`, and `winner` will default to `algorithmic`."
    ),
)
async def compare_team_formation(
    payload: TeamFormationRequest,
) -> CompareTeamFormationResponse:
    participants_dict: List[Dict[str, Any]] = [p.model_dump() for p in payload.participants]
    team_size = payload.team_size

    # ── 1. ALGORITHMIC (always runs) ─────────────────────────────────────────
    algo_raw, _vocab = match_teams_greedy(participants_dict, team_size)

    algo_teams = [
        AlgorithmicTeamResult(
            team_id=t["team_id"],
            members=t.get("member_ids") or [
                str(m.get("id") or m.get("_id")) for m in t.get("members", [])
            ],
            skill_coverage_score=t["skill_coverage_score"],
        )
        for t in algo_raw
    ]
    algo_avg = _avg([t.skill_coverage_score for t in algo_teams])

    print(
        f"[Compare] Algorithmic => {len(algo_teams)} teams, "
        f"avg score = {algo_avg}%"
    )

    # ── 2. LLM (optional — skipped gracefully if key is missing) ────────────
    llm_result: Optional[LLMResult] = None
    llm_available = True
    llm_error: Optional[str] = None

    try:
        llm_raw = match_teams_llm(participants_dict, team_size)

        llm_teams = [
            LLMTeamResult(
                team_id=t["team_id"],
                members=t["members"],
                skill_coverage_score=t["skill_coverage_score"],
                reasoning=t["reasoning"],
            )
            for t in llm_raw
        ]
        llm_avg = _avg([t.skill_coverage_score for t in llm_teams])

        print(
            f"[Compare] LLM        => {len(llm_teams)} teams, "
            f"avg score = {llm_avg}%"
        )

        llm_result = LLMResult(
            teams=llm_teams,
            average_skill_coverage_score=llm_avg,
        )

    except Exception as exc:
        llm_available = False
        llm_error = str(exc)
        print(f"[Compare] LLM skipped: {llm_error}")

    # ── 3. WINNER ────────────────────────────────────────────────────────────
    if llm_result is None:
        # LLM unavailable — algorithmic wins by default
        winner = "algorithmic"
    elif algo_avg > llm_result.average_skill_coverage_score:
        winner = "algorithmic"
    elif llm_result.average_skill_coverage_score > algo_avg:
        winner = "llm"
    else:
        winner = "tie"

    print(f"[Compare] Winner: {winner}")

    return CompareTeamFormationResponse(
        algorithmic=AlgorithmicResult(
            teams=algo_teams,
            average_skill_coverage_score=algo_avg,
        ),
        llm=llm_result,
        winner=winner,
        llm_available=llm_available,
        llm_error=llm_error,
    )
