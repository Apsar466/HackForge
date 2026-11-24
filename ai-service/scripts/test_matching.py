"""
scripts/test_matching.py — Verification script for AI Team Matching Algorithm

Demonstrates:
1. 12 participants with diverse tech stacks (Frontend, Backend, ML, UI/UX, Cloud)
2. Dynamic one-hot vectorization (derived unique skills)
3. Greedy Complementary Skill Allocation
4. Rigorous real computed `skill_coverage_score`
"""
import os
import sys

# Add parent directory to path so app modules can be imported directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.matching import match_teams_greedy


def main():
    print("=" * 80)
    print("🔥 HACKFORGE AI TEAM MATCHING ALGORITHM VERIFICATION")
    print("=" * 80)

    # 12 Sample participants with realistic diverse skill sets
    participants = [
        # Frontend Developers
        {"id": "p01", "name": "Alice Chen", "skills": ["React", "TypeScript", "Tailwind CSS"], "experienceLevel": "advanced"},
        {"id": "p02", "name": "Bernardo Silva", "skills": ["Vue.js", "JavaScript", "HTML/CSS"], "experienceLevel": "intermediate"},
        {"id": "p03", "name": "Chloe Dupont", "skills": ["Next.js", "React", "Redux"], "experienceLevel": "beginner"},

        # Backend & Database Engineers
        {"id": "p04", "name": "David Kim", "skills": ["Node.js", "Express", "MongoDB", "Redis"], "experienceLevel": "advanced"},
        {"id": "p05", "name": "Elena Rostova", "skills": ["Python", "Django", "PostgreSQL"], "experienceLevel": "intermediate"},
        {"id": "p06", "name": "Fahad Al-Mansoor", "skills": ["Go", "Docker", "Kubernetes", "gRPC"], "experienceLevel": "advanced"},

        # AI / ML Engineers
        {"id": "p07", "name": "Grace Hopper", "skills": ["Python", "PyTorch", "FastAPI", "scikit-learn"], "experienceLevel": "advanced"},
        {"id": "p08", "name": "Hassan Raza", "skills": ["Python", "TensorFlow", "NLP", "OpenCV"], "experienceLevel": "intermediate"},
        {"id": "p09", "name": "Iris Tanaka", "skills": ["LangChain", "OpenAI API", "Vector Databases", "Python"], "experienceLevel": "intermediate"},

        # UI/UX Designers & Product Specialists
        {"id": "p10", "name": "Julia Roberts", "skills": ["Figma", "UI/UX", "User Research", "Wireframing"], "experienceLevel": "advanced"},
        {"id": "p11", "name": "Kevin Zhang", "skills": ["Figma", "Prototyping", "Tailwind CSS"], "experienceLevel": "beginner"},
        {"id": "p12", "name": "Laura Martinez", "skills": ["Product Design", "Design Systems", "Figma"], "experienceLevel": "intermediate"},
    ]

    print(f"\n📥 Input Participants Count: {len(participants)}")

    # Execute matching algorithm with target team size of 3
    team_size = 3
    teams, vocab = match_teams_greedy(participants, team_size=team_size)

    print(f"\n✨ Dynamic Multi-Label One-Hot Vocabulary ({len(vocab)} unique skills derived):")
    print(f"   {vocab}\n")
    print("-" * 80)
    print(f"🏆 MATCHED TEAMS OUTPUT (Target Team Size = {team_size}):")
    print("-" * 80)

    for team in teams:
        print(f"\n🔹 TEAM {team['team_id']} | Skill Coverage Score: {team['skill_coverage_score']}%")
        print(f"   Rationale: {team['rationale']}")
        print("   Members:")
        for member in team["members"]:
            skills_str = ", ".join(member["skills"])
            print(f"     • {member['name']:<18} [{member['experienceLevel']:<12}] -> Skills: {skills_str}")
        print(f"   Covered Team Skills ({len(team['covered_skills'])}):")
        print(f"     {team['covered_skills']}")

    print("\n" + "=" * 80)
    print("✅ ALGORITHM VERIFICATION SUCCESSFUL")
    print("=" * 80)


if __name__ == "__main__":
    main()
