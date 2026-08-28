"""Loads a validated enterprise dataset (see app/services/enterprise/dataset_service.py)
into (image_path, label) pairs ready for feature extraction. Label convention:
forged=1, genuine=0 -- EnterpriseDocumentClassifier.predict_risk() assumes this."""
from __future__ import annotations

from pathlib import Path


def load_dataset_paths(genuine_paths: list[str], forged_paths: list[str]) -> list[tuple[Path, int]]:
    items = [(Path(p), 0) for p in genuine_paths] + [(Path(p), 1) for p in forged_paths]
    return items
