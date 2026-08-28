"""Whole-image forensic feature vector for the trained authenticity classifier.

Rather than trying to localize a specific edit (which classical heuristics do
unreliably on busy synthetic pages), we summarize the *distribution* of several
compression/noise statistics across the whole document into a fixed feature
vector. A lightweight classifier then learns which combination separates
genuine from forged -- no single feature has to be decisive.

All features are deterministic and depend only on the image, so the same vector
is produced at training time (scripts/train_authenticity_model.py) and at
inference time (pipeline)."""
import io

import cv2
import numpy as np
from PIL import Image

FEATURE_ORDER = [
    "ela_q55_med", "ela_q55_std", "ela_q55_p95",
    "ela_q90_med", "ela_q90_p95",
    "inked_ela_min_ratio", "inked_ela_p10_ratio", "inked_ela_range",
    "noise_std", "highfreq_energy", "lap_var",
]


def _ela(image_rgb: np.ndarray, quality: int) -> np.ndarray:
    pil = Image.fromarray(image_rgb)
    buf = io.BytesIO()
    pil.save(buf, "JPEG", quality=quality)
    buf.seek(0)
    recompressed = np.array(Image.open(buf).convert("RGB"))
    diff = cv2.absdiff(image_rgb, recompressed).astype(np.float32)
    return diff.mean(axis=2)


def extract_features(image_bgr: np.ndarray) -> dict:
    """Returns a dict of named features (see FEATURE_ORDER). Robust to small images."""
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32)
    H, W = gray.shape

    ela55 = _ela(rgb, 55)
    ela90 = _ela(rgb, 90)

    f = {
        "ela_q55_med": float(np.median(ela55)),
        "ela_q55_std": float(ela55.std()),
        "ela_q55_p95": float(np.percentile(ela55, 95)),
        "ela_q90_med": float(np.median(ela90)),
        "ela_q90_p95": float(np.percentile(ela90, 95)),
    }

    # Distribution of ELA over inked windows only (text/edits), relative to the page.
    win, step = 24, 12
    page_ela = float(ela90.mean()) + 1e-6
    inked_ratios = []
    for y in range(0, max(1, H - win), step):
        for x in range(0, max(1, W - win), step):
            gcell = gray[y:y + win, x:x + win]
            if gcell.size == 0 or float((gcell < 128).mean()) < 0.08:
                continue
            inked_ratios.append(float(ela90[y:y + win, x:x + win].mean()) / page_ela)
    if len(inked_ratios) >= 4:
        arr = np.array(inked_ratios)
        f["inked_ela_min_ratio"] = float(arr.min())
        f["inked_ela_p10_ratio"] = float(np.percentile(arr, 10))
        f["inked_ela_range"] = float(arr.max() - arr.min())
    else:
        f["inked_ela_min_ratio"] = 1.0
        f["inked_ela_p10_ratio"] = 1.0
        f["inked_ela_range"] = 0.0

    # Noise-residual std (median-blur residual) and high-frequency energy.
    blur = cv2.medianBlur(image_bgr, 3)
    residual = cv2.cvtColor(cv2.absdiff(image_bgr, blur), cv2.COLOR_BGR2GRAY).astype(np.float32)
    f["noise_std"] = float(residual.std())

    # High-frequency energy via Laplacian; a re-compressed patch is smoother.
    lap = cv2.Laplacian(gray, cv2.CV_32F)
    f["highfreq_energy"] = float(np.abs(lap).mean())
    f["lap_var"] = float(lap.var())

    return f


def feature_vector(image_bgr: np.ndarray) -> list:
    f = extract_features(image_bgr)
    return [f[k] for k in FEATURE_ORDER]
