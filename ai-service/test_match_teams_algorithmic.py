"""
test_match_teams_algorithmic.py

Test script demonstrating POST /match-teams-algorithmic with 12 sample participants
having mixed skills (Frontend, Backend, ML, Design, UI/UX).

Run with:
    python test_match_teams_algorithmic.py
"""
import json
import os
import sys
from fastapi.testclient import TestClient

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from main import app
from app.services.matching import extract_skill_vocab, encode_participant_skills, match_teams_greedy

# ── 12 Sample Participants (Mixed Skills: Frontend, Backend, ML, Design, UI/UX) ──
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


def test_algorithmic_matching():
    print("\n=========================================================================")
    print("  HACKFORGE AI SERVICE — ALGORITHMIC TEAM MATCHING TEST SCRIPT")
    print("=========================================================================\n")

    # 1. Derived Skill Vocabulary (Dynamic)
    vocab = extract_skill_vocab(SAMPLE_PARTICIPANTS)
    print(f"1. DYNAMICALLY DERIVED SKILL VOCABULARY ({len(vocab)} unique skills):")
    print(f"   {vocab}\n")

    # 2. Multi-Label One-Hot Encoding
    vectors = encode_participant_skills(SAMPLE_PARTICIPANTS, vocab)
    print("2. MULTI-LABEL ONE-HOT ENCODING (Sample Participant Vectors):")
    for p in SAMPLE_PARTICIPANTS[:3]:
        p_id = p["id"]
        vec = vectors[p_id]
        active_skills = [vocab[i] for i, val in enumerate(vec) if val == 1]
        print(f"   [{p_id}] {p['name']} ({len(active_skills)} skills): {vec[:10]}... => {active_skills}")
    print()

    # 3. Direct Service Algorithm Execution
    team_size = 3
    teams_result, _ = match_teams_greedy(SAMPLE_PARTICIPANTS, team_size=team_size)
    print(f"3. GREEDY COMPLEMENTARY ALLOCATION ALGORITHM RESULTS (Team Size = {team_size}):")
    print("   ---------------------------------------------------------------------")
    for team in teams_result:
        members_str = ", ".join([f"{m['name']} ({m['id']})" for m in team["members"]])
        skills_str = ", ".join(team["covered_skills"])
        print(f"   > Team {team['team_id']}:")
        print(f"     Members       : {members_str}")
        print(f"     Skills Covered: [{skills_str}]")
        print(f"     Coverage Score: {team['skill_coverage_score']}%\n")

    # 4. FastAPI Endpoint Call via TestClient
    print("4. FASTAPI ENDPOINT (POST /match-teams-algorithmic) INTEGRATION TEST:")
    client = TestClient(app)
    response = client.post(
        "/match-teams-algorithmic",
        json={
            "participants": SAMPLE_PARTICIPANTS,
            "team_size": team_size
        }
    )

    print(f"   HTTP Status Code: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    json_data = response.json()
    print("   Response JSON Payload:")
    print(json.dumps(json_data, indent=4))

    print("\n=========================================================================")
    print("  [SUCCESS] VERIFICATION SUCCESSFUL: Real-time dynamic vectors & scores calculated!")
    print("=========================================================================\n")


if __name__ == "__main__":
    test_algorithmic_matching()
