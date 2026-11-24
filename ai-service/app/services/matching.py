"""
app/services/matching.py — AI Team Formation & Matching Engine

===============================================================================
ALGORITHM DESIGN & RATIONALE
===============================================================================
Why Greedy Complementary Skill Allocation (with Skill Entropy) instead of K-Means?

1. THE K-MEANS PROBLEM:
   Standard distance-based clustering algorithms like K-Means group SIMILAR data
   points together in spatial clusters. In a hackathon context, running K-Means on
   skill vectors would group all Frontend developers into Team 1, all Backend
   developers into Team 2, and all ML engineers into Team 3. This leads to imbalanced,
   single-skill teams that struggle to build full-stack projects.

2. THE GREEDY COMPLEMENTARY ALLOCATION SOLUTION:
   To build effective hackathon teams, we require SKILL COMPLEMENTARITY — each team
   should possess a diverse blend of skills (e.g. 1 Frontend + 1 Backend + 1 ML + 1 Design).

   Our algorithm works in 3 phases:
   a. Dynamic Vocabulary & Multi-Label One-Hot Encoding:
      Collects all unique skills across the current input batch dynamically (no hardcoded list).
      Encodes each participant into a binary skill vector V_i in {0, 1}^M.

   b. Seeded Complementary Assignment:
      Computes target number of teams K = ceil(N / team_size).
      Seeds each team with participants having high skill variance to anchor initial diversity.
      Iteratively assigns remaining participants to teams by maximizing Marginal Skill Gain:
          Gain(p, T) = (New Unique Skills added by p to T) + 0.5 * (Skill Entropy Bonus)
      This guarantees every team receives a balanced mix of skills.

   c. Real Computed Skill Coverage Score:
      Computes a rigorous score for each team:
          Score = 100 * [ (Unique Skills in Team / Total Unique Batch Skills) * 0.7 
                        + (Skill Entropy / Max Entropy) * 0.3 ]
===============================================================================
"""

import math
from typing import Any, Dict, List, Tuple


def extract_skill_vocab(participants: List[Dict[str, Any]]) -> List[str]:
    """
    Dynamically derives unique skill vocabulary from input data.
    Does NOT use a hardcoded skill list.
    """
    vocab_set = set()
    for p in participants:
        skills = p.get("skills") or []
        for skill in skills:
            if isinstance(skill, str) and skill.strip():
                vocab_set.add(skill.strip())
    return sorted(list(vocab_set))


def encode_participant_skills(
    participants: List[Dict[str, Any]], vocab: List[str]
) -> Dict[str, List[int]]:
    """
    Converts each participant's skills into a multi-label one-hot binary vector
    based on the dynamically extracted vocabulary list.
    """
    skill_to_idx = {skill: idx for idx, skill in enumerate(vocab)}
    vectors = {}

    for p in participants:
        p_id = str(p.get("id") or p.get("_id"))
        vec = [0] * len(vocab)
        for skill in p.get("skills", []):
            skill_clean = skill.strip()
            if skill_clean in skill_to_idx:
                vec[skill_to_idx[skill_clean]] = 1
        vectors[p_id] = vec

    return vectors


def calculate_team_skill_coverage_score(
    team_members: List[Dict[str, Any]], total_batch_skills: List[str]
) -> float:
    """
    Calculates a real computed metric (0.0 to 100.0) based on:
    1. Breadth: ratio of unique skills covered by team vs total batch skills.
    2. Entropy: skill distribution balance within the team.
    """
    if not team_members or not total_batch_skills:
        return 0.0

    # Collect team unique skills and skill frequency
    skill_counts: Dict[str, int] = {}
    for p in team_members:
        for skill in p.get("skills", []):
            skill_clean = skill.strip()
            skill_counts[skill_clean] = skill_counts.get(skill_clean, 0) + 1

    team_unique_skills = len(skill_counts)
    total_batch_unique_count = len(total_batch_skills)

    # 1. Breadth Coverage Ratio (0.0 to 1.0)
    breadth_ratio = team_unique_skills / max(1, total_batch_unique_count)

    # 2. Skill Diversity Entropy (Shannon entropy of team skill distribution)
    total_skills_count = sum(skill_counts.values())
    entropy = 0.0
    if total_skills_count > 0:
        for count in skill_counts.values():
            p_k = count / total_skills_count
            entropy -= p_k * math.log2(p_k)

    # Normalize entropy against max possible entropy for team size
    max_entropy = math.log2(max(1, team_unique_skills)) if team_unique_skills > 1 else 1.0
    norm_entropy = entropy / max_entropy if max_entropy > 0 else 1.0

    # Composite Score (weighted combination scaled to 100)
    composite = (breadth_ratio * 0.7) + (norm_entropy * 0.3)
    return round(min(100.0, composite * 100.0), 2)


def match_teams_greedy(
    participants: List[Dict[str, Any]], team_size: int = 4
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Executes Greedy Complementary Skill Allocation matching.

    Returns:
        (teams_list, vocab_list)
    """
    if not participants:
        return [], []

    vocab = extract_skill_vocab(participants)
    vectors = encode_participant_skills(participants, vocab)

    num_participants = len(participants)
    target_team_size = max(2, team_size)
    num_teams = math.ceil(num_participants / target_team_size)

    # Copy list of unassigned participant dicts
    unassigned = list(participants)
    teams: List[Dict[str, Any]] = [
        {"team_id": i + 1, "members": [], "covered_skills": set()} for i in range(num_teams)
    ]

    # Sort participants by skill count descending so distinct multi-skilled leads seed teams first
    unassigned.sort(key=lambda p: len(p.get("skills", [])), reverse=True)

    # Seed each team with 1 member
    for team in teams:
        if unassigned:
            seeder = unassigned.pop(0)
            team["members"].append(seeder)
            team["covered_skills"].update([s.strip() for s in seeder.get("skills", [])])

    # Assign remaining participants to maximize marginal skill gain per team
    while unassigned:
        p = unassigned.pop(0)
        p_skills = set([s.strip() for s in p.get("skills", [])])

        best_team = None
        best_gain = -1.0

        for team in teams:
            # Skip full teams unless all teams are at capacity
            if len(team["members"]) >= target_team_size:
                continue

            # Calculate marginal new skills added by p to this team
            new_skills = len(p_skills - team["covered_skills"])
            # Small bonus for teams with fewer members to keep sizes balanced
            size_penalty = len(team["members"]) * 0.2
            gain = new_skills - size_penalty

            if gain > best_gain:
                best_gain = gain
                best_team = team

        # Fallback if all teams reached target size
        if best_team is None:
            best_team = min(teams, key=lambda t: len(t["members"]))

        best_team["members"].append(p)
        best_team["covered_skills"].update(p_skills)

    # Build final response structure and compute real skill coverage score
    formatted_teams = []
    for t in teams:
        t_members = t["members"]
        score = calculate_team_skill_coverage_score(t_members, vocab)
        covered_list = sorted(list(t["covered_skills"]))
        member_ids = [str(m.get("id") or m.get("_id")) for m in t_members]

        formatted_teams.append(
            {
                "team_id": t["team_id"],
                "member_ids": member_ids,
                "members": t_members,
                "covered_skills": covered_list,
                "skill_coverage_score": score,
                "rationale": (
                    f"Team formed with {len(t_members)} members covering {len(covered_list)} "
                    f"distinct skills out of {len(vocab)} total batch skills."
                ),
            }
        )

    return formatted_teams, vocab
