"""
test_match_teams_llm.py

Direct comparison test script comparing Algorithmic Matching vs LLM Matching (claude-sonnet-4-6)
on the exact same 12 sample participants with mixed skills.

Run with:
    python test_match_teams_llm.py
"""
import json
import os
import sys
from unittest.mock import patch
from fastapi.testclient import TestClient

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from app.services.matching import match_teams_greedy
from app.services.llm_matching import match_teams_llm

# ── Same 12 Sample Participants (Mixed Skills) ──
SAMPLE_PARTICIPANTS = [
    {
        "id": "p01",
        "name": "Alice Smith",
        "skills": ["React", "TypeScript", "Tailwind CSS", "UI/UX"],
        "experienceLevel": "advanced"
    },
    {
        "id": "p02",
        "name": "Bob Jones",
        "skills": ["Python", "FastAPI", "MongoDB", "Backend"],
        "experienceLevel": "intermediate"
    },
    {
        "id": "p03",
        "name": "Charlie Brown",
        "skills": ["PyTorch", "Machine Learning", "NLP", "Python"],
        "experienceLevel": "advanced"
    },
    {
        "id": "p04",
        "name": "Diana Prince",
        "skills": ["Figma", "UI/UX Design", "Wireframing", "CSS"],
        "experienceLevel": "beginner"
    },
    {
        "id": "p05",
        "name": "Evan Wright",
        "skills": ["Node.js", "Express", "PostgreSQL", "Docker"],
        "experienceLevel": "intermediate"
    },
    {
        "id": "p06",
        "name": "Fiona Gallagher",
        "skills": ["TensorFlow", "Computer Vision", "Deep Learning", "Python"],
        "experienceLevel": "advanced"
    },
    {
        "id": "p07",
        "name": "George Clark",
        "skills": ["Vue.js", "JavaScript", "HTML", "Frontend"],
        "experienceLevel": "intermediate"
    },
    {
        "id": "p08",
        "name": "Hannah Abbott",
        "skills": ["Go", "Kubernetes", "AWS", "DevOps"],
        "experienceLevel": "expert"
    },
    {
        "id": "p09",
        "name": "Ian Malcolm",
        "skills": ["Scikit-Learn", "Data Science", "Pandas", "Python"],
        "experienceLevel": "intermediate"
    },
    {
        "id": "p10",
        "name": "Julia Roberts",
        "skills": ["Product Design", "Figma", "Design Systems", "UI/UX"],
        "experienceLevel": "advanced"
    },
    {
        "id": "p11",
        "name": "Kevin Bacon",
        "skills": ["Java", "Spring Boot", "MySQL", "Backend"],
        "experienceLevel": "intermediate"
    },
    {
        "id": "p12",
        "name": "Laura Croft",
        "skills": ["React Native", "Mobile App", "Redux", "Frontend"],
        "experienceLevel": "advanced"
    }
]

# Simulated Claude response for offline verification test
MOCK_CLAUDE_RESPONSE = json.dumps({
    "teams": [
        {
            "team_id": 1,
            "member_ids": ["p01", "p02", "p03"],
            "reasoning": "Team 1 balances React frontend (Alice), FastAPI backend (Bob), and PyTorch ML (Charlie) for an AI web app."
        },
        {
            "team_id": 2,
            "member_ids": ["p04", "p05", "p06"],
            "reasoning": "Team 2 pairs Figma UI design (Diana), Node.js backend (Evan), and Computer Vision ML (Fiona)."
        },
        {
            "team_id": 3,
            "member_ids": ["p07", "p08", "p09"],
            "reasoning": "Team 3 combines Vue.js frontend (George), Cloud DevOps (Hannah), and Data Science (Ian)."
        },
        {
            "team_id": 4,
            "member_ids": ["p10", "p11", "p12"],
            "reasoning": "Team 4 mixes Product Design (Julia), Java backend (Kevin), and React Native mobile frontend (Laura)."
        }
    ]
})


def run_comparison_test():
    print("\n=========================================================================")
    print("  HACKFORGE AI SERVICE — ALGORITHMIC VS LLM (CLAUDE-SONNET-4-6) COMPARISON")
    print("=========================================================================\n")

    team_size = 3
    client = TestClient(app)

    # 1. ALGORITHMIC ENDPOINT CALL
    print("1. METHOD 1: ALGORITHMIC MATCHING (POST /match-teams-algorithmic)")
    algo_res = client.post(
        "/match-teams-algorithmic",
        json={"participants": SAMPLE_PARTICIPANTS, "team_size": team_size}
    )
    assert algo_res.status_code == 200, f"Algo endpoint failed: {algo_res.status_code}"
    algo_data = algo_res.json()

    print(f"   Method: {algo_data.get('method')}")
    for team in algo_data.get("teams", []):
        print(f"   > Team {team['team_id']}: Members={team['members']} | Skill Coverage Score: {team['skill_coverage_score']}%")
    print()

    # 2. LLM ENDPOINT CALL (Using API key if set, or mock fallback)
    print("2. METHOD 2: LLM MATCHING (POST /match-teams-llm — claude-sonnet-4-6)")
    has_api_key = bool(os.getenv("ANTHROPIC_API_KEY"))

    if has_api_key:
        print("   [INFO] Live ANTHROPIC_API_KEY detected. Sending live API request...")
        llm_res = client.post(
            "/match-teams-llm",
            json={"participants": SAMPLE_PARTICIPANTS, "team_size": team_size}
        )
    else:
        print("   [INFO] ANTHROPIC_API_KEY not set in env. Using mock Anthropic response for verification...")
        with patch("app.services.llm_matching.call_anthropic_llm", return_value=MOCK_CLAUDE_RESPONSE):
            llm_res = client.post(
                "/match-teams-llm",
                json={"participants": SAMPLE_PARTICIPANTS, "team_size": team_size}
            )

    assert llm_res.status_code == 200, f"LLM endpoint failed: {llm_res.status_code}"
    llm_data = llm_res.json()

    print(f"   Method: {llm_data.get('method')}")
    for team in llm_data.get("teams", []):
        print(f"   > Team {team['team_id']}: Members={team['members']} | Skill Coverage Score: {team['skill_coverage_score']}%")
        print(f"     Reasoning: \"{team['reasoning']}\"")
    print()

    # 3. DIRECT COMPARISON SUMMARY
    print("3. DIRECT COMPARISON SUMMARY (12 Participants, Team Size = 3):")
    print("   ---------------------------------------------------------------------")
    algo_avg_score = sum(t["skill_coverage_score"] for t in algo_data["teams"]) / len(algo_data["teams"])
    llm_avg_score = sum(t["skill_coverage_score"] for t in llm_data["teams"]) / len(llm_data["teams"])

    print(f"   > Algorithmic Average Skill Coverage Score : {algo_avg_score:.2f}%")
    print(f"   > LLM (Claude-Sonnet-4-6) Average Score    : {llm_avg_score:.2f}%")
    print("   ---------------------------------------------------------------------")

    print("\n=========================================================================")
    print("  [SUCCESS] Both Algorithmic and LLM endpoints verified successfully!")
    print("=========================================================================\n")


if __name__ == "__main__":
    run_comparison_test()
