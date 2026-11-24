"""
app/core/config.py
Centralised settings loaded from environment variables via pydantic-settings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    env: str = "development"
    log_level: str = "info"

    # Restrict CORS in production to the backend's internal hostname.
    cors_origins: list[str] = [
        "http://localhost:4000",   # backend (dev)
        "http://backend:4000",     # backend (docker)
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
