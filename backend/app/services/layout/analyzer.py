"""Document structure/layout analysis: alignment, spacing and margin
regularity derived from OCR word boxes. Flags isolated/misaligned elements
rather than asserting a specific template violation."""
import numpy as np


def analyze_layout(image_shape: tuple, ocr_words: list) -> dict:
    if len(ocr_words) < 5:
        return {"score": 0.0, "findings": [], "note": "Insufficient OCR text for layout analysis"}

    h, w = image_shape[:2]
    lefts = np.array([wd["bbox"][0] for wd in ocr_words], dtype=np.float32)
    tops = np.array([wd["bbox"][1] for wd in ocr_words], dtype=np.float32)

    # Cluster words into rows by top-coordinate proximity to estimate line spacing regularity
    order = np.argsort(tops)
    sorted_tops = tops[order]
    gaps = np.diff(sorted_tops)
    gaps = gaps[gaps > 3]  # ignore words on the same line
    findings = []
    score = 0.0
    if len(gaps) >= 3:
        gap_mu, gap_sigma = gaps.mean(), gaps.std() + 1e-6
        irregular = gaps[np.abs(gaps - gap_mu) > 2.2 * gap_sigma]
        if len(irregular) > 0:
            score = float(min(1.0, len(irregular) / len(gaps) * 2))
            findings.append({
                "type": "structural_anomaly", "score": round(score, 3),
                "reason": f"{len(irregular)} irregular line-spacing gap(s) detected against a "
                          f"baseline of {gap_mu:.1f}px",
            })

    margin_left = float(lefts.min() / w) if w else 0.0
    if margin_left < 0.01:
        findings.append({
            "type": "structural_anomaly", "score": 0.35,
            "reason": "Text content touches the document edge, which is unusual for formal documents",
        })
        score = max(score, 0.35)

    return {"score": round(score, 3), "findings": findings}
