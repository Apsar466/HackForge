"""
app/services/llm_matching.py — LLM-Powered Team Formation using Anthropic API (claude-sonnet-4-6)
"""

import json
import os
import re
from typing import Any, Dict, List
from fastapi import HTTPException
from app.services.matching import extract_skill_vocab, calculate_team_skill_coverage_score


def clean_json_response(text: str) -> str:
    """Strips markdown code fences (e.g. ```json ... ```) from LLM output."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def build_llm_prompt(participants: List[Dict[str, Any]], team_size: int) -> str:
    """Builds structured prompt listing participants, their skills, and rules."""
    participant_lines = []
    for p in participants:
        p_id = str(p.get("id") or p.get("_id"))
        name = p.get("name", "Unknown")
        skills = ", ".join(p.get("skills", [])) or "None"
        exp = p.get("experienceLevel", "intermediate")
        participant_lines.append(f"- ID: {p_id} | Name: {name} | Skills: [{skills}] | Experience: {exp}")

    participants_str = "\n".join(participant_lines)

    return f"""You are an expert AI Hackathon Organizer & Team Architect.
Your task is to form balanced, diverse teams of target size {team_size} from the following list of participants.

PARTICIPANTS LIST:
{participants_str}

REQUIREMENTS & CONSTRAINTS:
1. Every participant MUST be assigned to EXACTLY ONE team. No participant may be omitted or duplicated.
2. Target team size is {team_size}. Teams should have equal size where possible.
3. Ensure skill complementarity: Each team must have a diverse mix of skills (e.g. mix Frontend, Backend, ML, Design, UI/UX rather than grouping similar skills together).
4. Respond ONLY with valid JSON. Do not include introductory text, explanations outside JSON, or markdown formatting outside the JSON object.

JSON OUTPUT FORMAT EXACT SPECIFICATION:
{{
  "teams": [
    {{
      "team_id": 1,
      "member_ids": ["p1", "p2", "p3"],
      "reasoning": "Short 1-2 sentence explanation of why this skill grouping is complementary and balanced."
    }}
  ]
}}
"""


def call_anthropic_llm(prompt: str) -> str:
    """Calls Anthropic Messages API using ANTHROPIC_API_KEY environment variable."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable is not configured on the AI service."
        )

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        temperature=0.2,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    text_content = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            text_content += block.text
    return text_content


def validate_and_parse_llm_teams(
    raw_response: str, expected_participant_ids: set
) -> List[Dict[str, Any]]:
    """
    Parses JSON and validates that every participant_id appears in exactly one team.
    Throws ValueError if JSON is malformed or invalid.
    """
    cleaned = clean_json_response(raw_response)
    data = json.loads(cleaned)

    if not isinstance(data, dict) or "teams" not in data or not isinstance(data["teams"], list):
        raise ValueError("LLM response does not contain a top-level 'teams' list.")

    assigned_ids = set()
    for team in data["teams"]:
        member_ids = team.get("member_ids")
        if not isinstance(member_ids, list):
            raise ValueError(f"Team {team.get('team_id')} member_ids is not a list.")
        
        for m_id in member_ids:
            m_str = str(m_id)
            if m_str in assigned_ids:
                raise ValueError(f"Participant '{m_str}' assigned to multiple teams.")
            assigned_ids.add(m_str)

    missing = expected_participant_ids - assigned_ids
    if missing:
        raise ValueError(f"LLM missed participants: {sorted(list(missing))}")

    return data["teams"]


def match_teams_llm(
    participants: List[Dict[str, Any]], team_size: int = 4
) -> List[Dict[str, Any]]:
    """
    Executes LLM-based team matching with retry logic and computes skill coverage scores.
    """
    if not participants:
        return []

    p_map = {str(p.get("id") or p.get("_id")): p for p in participants}
    expected_ids = set(p_map.keys())

    prompt = build_llm_prompt(participants, team_size)

    # Attempt 1
    llm_teams = None
    last_error = None

    try:
        raw_output = call_anthropic_llm(prompt)
        llm_teams = validate_and_parse_llm_teams(raw_output, expected_ids)
    except Exception as e:
        last_error = str(e)
        print(f"[LLM Matching Warning] Attempt 1 failed: {last_error}. Retrying once...")
        
        # Retry Attempt 2
        try:
            retry_prompt = prompt + f"\n\nCRITICAL FIX REQUIRED: Previous response failed validation with error: {last_error}. Ensure ALL IDs {sorted(list(expected_ids))} are included in exactly one team."
            raw_output = call_anthropic_llm(retry_prompt)
            llm_teams = validate_and_parse_llm_teams(raw_output, expected_ids)
        except Exception as retry_e:
            raise HTTPException(
                status_code=500,
                detail=f"LLM team formation failed validation after retry: {str(retry_e)}"
            )

    # Calculate same skill_coverage_score as algorithmic endpoint
    vocab = extract_skill_vocab(participants)
    formatted_teams = []

    for t in llm_teams:
        team_id = t.get("team_id", 1)
        member_ids = [str(m) for m in t.get("member_ids", [])]
        reasoning = t.get("reasoning", "LLM-generated complementary skill grouping.")

        # Map member IDs back to participant dicts to compute exact same skill coverage score formula
        team_participant_objs = [p_map[m_id] for m_id in member_ids if m_id in p_map]
        score = calculate_team_skill_coverage_score(team_participant_objs, vocab)

        formatted_teams.append({
            "team_id": team_id,
            "members": member_ids,
            "skill_coverage_score": score,
            "reasoning": reasoning
        })

    return formatted_teams
