"""Central orchestrator: runs every forensic engine on a document and
produces the fused evidence object. Each stage is wrapped so one engine's
failure never takes down the whole analysis (see rule: fallback architecture).

Refactored into named stage functions (analyze_document_intake, analyze_ocr,
analyze_visual_forensics, analyze_typography_stage, analyze_structure,
analyze_metadata_stage, analyze_consistency_stage, fuse_and_assess) so both
Quick Scan and the manual Forensic Investigation UI can reuse the exact same
pipeline -- analyze_document() simply calls every stage in sequence; nothing
about the underlying computation changes between the two modes."""
import time
import traceback
from pathlib import Path

from app.services.preprocessing.loader import load_pages
from app.services.document_detection.detector import detect_and_deskew
from app.services.ocr.engine import run_ocr
from app.services.visual_forensics.ela import error_level_analysis, grid_anomaly_regions
from app.services.visual_forensics.noise import local_variance_anomaly, noise_residual_map
from app.services.visual_forensics.text_region_forensics import text_region_anomalies
from app.services.visual_forensics.sharpness_forensics import sharpness_anomalies
from app.services.typography.analyzer import analyze_typography
from app.services.layout.analyzer import analyze_layout
from app.services.metadata.extractor import extract_metadata
from app.services.semantic.consistency import analyze_consistency
from app.services.identity.detector import detect_portrait_region
from app.services.education.detector import classify_document_category
from app.services.fusion.fusion import fuse_evidence, diagnose_forgery_types
from app.services.explainability.explainer import build_explanation
from app.services.evidence import build_evidence_list

STAGE_ORDER = ["intake", "ocr", "visual_forensics", "typography", "structure", "metadata",
               "consistency", "fusion"]

STAGE_LABELS = {
    "intake": "Document Intake", "ocr": "OCR Analysis", "visual_forensics": "Visual Forensics",
    "typography": "Typography", "structure": "Structure", "metadata": "Metadata",
    "consistency": "Consistency", "fusion": "Evidence Fusion",
}


def _safe(fn, default, *args, **kwargs):
    try:
        return fn(*args, **kwargs), None
    except Exception:
        return default, traceback.format_exc(limit=2)


def load_primary_page(path: Path) -> tuple:
    """Loads + deskews a document's primary page exactly as analyze_document() does.
    Any endpoint that displays the document (e.g. the /file route the frontend renders
    region overlays on top of) MUST use this instead of calling load_pages() directly --
    otherwise region bounding boxes are computed against a different image (post-deskew)
    than the one shown to the user, and overlays land in the wrong place."""
    page = load_pages(path)[0]
    (page, was_deskewed), _ = _safe(detect_and_deskew, (page, False), page)
    return page, was_deskewed


def analyze_document_intake(path: Path) -> dict:
    page, was_deskewed = load_primary_page(path)
    return {"page": page, "was_deskewed": bool(was_deskewed),
            "page_size": [int(page.shape[1]), int(page.shape[0])],
            "summary": f"Page loaded ({page.shape[1]}x{page.shape[0]}px)"
                       + (", perspective-corrected" if was_deskewed else "")}


def analyze_ocr(page) -> dict:
    ocr_words, err = _safe(run_ocr, [], page)
    category = classify_document_category(ocr_words)
    return {"ocr_words": ocr_words, "word_count": len(ocr_words), "available": len(ocr_words) > 0,
            "category": category, "error": err,
            "summary": f"{len(ocr_words)} text region(s) extracted" if ocr_words else "OCR unavailable"}


def analyze_visual_forensics(page, ocr_words: list) -> dict:
    ela_map = error_level_analysis(page)
    noise_map = noise_residual_map(page)
    sharpness_regions, _ = _safe(sharpness_anomalies, [], page, ocr_words)
    text_regions = text_region_anomalies(page, ela_map, noise_map, ocr_words)
    if not text_regions and not sharpness_regions:
        # fall back to a blind page-grid scan when OCR text isn't available
        text_regions = grid_anomaly_regions(ela_map) + local_variance_anomaly(page)
    regions = sharpness_regions + text_regions
    if regions:
        top_scores = sorted((r["score"] for r in regions), reverse=True)[:3]
        score = min(1.0, sum(top_scores) / len(top_scores))
    else:
        score = 0.0
    return {"score": round(score, 3), "regions": regions,
            "summary": f"{len(regions)} suspicious region(s)" if regions else "No visual anomalies found"}


def analyze_typography_stage(page, ocr_words: list) -> dict:
    result, _ = _safe(analyze_typography, {"score": 0.0, "regions": []}, page, ocr_words)
    n = len(result.get("regions", []))
    result["summary"] = f"{n} inconsistenc{'y' if n == 1 else 'ies'} found" if n else \
        (result.get("note") or "No typography inconsistencies found")
    return result


def analyze_structure(page_shape, ocr_words: list) -> dict:
    result, _ = _safe(analyze_layout, {"score": 0.0, "findings": []}, page_shape, ocr_words)
    n = len(result.get("findings", []))
    result["summary"] = f"{n} anomal{'y' if n == 1 else 'ies'} found" if n else \
        (result.get("note") or "No structural anomalies found")
    return result


def analyze_metadata_stage(path: Path) -> dict:
    result, _ = _safe(extract_metadata, {"available": False, "anomaly": False}, path)
    result["summary"] = result.get("note", "Metadata unavailable")
    return result


