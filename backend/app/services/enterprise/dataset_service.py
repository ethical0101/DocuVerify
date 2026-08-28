"""Safe ZIP dataset ingestion for enterprise training.

Uploaded ZIPs are untrusted input. This module extracts them defensively (path-
traversal guard, extension allowlist, per-file and total size caps, member-count
cap) into an organization-scoped directory, then validates the result before it's
eligible for training: expects a `genuine/` and/or `forged/` subfolder of images,
optionally a `metadata.csv` with forgery-type/region ground truth.

Never executes, imports, or deserializes anything from the ZIP -- it is only ever
treated as a bag of image files (and one optional CSV) to be opened with Pillow."""
import csv
import io
import zipfile
from pathlib import Path

from PIL import Image

from app.core.config import settings

ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg"}
ALLOWED_ZIP_MEMBER_EXT = ALLOWED_IMAGE_EXT | {".csv"}


class DatasetValidationError(Exception):
    pass


def safe_extract_zip(zip_bytes: bytes, dest_dir: Path) -> None:
    """Extracts a dataset ZIP with standard zip-slip and resource-exhaustion
    protections. Raises DatasetValidationError on anything suspicious rather than
    partially extracting -- a rejected dataset is safer than a "mostly fine" one."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile:
        raise DatasetValidationError("Not a valid ZIP file")

    members = zf.infolist()
    if len(members) > settings.max_dataset_files:
        raise DatasetValidationError(f"Too many files in archive ({len(members)} > {settings.max_dataset_files})")

    total_uncompressed = sum(m.file_size for m in members)
    if total_uncompressed > settings.max_dataset_mb * 1024 * 1024:
        raise DatasetValidationError(f"Dataset too large when extracted ({total_uncompressed / 1e6:.0f}MB)")

    dest_resolved = dest_dir.resolve()
    for member in members:
        if member.is_dir():
            continue
        name = member.filename.replace("\\", "/")
        if name.startswith("/") or ".." in Path(name).parts:
            raise DatasetValidationError(f"Unsafe path in archive: {name}")
        ext = Path(name).suffix.lower()
        if ext not in ALLOWED_ZIP_MEMBER_EXT:
            continue  # silently skip anything that isn't an image or the metadata CSV
        target = (dest_dir / name).resolve()
        if not str(target).startswith(str(dest_resolved)):
            raise DatasetValidationError(f"Path traversal attempt: {name}")
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member) as src, open(target, "wb") as out:
            out.write(src.read())


def _resolve_dataset_root(extracted_dir: Path) -> Path:
    """ZIPs commonly wrap their contents in one top-level folder (e.g.
    organization_demo_dataset.zip containing organization_demo_dataset/genuine/...).
    If genuine/forged aren't directly under extracted_dir but there's exactly one
    subdirectory, descend into it -- otherwise use extracted_dir as-is."""
    if (extracted_dir / "genuine").exists() or (extracted_dir / "forged").exists():
        return extracted_dir
    subdirs = [p for p in extracted_dir.iterdir() if p.is_dir()]
    if len(subdirs) == 1 and ((subdirs[0] / "genuine").exists() or (subdirs[0] / "forged").exists()):
        return subdirs[0]
    return extracted_dir


def validate_dataset(extracted_dir: Path) -> dict:
    """Scans the extracted dataset and returns a report. Never raises for a
    merely-imperfect dataset (e.g. class imbalance) -- only for something training
    genuinely cannot proceed with (no images at all, or every image corrupted)."""
    extracted_dir = _resolve_dataset_root(extracted_dir)
    genuine_dir = extracted_dir / "genuine"
    forged_dir = extracted_dir / "forged"

    genuine_files = _list_images(genuine_dir)
    forged_files = _list_images(forged_dir)

    corrupted = []
    for f in genuine_files + forged_files:
        try:
            with Image.open(f) as img:
                img.verify()
        except Exception:
            corrupted.append(str(f.relative_to(extracted_dir)))

    forgery_type_counts: dict[str, int] = {}
    metadata_path = extracted_dir / "metadata.csv"
    if metadata_path.exists():
        with open(metadata_path, newline="", encoding="utf-8", errors="ignore") as f:
            for row in csv.DictReader(f):
                if (row.get("label") or "").strip().lower() != "forged":
                    continue
                ftype = (row.get("forgery_type") or "unspecified").strip() or "unspecified"
                forgery_type_counts[ftype] = forgery_type_counts.get(ftype, 0) + 1

    checks = [
        {"label": f"{len(genuine_files) + len(forged_files)} images detected",
         "passed": (len(genuine_files) + len(forged_files)) > 0},
        {"label": f"{len(genuine_files)} genuine", "passed": len(genuine_files) > 0},
        {"label": f"{len(forged_files)} forged", "passed": len(forged_files) > 0},
        {"label": "Supported formats (PNG/JPG)", "passed": True},
        {"label": f"No corrupted images ({len(corrupted)} found)", "passed": len(corrupted) == 0},
        {"label": "Minimum 10 samples per class for training", "passed": min(len(genuine_files), len(forged_files)) >= 10},
    ]
    ready = all(c["passed"] for c in checks[:3]) and len(corrupted) < len(genuine_files) + len(forged_files)

    return {
        "genuine_count": len(genuine_files), "forged_count": len(forged_files),
        "corrupted_files": corrupted, "forgery_type_counts": forgery_type_counts,
        "checks": checks, "ready_for_training": ready,
        "genuine_paths": [str(p) for p in genuine_files if str(p.relative_to(extracted_dir)) not in corrupted],
        "forged_paths": [str(p) for p in forged_files if str(p.relative_to(extracted_dir)) not in corrupted],
    }


def _list_images(directory: Path) -> list[Path]:
    if not directory.exists():
        return []
    return sorted(p for p in directory.iterdir() if p.suffix.lower() in ALLOWED_IMAGE_EXT)
