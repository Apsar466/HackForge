"""
app/services/llm_evaluation.py — LLM-Powered Project Evaluation (Anthropic claude-sonnet-4-6)

Fetches real GitHub repository stats and asks Claude to produce:
  - originality_score (0-100)
  - technical_effort_score (0-100)
  - flagged_as_similar_to (list of similar pitches)
  - summary_feedback (2-3 sentence prose)

Zero fabrication — all scores come from the live LLM call using real data.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from app.services.evaluation import fetch_github_repo_stats


# ── JSON Helpers ──────────────────────────────────────────────────────────────

def _clean_json(text: str) -> str:
    """Strip markdown code fences from LLM response."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ── Anthropic Call ────────────────────────────────────────────────────────────

def _call_anthropic(prompt: str) -> str:
    """
    Calls the Anthropic Messages API (claude-sonnet-4-6).
    Reads ANTHROPIC_API_KEY from environment — never hardcoded.
    Raises HTTPException with clear message if the key is missing.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable is not configured on the AI service.",
        )

    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        temperature=0.1,  # Low temperature for consistent, structured output
        messages=[{"role": "user", "content": prompt}],
    )

    text = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            text += block.text
    return text


# ── Prompt Builder ────────────────────────────────────────────────────────────

def _build_eval_prompt(
    project_id: str,
    team_name: str,
    pitch_description: str,
    github_stats: Dict[str, Any],
    other_pitches: List[str],
) -> str:
    """
    Constructs the structured evaluation prompt sent to Claude.
    Includes pitch text, real GitHub stats, and peer pitches for originality comparison.
    """
    stats_block = (
        f"  - Commit count       : {github_stats.get('commit_count', 'N/A')}\n"
        f"  - Contributor count  : {github_stats.get('contributors_count', 'N/A')}\n"
        f"  - Primary language   : {github_stats.get('primary_language', 'N/A')}\n"
        f"  - Last commit date   : {github_stats.get('last_commit_date', 'N/A')}\n"
        f"  - GitHub activity score (pre-computed, 0-100): {github_stats.get('github_activity_score', 'N/A')}"
    )

    if other_pitches:
        other_block = "\n".join(
            f"  PITCH {i+1}: {p}" for i, p in enumerate(other_pitches)
        )
    else:
        other_block = "  (No other pitches submitted — this is the only submission.)"

    return f"""You are an expert Hackathon Judge AI evaluating a project submission fairly and critically.

PROJECT BEING EVALUATED:
  - Project ID  : {project_id}
  - Team Name   : {team_name}
  - Pitch       : {pitch_description}

REAL GITHUB REPOSITORY STATISTICS (fetched live):
{stats_block}

OTHER TEAMS' PITCHES IN THIS EVENT (for originality comparison):
{other_block}

YOUR TASK:
1. Assess the originality_score (0-100) based on how conceptually unique this pitch is compared to the other pitches listed above.
   - Score 90-100: Completely novel concept not found in any other pitch.
   - Score 60-89 : Moderately original, some overlap in concept but meaningfully different.
   - Score 30-59 : Significant conceptual overlap with one or more other pitches.
   - Score 0-29  : Highly similar or nearly identical to another pitch.

2. Assess the technical_effort_score (0-100) based on the GitHub stats above:
   - Consider commit count as a proxy for development effort.
   - Consider contributor count as a proxy for team participation.
   - Consider last commit date (more recent = active project).
   - Consider primary language and how technically demanding it is for the stated pitch.

3. List in flagged_as_similar_to any pitch text from the "OTHER TEAMS' PITCHES" that is highly conceptually similar to the project being evaluated (similarity > 60% in concept).
   - Use the EXACT text of the similar pitch, truncated to max 80 characters.
   - If no pitches are similar, return an empty list [].

4. Write a summary_feedback: a concise 2-3 sentence critique covering originality, technical execution, and any concerns.

