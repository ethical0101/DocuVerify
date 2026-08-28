"""Turns one document's base-pipeline analysis result (app/services/pipeline.py's
analyze_document()) into the fixed-order feature vector EnterpriseDocumentClassifier
consumes (ml/models/enterprise_classifier.py:FEATURE_SCHEMA).

This is the ONLY place that bridges "what the base forensic engines found" to "what
the enterprise model trains/predicts on" -- keeping it in one function means the
training-time and inference-time feature computation can never silently drift apart."""
from __future__ import annotations

from ml.models.enterprise_classifier import FEATURE_SCHEMA


def extract_features(pipeline_result: dict) -> dict[str, float]:
    evidence = pipeline_result.get("evidence", {})
    evidence_list = pipeline_result.get("evidence_list", [])
    ocr_words = pipeline_result.get("ocr_words", [])

    ocr_confidences = [w.get("confidence", 0.0) for w in ocr_words]
    ocr_confidence_mean = sum(ocr_confidences) / len(ocr_confidences) if ocr_confidences else 0.0

    non_informational = [e for e in evidence_list if not e.get("informational")]
    high_severity = [e for e in non_informational if e.get("severity") in ("high", "critical")]

    features = {
        "visual_anomaly": evidence.get("visual_anomaly") or 0.0,
        "typography_anomaly": evidence.get("typography_anomaly") or 0.0,
        "layout_anomaly": evidence.get("layout_anomaly") or 0.0,
        "metadata_anomaly": evidence.get("metadata_anomaly") or 0.0,
        "semantic_anomaly": evidence.get("semantic_anomaly") or 0.0,
        "ocr_confidence_mean": ocr_confidence_mean,
        # Counts are normalized (capped+scaled) rather than raw, so a document with
        # 40 OCR words and one with 4 don't produce wildly different-scale features.
        "ocr_word_count_norm": min(1.0, len(ocr_words) / 30.0),
        "region_anomaly_count_norm": min(1.0, len(non_informational) / 10.0),
        "high_severity_region_count_norm": min(1.0, len(high_severity) / 5.0),
    }
    return {k: features[k] for k in FEATURE_SCHEMA}
