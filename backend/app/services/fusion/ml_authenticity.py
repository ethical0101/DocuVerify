"""Trained authenticity classifier (RandomForest over whole-image forensic
features). This is the primary genuine/forged signal: unlike the individual
heuristic detectors -- which on the synthetic dataset barely separate the two
classes -- the trained model combines several weak features (ELA distribution
over inked regions, noise-residual std, high-frequency energy) into a signal
that reaches ROC-AUC ~0.87 on the held-out test split (see
ml/models/authenticity_rf_report.json, trained by scripts/train_authenticity_model.py).

If the model artifact is missing, this returns None and the pipeline falls back
to the transparent heuristic fusion -- the product still works, just weaker."""
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.services.visual_forensics.image_features import feature_vector


@lru_cache(maxsize=1)
def _load_model():
    import pickle
    model_path = Path(__file__).resolve().parents[4] / "ml" / "models" / "authenticity_rf.pkl"
    if not model_path.exists():
        return None
    with open(model_path, "rb") as f:
        return pickle.load(f)


def ml_forged_probability(image_bgr: np.ndarray) -> float | None:
    """Returns the trained model's probability that the document is forged (0-1),
    or None if no model is available."""
    bundle = _load_model()
    if bundle is None:
        return None
    model = bundle["model"]
    try:
        x = [feature_vector(image_bgr)]
        return float(model.predict_proba(x)[0][1])
    except Exception:
        return None