RESPOND ONLY WITH VALID JSON. No markdown, no explanatory text outside JSON.
EXACT OUTPUT FORMAT:
{{
  "originality_score": <integer 0-100>,
  "technical_effort_score": <integer 0-100>,
  "flagged_as_similar_to": ["<similar pitch text truncated to 80 chars>", ...],
  "summary_feedback": "<2-3 sentence evaluation>"
}}"""


# ── Response Validator ────────────────────────────────────────────────────────

def _validate_eval_response(raw: str) -> Dict[str, Any]:
    """
    Parses and validates the LLM evaluation JSON response.
    Raises ValueError if structure is missing required fields or values are out of range.
    """
    cleaned = _clean_json(raw)
    data = json.loads(cleaned)

    required = {"originality_score", "technical_effort_score", "flagged_as_similar_to", "summary_feedback"}
    missing = required - set(data.keys())
    if missing:
        raise ValueError(f"LLM response missing required fields: {sorted(missing)}")

    for score_field in ("originality_score", "technical_effort_score"):
        val = data[score_field]
        if not isinstance(val, (int, float)) or not (0 <= val <= 100):
            raise ValueError(f"'{score_field}' must be a number between 0 and 100, got: {val}")

    if not isinstance(data["flagged_as_similar_to"], list):
        raise ValueError("'flagged_as_similar_to' must be a list.")

    if not isinstance(data["summary_feedback"], str) or not data["summary_feedback"].strip():
        raise ValueError("'summary_feedback' must be a non-empty string.")

    return {
        "originality_score": float(data["originality_score"]),
        "technical_effort_score": float(data["technical_effort_score"]),
        "flagged_as_similar_to": [str(x) for x in data["flagged_as_similar_to"]],
        "summary_feedback": data["summary_feedback"].strip(),
    }


# ── Main Evaluation Entry Point ────────────────────────────────────────────────

async def evaluate_project_llm(
    project_id: str,
    team_name: str,
    pitch_description: str,
    github_repo_url: str,
    other_pitches: List[str],
) -> Dict[str, Any]:
    """
    Full LLM project evaluation pipeline:
    1. Fetch real GitHub repo stats (raises HTTP error if repo is invalid/private).
    2. Build structured prompt using real pitch + stats + other pitches.
    3. Call Claude (with one retry on malformed response).
    4. Return validated evaluation dict.
    """
    # ── Step 1: GitHub Stats ──────────────────────────────────────────────────
    print(f"\n[LLM Eval] Fetching GitHub stats for: {github_repo_url}")
    github_stats = await fetch_github_repo_stats(github_repo_url)

    if not github_stats.get("valid", True) and github_stats.get("error"):
        # Repository is invalid or private — return clear error, no fake score
        raise HTTPException(
            status_code=422,
            detail=f"Cannot evaluate: {github_stats['error']}",
        )

    print(
        f"[LLM Eval] GitHub stats: commits={github_stats['commit_count']}, "
        f"contributors={github_stats['contributors_count']}, "
        f"lang={github_stats['primary_language']}, "
        f"activity={github_stats['github_activity_score']}%"
    )

    # ── Step 2: Build Prompt ──────────────────────────────────────────────────
    prompt = _build_eval_prompt(
        project_id=project_id,
        team_name=team_name,
        pitch_description=pitch_description,
        github_stats=github_stats,
        other_pitches=other_pitches,
    )

    # ── Step 3: Call LLM with retry ──────────────────────────────────────────
    eval_result: Optional[Dict[str, Any]] = None
    last_error: Optional[str] = None

    for attempt in range(1, 3):  # Max 2 attempts
        try:
            raw = _call_anthropic(prompt)
            print(f"[LLM Eval] Attempt {attempt} raw response (first 200 chars): {raw[:200]}")
            eval_result = _validate_eval_response(raw)
            print(f"[LLM Eval] Attempt {attempt} succeeded.")
            break
        except HTTPException:
            raise  # Re-raise key-missing errors immediately
        except Exception as e:
            last_error = str(e)
            print(f"[LLM Eval Warning] Attempt {attempt} failed: {last_error}")
            if attempt == 1:
                # Augment prompt with explicit correction instruction before retry
                prompt += (
                    f"\n\nCRITICAL: Your previous response failed validation with error: {last_error}. "
                    "Output ONLY valid JSON with the exact fields specified. No markdown fences."
                )

    if eval_result is None:
        raise HTTPException(
            status_code=500,
            detail=f"LLM evaluation failed after 2 attempts. Last error: {last_error}",
        )

    # ── Step 4: Attach GitHub stats to result ─────────────────────────────────
    eval_result["github_stats"] = {
        "commit_count": github_stats["commit_count"],
        "contributors_count": github_stats["contributors_count"],
        "primary_language": github_stats["primary_language"],
        "last_commit_date": github_stats["last_commit_date"],
        "github_activity_score": github_stats["github_activity_score"],
    }

    print(
        f"[LLM Eval] RESULT => originality={eval_result['originality_score']}, "
        f"technical_effort={eval_result['technical_effort_score']}, "
        f"flagged={eval_result['flagged_as_similar_to']}\n"
    )

    return eval_result
