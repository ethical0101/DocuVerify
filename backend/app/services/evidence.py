"""Structured evidence model shared by the frontend's Evidence Explorer, the
final report, region drawers, and (indirectly) the explanation engine. Every
finding produced anywhere in the pipeline is normalized into this one shape:

{
  "id": "...", "stage": "visual_forensics", "type": "compression_splice",
  "bbox": [x,y,w,h] | None, "severity": "high", "confidence": 0.87,
  "score": 0.81, "title": "...", "summary": "...", "why_it_matters": "...",
  "recommended_check": "...", "corroborated": false
}

This module only NORMALIZES and WEIGHTS evidence that the forensic engines
already produced -- it never invents a finding. If an engine found nothing,
nothing is added here."""
import uuid

# Per-finding-type copy: title, summary template, why it matters, recommended human check.
# Only types actually emitted by the forensic engines appear here.
EVIDENCE_META = {
    "visual_anomaly": {
        "title": "Visual/Compression Anomaly", "stage": "visual_forensics",
        "why_it_matters": "A localized compression or noise fingerprint that differs from the rest of "
                           "the document can indicate the region was pasted in, re-rendered, or "
                           "re-saved separately from the original.",
        "recommended_check": "Inspect this region at full resolution and compare its print/scan "
                              "texture against the surrounding document.",
    },
    "noise_inconsistency": {
        "title": "Noise Texture Inconsistency", "stage": "visual_forensics",
        "why_it_matters": "Genuine scans/photos carry a roughly uniform sensor or print-noise texture; "
                           "a region that breaks that uniformity may have been edited separately.",
        "recommended_check": "Compare this region's texture against a known-genuine reference of the "
                              "same document type.",
    },
    "compression_splice": {
        "title": "Compression-Splice Signature", "stage": "visual_forensics",
        "why_it_matters": "Edge sharpness/ringing consistent with a JPEG re-compression pass suggests "
                           "this text was pasted in or re-rendered after the document was first created.",
        "recommended_check": "Examine this text at full zoom for edge artifacts and compare its "
                              "rendering to neighboring text.",
    },
    "copy_move": {
        "title": "Duplicated Region", "stage": "visual_forensics",
        "why_it_matters": "Near-identical content appearing twice on the page can indicate a copy-paste "
                           "manipulation covering or duplicating original content.",
        "recommended_check": "Compare both matching regions directly for an unexplained duplication.",
    },
    "typography_inconsistency": {
        "title": "Typography Inconsistency", "stage": "typography",
        "why_it_matters": "Text rendering (glyph height, stroke weight) that differs from other "
                           "similarly-sized text on the document is consistent with that text having "
                           "been replaced or re-typed rather than originally printed.",
        "recommended_check": "Compare the font rendering of this field against a known-genuine "
                              "reference document.",
    },
    "structural_anomaly": {
        "title": "Structural/Layout Anomaly", "stage": "structure",
        "why_it_matters": "Irregular spacing or alignment can indicate content was inserted, shifted, "
                           "or reformatted after the document's original layout was set.",
        "recommended_check": "Check this region's alignment and spacing against the document's overall "
                              "template.",
    },
    "semantic_inconsistency": {
        "title": "Text Consistency Issue", "stage": "consistency",
        "why_it_matters": "Dates, identifiers, or names that conflict with each other elsewhere on the "
                           "document are a strong, hard-to-fake signal when present.",
        "recommended_check": "Manually verify the conflicting values against the issuing authority's "
                              "record.",
    },
    "metadata_anomaly": {
        "title": "Metadata Anomaly", "stage": "metadata",
        "why_it_matters": "A known image/PDF editor signature in the file's metadata suggests the file "
                           "was processed by editing software after its original creation.",
        "recommended_check": "Review the file's edit history/metadata if the source system retains it.",
    },
    "portrait_region": {
        "title": "Portrait Region", "stage": "identity", "informational": True,
        "why_it_matters": "Shown for context/navigation only -- this is where the document's photo was "
                           "detected, not itself a forgery signal.",
        "recommended_check": "Compare the portrait against another verified photo of the document holder.",
    },
}


def _severity(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.6:
        return "high"
    if score >= 0.35:
        return "medium"
    if score > 0:
        return "low"
    return "info"


def _iou(a: list, b: list) -> float:
    ax0, ay0, aw, ah = a
    ax1, ay1 = ax0 + aw, ay0 + ah
    bx0, by0, bw, bh = b
    bx1, by1 = bx0 + bw, by0 + bh
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def build_evidence_list(raw_regions: list) -> list:
    """Normalizes every raw region/finding dict the forensic engines produced into the
    shared evidence schema, and applies a corroboration boost: when two DIFFERENT-type
    findings overlap the same region of the page, that's independent corroboration and
    the finding is marked accordingly with a modest score boost (capped at 1.0) -- a
    single engine being noisy in one spot should not carry the same weight as two
    independent engines agreeing on the same spot."""
    scored = [r for r in raw_regions if r.get("bbox") and r.get("score") is not None]
    for i, r in enumerate(scored):
        corroborators = [
            o for j, o in enumerate(scored)
            if j != i and o["type"] != r["type"] and _iou(r["bbox"], o["bbox"]) > 0.15
        ]
        r["_corroborated"] = len(corroborators) > 0
        if r["_corroborated"]:
            r["_boosted_score"] = round(min(1.0, r["score"] * 1.2), 3)
        else:
            r["_boosted_score"] = r["score"]

    evidence = []
    for r in raw_regions:
        meta = EVIDENCE_META.get(r["type"], {
            "title": r["type"].replace("_", " ").title(), "stage": "visual_forensics",
            "why_it_matters": "This region was flagged by a forensic engine as worth human review.",
            "recommended_check": "Manually inspect this region against a known-genuine reference.",
        })
        score = r.get("_boosted_score", r.get("score"))
        evidence.append({
            "id": uuid.uuid4().hex[:10],
            "stage": meta["stage"],
            "type": r["type"],
            "bbox": r.get("bbox"),
            "severity": "info" if meta.get("informational") else _severity(score or 0.0),
            "confidence": score,
            "score": score,
            "title": meta["title"],
            "summary": r.get("reason") or r.get("text") or meta["title"],
            "matched_text": r.get("text"),
            "why_it_matters": meta["why_it_matters"],
            "recommended_check": meta["recommended_check"],
            "corroborated": bool(r.get("_corroborated")),
            "informational": bool(meta.get("informational")),
        })
    return evidence
