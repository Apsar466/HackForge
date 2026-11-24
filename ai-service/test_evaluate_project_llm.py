"""
test_evaluate_project_llm.py

Smoke-tests POST /evaluate-project-llm with 3 sample pitches:
  - Project A: mental health journaling AI (original)
  - Project B: almost identical to A (should be flagged)
  - Project C: completely different — blockchain voting (should be original)

Run from ai-service root:
    python test_evaluate_project_llm.py

Requires ANTHROPIC_API_KEY and a running uvicorn server on port 8000.
"""
import json
import sys
import requests

BASE_URL = "http://localhost:8000"

# ── Sample pitches ─────────────────────────────────────────────────────────────
# Public repos used so GitHub stats are guaranteed to be real and fetchable.
PROJECTS = [
    {
        "project_id": "proj-A",
        "team_name": "Team Alpha",
        "pitch_description": (
            "An AI-powered mental health journaling app that detects mood patterns "
            "from daily text entries using NLP and suggests personalized coping strategies "
            "based on cognitive behavioral therapy techniques."
        ),
        "github_repo_url": "https://github.com/expressjs/express",
    },
    {
        "project_id": "proj-B",
        "team_name": "Team Beta",
        "pitch_description": (
            "A mood-tracking journaling application powered by AI that analyzes daily "
            "text for emotional patterns and recommends evidence-based coping strategies "
            "derived from cognitive behavioral therapy."  # Highly similar to A
        ),
        "github_repo_url": "https://github.com/pallets/flask",
    },
    {
        "project_id": "proj-C",
        "team_name": "Team Gamma",
        "pitch_description": (
            "A decentralized voting platform built on Ethereum smart contracts that enables "
            "transparent, tamper-proof governance for DAOs, with real-time vote tallying "
            "and audit trails on-chain."  # Completely different concept
        ),
        "github_repo_url": "https://github.com/django/django",
    },
]

# For each project, the "other_pitches" are the pitches of the OTHER two projects.
OTHER_PITCHES = [
    [PROJECTS[1]["pitch_description"], PROJECTS[2]["pitch_description"]],  # others for A
    [PROJECTS[0]["pitch_description"], PROJECTS[2]["pitch_description"]],  # others for B
    [PROJECTS[0]["pitch_description"], PROJECTS[1]["pitch_description"]],  # others for C
]

PASS_MARK = True


def run_test(project: dict, other_pitches: list[str], idx: int) -> None:
    global PASS_MARK
    payload = {**project, "other_pitches": other_pitches}

    print(f"\n{'='*70}")
    print(f"TEST {idx+1}: {project['team_name']} ({project['project_id']})")
    print(f"Pitch: {project['pitch_description'][:80]}...")
    print(f"Calling POST {BASE_URL}/evaluate-project-llm ...")

    try:
        resp = requests.post(
            f"{BASE_URL}/evaluate-project-llm",
            json=payload,
            timeout=90,
        )
    except requests.exceptions.ConnectionError:
        print("  [ERROR] Could not connect to AI service at http://localhost:8000")
        print("  -> Make sure uvicorn is running: uvicorn main:app --port 8000")
        PASS_MARK = False
        return

    if resp.status_code == 500 and "ANTHROPIC_API_KEY" in resp.text:
        print("  [SKIP] ANTHROPIC_API_KEY not configured — LLM call skipped.")
        print("         Set ANTHROPIC_API_KEY in ai-service/.env and restart to run this test.")
        return

    if resp.status_code != 200:
        print(f"  [FAIL] HTTP {resp.status_code}: {resp.text[:300]}")
        PASS_MARK = False
        return

    data = resp.json()

    print(f"\n  GitHub Stats:")
    stats = data.get("github_stats", {})
    print(f"    Commits         : {stats.get('commit_count')}")
    print(f"    Contributors    : {stats.get('contributors_count')}")
    print(f"    Primary Language: {stats.get('primary_language')}")
    print(f"    Last Commit     : {stats.get('last_commit_date')}")
    print(f"    Activity Score  : {stats.get('github_activity_score')}%")

    print(f"\n  Evaluation Scores:")
    print(f"    Originality Score      : {data.get('originality_score')}")
    print(f"    Technical Effort Score : {data.get('technical_effort_score')}")
    print(f"    Flagged As Similar To  : {data.get('flagged_as_similar_to')}")
    print(f"\n  Summary Feedback:")
    print(f"    \"{data.get('summary_feedback')}\"")

    # Assertions
    if idx == 0:  # Project A — should be original (not flagged or low score)
        if data.get("originality_score", 0) >= 50:
            print("\n  [PASS] Project A: originality_score >= 50 (expected for unique concept)")
        else:
            print(f"\n  [WARN] Project A: originality_score={data.get('originality_score')} may be unexpectedly low")

    if idx == 1:  # Project B — should be flagged as similar to A
        flagged = data.get("flagged_as_similar_to", [])
        if flagged:
            print(f"\n  [PASS] Project B: correctly flagged as similar to: {flagged[0][:60]}...")
        else:
            print("\n  [WARN] Project B: NOT flagged despite high conceptual similarity to Project A")
            print("         (LLM may have missed the overlap — check prompt tuning)")

    if idx == 2:  # Project C — completely different, should not be flagged
        flagged = data.get("flagged_as_similar_to", [])
        if not flagged:
            print("\n  [PASS] Project C: correctly NOT flagged (blockchain vs mental health — distinct concepts)")
        else:
            print(f"\n  [WARN] Project C: unexpectedly flagged: {flagged}")


if __name__ == "__main__":
    print("HackForge AI Service — POST /evaluate-project-llm Test")
    print("=" * 70)
    print(f"Testing against: {BASE_URL}/evaluate-project-llm")
    print(f"Projects: {len(PROJECTS)}")
    print(f"  Project A — original mental health AI journal")
    print(f"  Project B — nearly identical to A (should trigger similarity flag)")
    print(f"  Project C — blockchain voting (completely different, should NOT be flagged)")

    for i, (proj, others) in enumerate(zip(PROJECTS, OTHER_PITCHES)):
        run_test(proj, others, i)

    print(f"\n{'='*70}")
    print("Test run complete.")
    sys.exit(0)