def analyze_consistency_stage(ocr_words: list) -> dict:
    result, _ = _safe(analyze_consistency, {"score": 0.0, "findings": []}, ocr_words)
    n = len(result.get("findings", []))
    result["summary"] = f"{n} inconsistenc{'y' if n == 1 else 'ies'} found" if n else \
        (result.get("note") or "No consistency issues found")
    return result


def fuse_and_assess(category: str, page, ocr_words: list, visual: dict, typo: dict,
                     structure: dict, meta: dict, consistency: dict) -> dict:
    portrait_region = None
    if category == "identity":
        portrait_region, _ = _safe(detect_portrait_region, None, page)

    # Signals stay None (not 0.0) when an engine had insufficient input -- absence of
    # evidence is not evidence of authenticity; fuse_evidence lowers confidence accordingly
    # rather than silently crediting the document as "clean".
    signals = {
        "visual_anomaly": visual.get("score"),
        "typography_anomaly": typo.get("score"),
        "layout_anomaly": structure.get("score"),
        "metadata_anomaly": 0.5 if meta.get("anomaly") else 0.0,
        "semantic_anomaly": consistency.get("score"),
    }
    all_regions = (list(visual.get("regions", [])) + list(typo.get("regions", []))
                   + list(structure.get("findings", [])) + list(consistency.get("findings", [])))
    if portrait_region:
        all_regions.append(portrait_region)
    evidence_list = build_evidence_list(all_regions)

    # NOTE: an earlier version of this pipeline applied a flat +0.08 risk-score bonus
    # whenever two different engines flagged overlapping regions ("corroboration"). On
    # this build's held-out test set that measurably HURT discrimination (ROC-AUC 0.558
    # -> 0.412) rather than helping -- with imperfect per-engine precision, corroboration
    # just as often confirms two false positives as two true ones, and a flat bonus adds
    # noise to a small, already-noisy score distribution. We measured it, it didn't help,
    # so it's off by default. The "corroborated" flag is still computed and shown to the
    # human reviewer in the Evidence Explorer/report (that context is useful even though
    # it shouldn't yet mechanically move the score) -- see evidence.py and MODEL_CARD.md.
    fusion_result = fuse_evidence(signals, corroboration_bonus=0.0)
    forgery_types = diagnose_forgery_types(signals)

    explanation = build_explanation(fusion_result, all_regions, forgery_types, evidence_list)

    return {
        "signals": signals, "fusion_result": fusion_result, "forgery_types": forgery_types,
        "regions": all_regions, "evidence": evidence_list, "explanation": explanation,
        "metadata": meta,
    }


def analyze_document(path: Path) -> dict:
    timing = {}
    t0 = time.time()

    t1 = time.time()
    intake = analyze_document_intake(path)
    page = intake["page"]
    timing["intake_ms"] = round((time.time() - t1) * 1000, 1)

    t2 = time.time()
    ocr = analyze_ocr(page)
    timing["ocr_ms"] = round((time.time() - t2) * 1000, 1)
    ocr_words = ocr["ocr_words"]

    t3 = time.time()
    visual = analyze_visual_forensics(page, ocr_words)
    timing["visual_forensics_ms"] = round((time.time() - t3) * 1000, 1)

    t4 = time.time()
    typo = analyze_typography_stage(page, ocr_words)
    timing["typography_ms"] = round((time.time() - t4) * 1000, 1)

    t5 = time.time()
    structure = analyze_structure(page.shape, ocr_words)
    timing["structure_ms"] = round((time.time() - t5) * 1000, 1)

    t6 = time.time()
    meta = analyze_metadata_stage(path)
    timing["metadata_ms"] = round((time.time() - t6) * 1000, 1)

    t7 = time.time()
    consistency = analyze_consistency_stage(ocr_words)
    timing["consistency_ms"] = round((time.time() - t7) * 1000, 1)

    t8 = time.time()
    result = fuse_and_assess(ocr["category"], page, ocr_words, visual, typo, structure, meta, consistency)
    timing["fusion_ms"] = round((time.time() - t8) * 1000, 1)
    timing["total_ms"] = round((time.time() - t0) * 1000, 1)

    fusion_result = result["fusion_result"]

    return {
        "category": ocr["category"],
        "was_deskewed": intake["was_deskewed"],
        "ocr_available": ocr["available"],
        "ocr_word_count": ocr["word_count"],
        "ocr_words": ocr_words,
        "authenticity_score": fusion_result["authenticity_score"],
        "forensic_risk": fusion_result["forensic_risk"],
        "risk_level": fusion_result["risk_level"],
        "confidence": fusion_result["confidence"],
        "evidence": {
            **result["signals"],
            "layout_findings": structure.get("findings", []),
            "semantic_findings": consistency.get("findings", []),
            "metadata": meta,
        },
        "evidence_list": result["evidence"],
        "regions": result["regions"],
        "forgery_types": result["forgery_types"],
        "explanation": result["explanation"],
        "timing_ms": timing,
        "page_size": intake["page_size"],
        "errors": {"ocr": ocr.get("error")} if ocr.get("error") else {},
        "stage_summaries": {
            "intake": intake["summary"], "ocr": ocr["summary"], "visual_forensics": visual["summary"],
            "typography": typo["summary"], "structure": structure["summary"],
            "metadata": meta["summary"], "consistency": consistency["summary"],
            "fusion": f"Authenticity {fusion_result['authenticity_score']}%, "
                      f"{fusion_result['risk_level']} risk, {fusion_result['confidence']}% confidence",
        },
    }
