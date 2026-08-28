"""Optional object-storage backing for uploaded documents.

Local disk on most PaaS containers is ephemeral -- it resets on every
restart/redeploy, which silently deletes any document a user just uploaded.
When R2_* env vars are configured, uploaded files are written to a Cloudflare
R2 bucket (S3-compatible) instead, keyed as "r2://<key>" in Document.stored_path,
and transparently re-downloaded to a local temp file whenever the pipeline
needs an actual filesystem Path to open with cv2/PyMuPDF/Pillow.

With no R2_* env vars set (the local-dev default), this module is a no-op
pass-through and documents are stored exactly as before -- a plain local path
under settings.upload_dir.
"""
import os
import tempfile
from pathlib import Path

from app.core.config import settings

_R2_PREFIX = "r2://"

_R2_BUCKET = os.getenv("R2_BUCKET")
_R2_ENDPOINT = os.getenv("R2_ENDPOINT")  # e.g. https://<account_id>.r2.cloudflarestorage.com
_R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID")
_R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY")

_R2_ENABLED = bool(_R2_BUCKET and _R2_ENDPOINT and _R2_ACCESS_KEY_ID and _R2_SECRET_ACCESS_KEY)

_cache_dir = Path(tempfile.gettempdir()) / "docuverify-r2-cache"

_client = None


def _r2_client():
    global _client
    if _client is None:
        import boto3
        _client = boto3.client(
            "s3",
            endpoint_url=_R2_ENDPOINT,
            aws_access_key_id=_R2_ACCESS_KEY_ID,
            aws_secret_access_key=_R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
    return _client


def save_upload(local_path: Path, key: str) -> str:
    """Persists an already-written local file and returns the value to store in
    Document.stored_path. Uploads to R2 (returning "r2://<key>") when configured;
    otherwise returns the local path unchanged."""
    if not _R2_ENABLED:
        return str(local_path)
    _r2_client().upload_file(str(local_path), _R2_BUCKET, key)
    return f"{_R2_PREFIX}{key}"


def resolve_local_path(stored_path: str) -> Path:
    """Given a Document.stored_path value, returns a local filesystem Path the
    pipeline can open -- downloading from R2 into a cache dir on first access
    if needed. A no-op Path(...) wrap for plain local paths (R2 disabled, or an
    older document stored before R2 was configured)."""
    if not stored_path.startswith(_R2_PREFIX):
        return Path(stored_path)

    key = stored_path[len(_R2_PREFIX):]
    cached = _cache_dir / key
    if cached.exists():
        return cached
    cached.parent.mkdir(parents=True, exist_ok=True)
    _r2_client().download_file(_R2_BUCKET, key, str(cached))
    return cached


def is_enabled() -> bool:
    return _R2_ENABLED
