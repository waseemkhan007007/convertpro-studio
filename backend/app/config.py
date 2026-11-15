"""Central configuration. Values come from environment variables or the .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> parents[2] is the project root (convertpro-studio/)
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ConvertPro Studio"
    app_version: str = "0.1.0"
    environment: str = "local"
    log_level: str = "INFO"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    storage_dir: Path = BASE_DIR / "storage"
    max_upload_mb: int = 100
    max_video_upload_mb: int = 500
    file_retention_minutes: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
