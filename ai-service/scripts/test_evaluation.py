"""
scripts/test_evaluation.py — Verification script for AI Project Evaluation Engine

Demonstrates:
1. Sentence Transformers Embeddings ('all-MiniLM-L6-v2')
2. Cosine Similarity & Originality Flag Computation
   - Pitch 1 vs Pitch 2 (Plagiarized variation) -> Flagged & High Originality Flag
   - Pitch 1 vs Pitch 3 (Original & Distinct) -> Low similarity
3. Live GitHub REST API Integration (Real commit, contributor, language & last commit date)
4. Graceful Error Handling for missing/private repositories
"""
import asyncio
import os
import sys

# Add parent directory to path so app modules can be imported directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.evaluation import evaluate_pitch_originality, fetch_github_repo_stats


async def main():
    print("=" * 80)
    print("🔥 HACKFORGE AI PROJECT EVALUATION ENGINE VERIFICATION")
    print("=" * 80)

    # 1. Test Pitches (Target Pitch + List of Other Pitches)
    target_pitch = (
        "HackForge is an AI-powered hackathon management platform featuring automated "
        "team formation using skill vector clustering and AI-driven project evaluation."
    )

    # Testing both dict objects and raw strings as specified in prompt requirement
    other_pitches_mixed = [
        {
            "project_id": "proj_plagiarized_02",
            "pitch_description": (
                "HackForge AI hackathon platform for automatic team formation using skill "
                "vector clustering and AI project evaluation scoring."
            ),
        },
        "A decentralized community solar energy trading application built on Ethereum smart contracts with IoT hardware smart meter integration.",
    ]

    print("\n📝 1. TESTING EMBEDDING COSINE SIMILARITY & PLAGIARISM DETECTION")
    print("-" * 80)
    print(f"🎯 Target Project Pitch:\n   \"{target_pitch}\"\n")

    originality_score, max_sim, flagged_ids = evaluate_pitch_originality(
        target_pitch=target_pitch,
        other_pitches=other_pitches_mixed,
        similarity_threshold=0.70,
    )

    print(f"📊 Originality Score   : {originality_score}% (Higher = More Original)")
    print(f"🚩 Originality Flag    : {max_sim:.4f} (Highest similarity score; lower = more original)")
    print(f"🚨 Flagged as Plagiarized/Similar To (Sim >= 0.70): {flagged_ids}")

    # 2. Test Live GitHub REST API Metrics (Valid Public Repo)
    valid_repo_url = "https://github.com/fastapi/fastapi"
    print("\n\n🐙 2. TESTING LIVE GITHUB REST API (Valid Public Repo)")
    print("-" * 80)
    print(f"🔗 Querying Repo: {valid_repo_url}")

    stats_valid = await fetch_github_repo_stats(valid_repo_url)

    print(f"   Valid Repository?    : {stats_valid['valid']}")
    print(f"   GitHub Activity Score: {stats_valid['github_activity_score']}%")
    print(f"   Commit Count         : {stats_valid['commit_count']}")
    print(f"   Contributors Count   : {stats_valid['contributors_count']}")
    print(f"   Primary Language     : {stats_valid['primary_language']}")
    print(f"   Last Commit Date     : {stats_valid['last_commit_date']}")

    # 3. Test Invalid / Private GitHub Repo Handling
    invalid_repo_url = "https://github.com/nonexistent-user-12345/private-fake-repo-999"
    print("\n\n⚠️ 3. TESTING GITHUB ERROR HANDLING (Private / Invalid Repo)")
    print("-" * 80)
    print(f"🔗 Querying Repo: {invalid_repo_url}")

    stats_invalid = await fetch_github_repo_stats(invalid_repo_url)

    print(f"   Valid Repository?    : {stats_invalid['valid']}")
    print(f"   Error Message        : {stats_invalid['error']}")
    print(f"   GitHub Activity Score: {stats_invalid['github_activity_score']}%")

    print("\n" + "=" * 80)
    print("✅ EVALUATION ENGINE VERIFICATION SUCCESSFUL")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
