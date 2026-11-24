"""
app/services/evaluation.py — AI Project Evaluation & Plagiarism Detection Engine

===============================================================================
FEATURES:
1. Pitch Embedding & Cosine Similarity:
   Uses `sentence-transformers` ('all-MiniLM-L6-v2') to convert project pitch
   descriptions into 384-dimensional dense semantic vectors. Computes pairwise
   Cosine Similarity to identify plagiarized or highly similar pitches.
   
2. Live GitHub REST API Integration (via python `requests` library):
   Fetches real repository statistics from `api.github.com`:
   - Commit count
   - Contributor count
   - Primary language
   - Last commit date
   - Calculates a computed `github_activity_score`

3. Terminal Verification Logging:
   Prints actual vector lengths, cosine similarity values, and GitHub API response statuses.
===============================================================================
"""

import math
import re
from typing import Any, Dict, List, Optional, Tuple
import requests

# Lazy-loaded sentence-transformer model instance
_model_instance = None


def get_embedding_model():
    """
    Lazy loader for sentence-transformers model 'all-MiniLM-L6-v2'.
    Falls back to a TF-IDF / term-vector fallback if sentence-transformers is loading.
    """
    global _model_instance
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("[AI Engine] Loading sentence-transformers model 'all-MiniLM-L6-v2'...")
            _model_instance = SentenceTransformer("all-MiniLM-L6-v2")
            print("[AI Engine] Model 'all-MiniLM-L6-v2' loaded successfully!")
        except Exception as e:
            print(f"[AI Engine Warning] Could not load sentence-transformers model: {e}")
            _model_instance = "FALLBACK"
    return _model_instance


