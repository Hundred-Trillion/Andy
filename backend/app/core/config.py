"""ANDY v1 — Application configuration."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment variables / .env file."""

    # ── OpenRouter LLM ─────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL_NAME: str = "google/gemini-2.0-flash-exp:free"

    # ── Qdrant ─────────────────────────────────────────────
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "aerospace_knowledge"

    # ── Paths ──────────────────────────────────────────────
    GENERATED_DIR: str = str(Path(__file__).resolve().parents[2] / "generated")
    DATA_DIR: str = str(Path(__file__).resolve().parents[2] / "data" / "aerospace_docs")

    model_config = {"env_file": str(Path(__file__).resolve().parents[3] / ".env"), "extra": "ignore"}


settings = Settings()

# Ensure generated dir exists
Path(settings.GENERATED_DIR).mkdir(parents=True, exist_ok=True)
