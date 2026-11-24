"""
app/api/health.py
Health check endpoint — used by Docker, load balancers, and the backend's
/api/ai/health proxy route to verify this service is alive.
"""
import platform
from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Health check")
async def health_check():
    return {
        "success":   True,
        "service":   "hackforge-ai-service",
        "message":   "AI service is healthy 🟢",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python":    platform.python_version(),
    }
