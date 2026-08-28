"""Central orchestrator: runs every forensic engine on a document and
produces the fused evidence object. Each stage is wrapped so one engine's
failure never takes down the whole analysis (see rule: fallback architecture)."""
import time
import traceback
from pathlib import Path

from app.services.preprocessing.loader import load_pages
from app.services.document_detection.detector import detect_and_deskew
from app.services.ocr.engine import run_ocr
from app.services.visual_forensics.ela import error_level_analysis, grid_anomaly_regions
from app.services.visual_forensics.noise import local_variance_anomaly, noise_residual_map
from app.services.visual_forensics.text_region_forensics import text_region_anomalies
from app.services.typography.analyzer import analyze_typography
from app.services.layout.analyzer import analyze_layout
from app.services.metadata.extractor import extract_metadata
from app.services.semantic.consistency import analyze_consistency
from app.services.identity.detector import detect_portrait_region
from app.services.education.detector import classify_document_category
from app.services.fusion.fusion import fuse_evidence, diagnose_forgery_types
from app.services.explainability.explainer import build_explanation


def _safe(fn, default, *args, **kwargs):
    try:
        return fn(*args, **kwargs), None
    except Exception:
        return default, traceback.format_exc(limit=2)


def analyze_document(path: Path) -> dict:
    timing = {}
    t0 = time.time()

    pages = load_pages(path)
    page = pages[0]  # primary-page analysis for the hackathon scope
    timing["load_ms"] = round((time.time() - t0) * 1000, 1)

    t1 = time.time()
    deskew_result, _ = _safe(detect_and_deskew, (page, False), page)
    page, was_deskewed = deskew_result
    timing["deskew_ms"] = round((time.time() - t1) * 1000, 1)

    t2 = time.time()
    ocr_words, ocr_err = _safe(run_ocr, [], page)
    timing["ocr_ms"] = round((time.time() - t2) * 1000, 1)

    category = classify_document_category(ocr_words)

    t3 = time.time()
    ela_map = error_level_analysis(page)
    noise_map = noise_residual_map(page)
    text_regions = text_region_anomalies(page, ela_map, noise_map, ocr_words)
    if not text_regions:
        # fall back to a blind page-grid scan when OCR text isn't available
        text_regions = grid_anomaly_regions(ela_map) + local_variance_anomaly(page)
    visual_regions = text_regions
    if visual_regions:
        top_scores = sorted((r["score"] for r in visual_regions), reverse=True)[:3]
        visual_score = min(1.0, sum(top_scores) / len(top_scores))
    else:
        visual_score = 0.0
    timing["visual_forensics_ms"] = round((time.time() - t3) * 1000, 1)

    t4 = time.time()
    typo_result, _ = _safe(analyze_typography, {"score": 0.0, "regions": []}, page, ocr_words)
    timing["typography_ms"] = round((time.time() - t4) * 1000, 1)

    t5 = time.time()
    layout_result, _ = _safe(analyze_layout, {"score": 0.0, "findings": []}, page.shape, ocr_words)
    timing["layout_ms"] = round((time.time() - t5) * 1000, 1)

    t6 = time.time()
    meta_result, _ = _safe(extract_metadata, {"available": False, "anomaly": False}, path)
    timing["metadata_ms"] = round((time.time() - t6) * 1000, 1)

    t7 = time.time()
    semantic_result, _ = _safe(analyze_consistency, {"score": 0.0, "findings": []}, ocr_words)
    timing["semantic_ms"] = round((time.time() - t7) * 1000, 1)

    portrait_region = None
    if category == "identity":
        portrait_region, _ = _safe(detect_portrait_region, None, page)

    signals = {
        "visual_anomaly": round(visual_score, 3),
        "typography_anomaly": typo_result.get("score", 0.0),
        "layout_anomaly": layout_result.get("score", 0.0),
        "metadata_anomaly": 0.5 if meta_result.get("anomaly") else 0.0,
        "semantic_anomaly": semantic_result.get("score", 0.0),
    }
    fusion_result = fuse_evidence(signals)
    forgery_types = diagnose_forgery_types(signals)

    all_regions = list(visual_regions) + list(typo_result.get("regions", []))
    if portrait_region:
        all_regions.append(portrait_region)

    explanation = build_explanation(fusion_result, all_regions, forgery_types)

    timing["total_ms"] = round((time.time() - t0) * 1000, 1)

    return {
        "category": category,
        "was_deskewed": bool(was_deskewed),
        "ocr_available": len(ocr_words) > 0,
        "ocr_word_count": len(ocr_words),
        "ocr_words": ocr_words,
        "authenticity_score": fusion_result["authenticity_score"],
        "risk_level": fusion_result["risk_level"],
        "confidence": fusion_result["confidence"],
        "evidence": {
            **signals,
            "layout_findings": layout_result.get("findings", []),
            "semantic_findings": semantic_result.get("findings", []),
            "metadata": meta_result,
        },
        "regions": all_regions,
        "forgery_types": forgery_types,
        "explanation": explanation,
        "timing_ms": timing,
        "page_size": [int(page.shape[1]), int(page.shape[0])],
        "errors": {"ocr": ocr_err} if ocr_err else {},
    }
