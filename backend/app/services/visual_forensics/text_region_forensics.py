"""Text-region-focused visual forensics. Rather than scanning a blind grid
over the whole page (which dilutes signal on mostly-blank documents), this
measures ELA/noise statistics specifically inside each OCR word's bounding
box and compares it against the document's own per-word baseline. Tampering
tools (paste, re-render, inpaint) leave a compression/noise fingerprint on
the edited word that differs from the surrounding, untouched text -- so
comparing word-to-word is far more sensitive than comparing grid-cell-to-
grid-cell on a page that is mostly background."""
import cv2
import numpy as np


def text_region_anomalies(image: np.ndarray, ela_map: np.ndarray, noise_map: np.ndarray,
                           ocr_words: list, z_thresh: float = 3.2, pad: int = 4) -> list:
    if len(ocr_words) < 4:
        return []

    h, w = ela_map.shape
    stats = []
    for word in ocr_words:
        x, y, bw, bh = word["bbox"]
        if bw <= 0 or bh <= 0:
            continue
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(w, x + bw + pad), min(h, y + bh + pad)
        if x1 <= x0 or y1 <= y0:
            continue
        ela_cell = ela_map[y0:y1, x0:x1]
        noise_cell = noise_map[y0:y1, x0:x1]
        # Normalize by local edge density so error is compared "per unit of ink",
        # not raw magnitude (which otherwise just tracks font size/boldness).
        edges = cv2.Canny(ela_cell.astype(np.uint8), 30, 100)
        edge_density = float(edges.mean() / 255.0) + 0.02
        stats.append({
            "word": word, "bbox": [x0, y0, x1 - x0, y1 - y0],
            "ela_mean": float(ela_cell.mean()) / edge_density,
            "noise_var": float(noise_cell.var()) / edge_density,
        })

    if len(stats) < 4:
        return []

    ela_vals = np.array([s["ela_mean"] for s in stats])
    noise_vals = np.array([s["noise_var"] for s in stats])
    ela_mu = float(np.median(ela_vals))
    ela_sigma = float(np.median(np.abs(ela_vals - ela_mu))) * 1.4826 + 1e-6
    noise_mu = float(np.median(noise_vals))
    noise_sigma = float(np.median(np.abs(noise_vals - noise_mu))) * 1.4826 + 1e-6

    regions = []
    for s in stats:
        ela_z = (s["ela_mean"] - ela_mu) / ela_sigma
        noise_z = (s["noise_var"] - noise_mu) / noise_sigma
        combined = max(ela_z, noise_z)
        if combined > z_thresh:
            score = float(min(1.0, 0.5 + combined / 8))
            regions.append({
                "bbox": s["bbox"], "score": round(score, 3), "type": "visual_anomaly",
                "text": s["word"]["text"],
                "reason": "Compression/noise fingerprint on this text region differs from the "
                          "document's own surrounding text",
            })
    return regions
