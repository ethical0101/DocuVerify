import os
import secrets
import sys
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parents[3]
_JWT_SECRET_PATH = BASE_DIR / "data" / ".jwt_secret"

# Makes the repo-root `ml/` package (ml.models.*, ml.training.*, ml.inference.*)
# importable from backend code -- ml/ lives alongside backend/, not inside it, so
# it can also be exercised standalone by scripts/ without importing the API layer.
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def _load_or_create_jwt_secret() -> str:
    """A JWT signing secret persisted to a gitignored local file so tokens survive a
    backend restart. Generated once per install -- never hardcoded, never committed."""
    env_secret = os.getenv("JWT_SECRET")
    if env_secret:
        return env_secret
    _JWT_SECRET_PATH.parent.mkdir(parents=True, exist_ok=True)
    if _JWT_SECRET_PATH.exists():
        return _JWT_SECRET_PATH.read_text().strip()
    secret = secrets.token_hex(32)
    _JWT_SECRET_PATH.write_text(secret)
    return secret


class Settings(BaseSettings):
    app_name: str = "DocuVerify"
    data_dir: Path = BASE_DIR / "data"
    upload_dir: Path = BASE_DIR / "data" / "uploads"
    db_path: Path = BASE_DIR / "data" / "docuverify.db"
    max_upload_mb: int = 25
    allowed_extensions: tuple = (".pdf", ".png", ".jpg", ".jpeg")

    llm_provider: str = os.getenv("LLM_PROVIDER", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "")

    jwt_secret: str = _load_or_create_jwt_secret()

    enterprise_dir: Path = BASE_DIR / "data" / "enterprise"
    max_dataset_mb: int = 100
    max_dataset_files: int = 1000

    cors_origins: list = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.enterprise_dir.mkdir(parents=True, exist_ok=True)
