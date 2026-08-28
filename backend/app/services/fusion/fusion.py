"""Transparent weighted evidence-fusion. Each engine reports a 0-1 anomaly
score; this combines them into a single risk assessment using fixed,
documented weights (see docs/methodology.md). This is a heuristic baseline,
not a scientifically validated formula -- documented as such throughout.

An optional trained Logistic Regression fusion model (scripts/train_fusion_model.py)
scored better than this heuristic on our validation split (val AUC 0.64 vs. an
effectively-chance heuristic baseline -- see MODEL_CARD.md for the honest numbers).
It is NOT wired in as the default here: with only 224 training documents its
coefficients are unstable (two of five features land at zero weight), so the
transparent, always-available heuristic remains the production default. Use
`load_ml_fusion_model()` / `fuse_evidence_ml()` directly (e.g. from an evaluation
script) to compare against it."""
from functools import lru_cache

WEIGHTS = {
    "visual_anomaly": 0.30,
    "typography_anomaly": 0.20,
    "layout_anomaly": 0.15,
    "metadata_anomaly": 0.10,
    "semantic_anomaly": 0.25,
}


def fuse_evidence(signals: dict, corroboration_bonus: float = 0.0) -> dict:
    """corroboration_bonus: a small additive bump (0-~0.1) applied when two or more
    INDEPENDENT engines flagged overlapping regions of the page (see evidence.py's
    build_evidence_list) -- two agreeing signals in the same spot is stronger evidence
    than either alone, which a plain weighted average of per-engine scores can't express
    on its own."""
    weighted_sum = 0.0
    total_weight = 0.0
    for key, weight in WEIGHTS.items():
        value = signals.get(key)
        if value is None:
            continue
        weighted_sum += value * weight
        total_weight += weight

    risk_score = (weighted_sum / total_weight) if total_weight > 0 else 0.0
    risk_score = min(1.0, risk_score + corroboration_bonus)
    authenticity_score = round((1 - risk_score) * 100, 1)
    forensic_risk = round(risk_score * 100, 1)

    if risk_score < 0.30:
        risk_level = "LOW"
    elif risk_score < 0.55:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Assessment confidence reflects how MUCH of the total possible evidence weight
    # actually contributed a signal -- e.g. a blurry/low-quality scan that starves OCR
    # (and everything downstream of it) should lower confidence, not manufacture risk.
    confidence = round(min(1.0, total_weight / sum(WEIGHTS.values())) * 100, 1)

    return {
        "authenticity_score": authenticity_score,
        "forensic_risk": forensic_risk,
        "risk_level": risk_level,
        "confidence": confidence,
        "risk_score": round(risk_score, 3),
        "signals": signals,
        "weights": WEIGHTS,
        "corroboration_bonus": round(corroboration_bonus, 3),
    }


@lru_cache(maxsize=1)
def load_ml_fusion_model():
    import pickle
    from pathlib import Path
    model_path = Path(__file__).resolve().parents[4] / "ml" / "models" / "fusion_lr.pkl"
    if not model_path.exists():
        return None
    with open(model_path, "rb") as f:
        return pickle.load(f)


def fuse_evidence_ml(signals: dict) -> dict | None:
    """Same output shape as fuse_evidence(), scored by the trained Logistic Regression
    fusion model instead of the fixed heuristic weights. Returns None if no model has
    been trained yet (run scripts/train_fusion_model.py) -- callers should fall back to
    fuse_evidence() in that case."""
    bundle = load_ml_fusion_model()
    if bundle is None:
        return None
    model, feature_order = bundle["model"], bundle["feature_order"]
    x = [[signals.get(k) or 0.0 for k in feature_order]]
    risk_score = float(model.predict_proba(x)[0][1])
    authenticity_score = round((1 - risk_score) * 100, 1)
    risk_level = "LOW" if risk_score < 0.30 else "MEDIUM" if risk_score < 0.55 else "HIGH"
    return {
        "authenticity_score": authenticity_score, "risk_level": risk_level,
        "confidence": round(max(risk_score, 1 - risk_score) * 100, 1),
        "risk_score": round(risk_score, 3), "signals": signals, "model": "fusion_lr_v0.1",
    }


def diagnose_forgery_types(evidence: dict) -> list:
    types = []
    if (evidence.get("visual_anomaly") or 0) > 0.5:
        types.append("visual_manipulation")
    if (evidence.get("typography_anomaly") or 0) > 0.5:
        types.append("typography_inconsistency")
    if (evidence.get("layout_anomaly") or 0) > 0.5:
        types.append("structural_anomaly")
    if (evidence.get("metadata_anomaly") or 0) > 0.5:
        types.append("metadata_anomaly")
    if (evidence.get("semantic_anomaly") or 0) > 0.5:
        types.append("semantic_inconsistency")
    return types