def compute_vector(text: str) -> List[float]:
    """
    Computes a dense vector embedding for a given text string using sentence-transformers.
    """
    model = get_embedding_model()
    if model != "FALLBACK" and hasattr(model, "encode"):
        embedding = model.encode(text, convert_to_numpy=True)
        vec = embedding.tolist()
        return vec

    # Fallback term-frequency vectorizer if model not available
    words = re.findall(r"\w+", text.lower())
    freq: Dict[str, float] = {}
    for w in words:
        freq[w] = freq.get(w, 0.0) + 1.0
    norm = math.sqrt(sum(v * v for v in freq.values())) or 1.0
    vec = [0.0] * 64
    for word, count in freq.items():
        idx = abs(hash(word)) % 64
        vec[idx] += count / norm
    return vec


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates exact cosine similarity between two numeric vectors.
    Returns float in range [0.0, 1.0].
    """
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    sim = dot_product / (norm1 * norm2)
    return max(0.0, min(1.0, float(sim)))


def evaluate_pitch_originality(
    target_pitch: str,
    other_pitches: List[Any],
    similarity_threshold: float = 0.70,
) -> Tuple[float, float, List[str]]:
    """
    Computes similarity between target pitch and other event pitches.

    Returns:
        (originality_score, max_similarity_score, flagged_project_ids)
    """
    if not target_pitch:
        return 100.0, 0.0, []

    target_vec = compute_vector(target_pitch)
    print(f"\n[AI Evaluation Log] Target pitch: \"{target_pitch[:60]}...\"")
    print(f"[AI Evaluation Log] Generated dense embedding vector length: {len(target_vec)} floats")

    if not other_pitches:
        print("[AI Evaluation Log] No other pitches submitted yet. Originality = 100.0%")
        return 100.0, 0.0, []

    max_sim = 0.0
    flagged_ids = []

    for idx, item in enumerate(other_pitches):
        if isinstance(item, str):
            other_id = f"pitch_{idx + 1}"
            other_text = item
        elif isinstance(item, dict):
            other_id = str(item.get("project_id") or item.get("id") or f"pitch_{idx + 1}")
            other_text = item.get("pitch_description") or item.get("pitch") or ""
        else:
            other_id = getattr(item, "project_id", f"pitch_{idx + 1}")
            other_text = getattr(item, "pitch_description", "")

        if not str(other_text).strip():
            continue

        other_vec = compute_vector(str(other_text))
        sim = cosine_similarity(target_vec, other_vec)

        print(f"[AI Evaluation Log] Comparing vs '{other_id}': Cosine Similarity = {sim:.4f}")

        if sim > max_sim:
            max_sim = sim

        if sim >= similarity_threshold:
            flagged_ids.append(other_id)
            print(f"[AI Evaluation Log] *** PLAGIARISM WARNING: Pitch '{other_id}' similarity {sim:.4f} >= threshold {similarity_threshold}")

    # originality_score: 100% when completely unique (similarity 0.0), lower when similar
    originality_score = round(max(0.0, (1.0 - max_sim) * 100.0), 2)
    max_sim_score = round(max_sim, 4)

    print(f"[AI Evaluation Log] RESULT: Max Cosine Similarity = {max_sim_score:.4f} -> Originality Score = {originality_score}%\n")

    return originality_score, max_sim_score, flagged_ids


def parse_github_repo_owner_name(repo_url: str) -> Optional[Tuple[str, str]]:
    """
    Extracts (owner, repo_name) from URLs like 'https://github.com/owner/repo'.
    """
    if not repo_url:
        return None

    cleaned = repo_url.strip().rstrip("/")
    match = re.search(r"github\.com/([^/]+)/([^/]+)", cleaned, re.IGNORECASE)
    if match:
        owner = match.group(1)
        repo = match.group(2).replace(".git", "")
        return owner, repo
    return None


async def fetch_github_repo_stats(github_repo_url: str) -> Dict[str, Any]:
    """
    Queries live GitHub REST API via Python `requests` library to fetch commits,
    contributors, primary language, and last commit date.
    """
    parsed = parse_github_repo_owner_name(github_repo_url)
    if not parsed:
        print(f"[GitHub API Log] Invalid repository URL format: {github_repo_url}")
        return {
            "valid": False,
            "error": "Invalid GitHub repository URL format. Example: https://github.com/owner/repo",
            "github_activity_score": 0.0,
            "commit_count": 0,
            "contributors_count": 0,
            "primary_language": "Unknown",
            "last_commit_date": None,
        }

    owner, repo = parsed
    headers = {"User-Agent": "HackForge-AI-Service/1.0", "Accept": "application/vnd.github.v3+json"}

    try:
        # 1. Fetch Repo Main Details via requests library
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        print(f"[GitHub API Log] Executing requests.get(\"{api_url}\")...")
        repo_res = requests.get(api_url, headers=headers, timeout=10.0)

        print(f"[GitHub API Log] GitHub REST API Response: HTTP Status {repo_res.status_code}")

        if repo_res.status_code == 404:
            return {
                "valid": False,
                "error": f"Repository '{owner}/{repo}' not found or is private.",
                "github_activity_score": 0.0,
                "commit_count": 0,
                "contributors_count": 0,
                "primary_language": "Unknown",
                "last_commit_date": None,
            }
        elif repo_res.status_code != 200:
            return {
                "valid": False,
                "error": f"GitHub API error HTTP {repo_res.status_code}: {repo_res.text[:100]}",
                "github_activity_score": 0.0,
                "commit_count": 0,
                "contributors_count": 0,
                "primary_language": "Unknown",
                "last_commit_date": None,
            }

        repo_data = repo_res.json()
        primary_language = repo_data.get("language") or "Unknown"

        # 2. Fetch Contributors Count
        contrib_url = f"https://api.github.com/repos/{owner}/{repo}/contributors?per_page=100"
        contrib_res = requests.get(contrib_url, headers=headers, timeout=10.0)
        contributors_count = len(contrib_res.json()) if contrib_res.status_code == 200 and isinstance(contrib_res.json(), list) else 1

        # 3. Fetch Commits Count & Last Commit Date
        commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=100"
        commits_res = requests.get(commits_url, headers=headers, timeout=10.0)
        commit_count = 0
        last_commit_date = None

        if commits_res.status_code == 200 and isinstance(commits_res.json(), list):
            commits_list = commits_res.json()
            commit_count = len(commits_list)
            if commits_list:
                last_commit_date = (
                    commits_list[0].get("commit", {}).get("committer", {}).get("date")
                )

        # Calculate real GitHub activity score based on metrics
        # Commits (up to 50 pts) + Contributors (up to 30 pts) + Recency (20 pts)
        commit_pts = min(50.0, commit_count * 2.5)
        contrib_pts = min(30.0, contributors_count * 10.0)
        recency_pts = 20.0 if last_commit_date else 0.0
        activity_score = round(min(100.0, commit_pts + contrib_pts + recency_pts), 2)

        print(
            f"[GitHub API Log] Live Metrics fetched for '{owner}/{repo}': "
            f"Commits={commit_count}, Contributors={contributors_count}, "
            f"Language='{primary_language}', Last Commit='{last_commit_date}' -> Activity Score={activity_score}%\n"
        )

        return {
            "valid": True,
            "error": None,
            "github_activity_score": activity_score,
            "commit_count": commit_count,
            "contributors_count": contributors_count,
            "primary_language": primary_language,
            "last_commit_date": last_commit_date,
        }

    except Exception as err:
        print(f"[GitHub API Log Error] Connection error: {str(err)}")
        return {
            "valid": False,
            "error": f"Failed to connect to GitHub API: {str(err)}",
            "github_activity_score": 0.0,
            "commit_count": 0,
            "contributors_count": 0,
            "primary_language": "Unknown",
            "last_commit_date": None,
        }
