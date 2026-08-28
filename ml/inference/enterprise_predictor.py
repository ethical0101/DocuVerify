"""Runs a trained EnterpriseDocumentClassifier against one document's base-pipeline
result. Deliberately decoupled from the database/API layer -- callers resolve which
model_path to use (the organization's ACTIVE ModelVersion) and pass it in."""
from __future__ import annotations

from pathlib import Path

from ml.models.enterprise_classifier import EnterpriseDocumentClassifier
from ml.training.feature_extractor import extract_features


def predict_with_enterprise_model(pipeline_result: dict, model_path: Path) -> dict:
    model = EnterpriseDocumentClassifier.load(model_path)
    features = extract_features(pipeline_result)
    risk = model.predict_risk(features)
    return {
        "risk_score": round(risk, 3),
        "authenticity_score": round((1 - risk) * 100, 1),
        "risk_level": "LOW" if risk < 0.30 else "MEDIUM" if risk < 0.55 else "HIGH",
        "algorithm": model.algorithm,
        "features_used": features,
    }
