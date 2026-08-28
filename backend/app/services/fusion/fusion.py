"""Transparent weighted evidence-fusion. Each engine reports a 0-1 anomaly
score; this combines them into a single risk assessment using fixed,
documented weights (see docs/methodology.md). This is a heuristic baseline,
not a scientifically validated formula -- documented as such throughout."""

WEIGHTS = {
    "visual_anomaly": 0.30,
    "typography_anomaly": 0.20,
    "layout_anomaly": 0.15,
    "metadata_anomaly": 0.10,
    "semantic_anomaly": 0.25,
}


def fuse_evidence(signals: dict) -> dict:
    weighted_sum = 0.0
    total_weight = 0.0
    for key, weight in WEIGHTS.items():
        value = signals.get(key)
        if value is None:
            continue
        weighted_sum += value * weight
        total_weight += weight

    risk_score = (weighted_sum / total_weight) if total_weight > 0 else 0.0
    authenticity_score = round((1 - risk_score) * 100, 1)

    if risk_score < 0.30:
        risk_level = "LOW"
    elif risk_score < 0.55:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Confidence reflects how many independent signals actually contributed
    confidence = round(min(1.0, total_weight / sum(WEIGHTS.values())) * 100, 1)

    return {
        "authenticity_score": authenticity_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "risk_score": round(risk_score, 3),
        "signals": signals,
        "weights": WEIGHTS,
    }


def diagnose_forgery_types(evidence: dict) -> list:
    types = []
    if evidence.get("visual_anomaly", 0) > 0.5:
        types.append("visual_manipulation")
    if evidence.get("typography_anomaly", 0) > 0.5:
        types.append("typography_inconsistency")
    if evidence.get("layout_anomaly", 0) > 0.5:
        types.append("structural_anomaly")
    if evidence.get("metadata_anomaly", 0) > 0.5:
        types.append("metadata_anomaly")
    if evidence.get("semantic_anomaly", 0) > 0.5:
        types.append("semantic_inconsistency")
    return types
