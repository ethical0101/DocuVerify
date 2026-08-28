"""Edge-sharpness anomaly detection over OCR word regions. A word that has
been pasted back in after JPEG re-compression (the fingerprint any
paste/inpaint/re-render tool leaves) shows measurably different edge energy
(Laplacian variance) than a word that was never re-compressed -- typically
HIGHER due to quantization ringing at hard vector-text edges, not lower/
blurrier as naive intuition suggests. This compares each word's sharpness,
normalized by its own ink density, against other words in the same
glyph-height cluster (same approach as typography/analyzer.py) -- height
correlates with "field role" (title/body/caption) on BOTH tabular forms
(label vs. value) and paragraph documents like certificates, whereas
clustering by x-position only works for tabular layouts: on a paragraph
document almost every word has a unique x, so most clusters end up with
1-2 members and get skipped entirely, silently losing coverage on exactly
the free-text documents where this signal is needed most."""
import cv2
import numpy as np

from app.services.typography.analyzer import _cluster_1d


def sharpness_anomalies(image: np.ndarray, ocr_words: list, z_thresh: float = 2.2, pad: int = 2) -> list:
    if len(ocr_words) < 4:
        return []

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    stats = []
    for word in ocr_words:
        x, y, w, h = word["bbox"]
        if w <= 0 or h <= 0:
            continue
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = x + w + pad, y + h + pad
        crop = gray[y0:y1, x0:x1]
        if crop.size == 0:
            continue
        lap_var = float(cv2.Laplacian(crop, cv2.CV_64F).var())
        ink = float((crop < crop.mean()).mean()) + 0.05  # rough ink coverage, avoids div-by-0
        stats.append({"word": word, "bbox": [x0, y0, x1 - x0, y1 - y0], "norm_sharpness": lap_var / ink})

    if len(stats) < 4:
        return []

    heights = np.array([s["word"]["bbox"][3] for s in stats], dtype=np.float32)
    cluster_ids = _cluster_1d(heights, bin_width=max(3.0, float(heights.std()) * 0.5))

    regions = []
    for cluster in set(cluster_ids):
        members = [s for s, c in zip(stats, cluster_ids) if c == cluster]
        if len(members) < 3:
            continue
        vals = np.array([m["norm_sharpness"] for m in members], dtype=np.float32)
        mu = float(np.median(vals))
        mad = float(np.median(np.abs(vals - mu))) * 1.4826 + 1e-6
        for m in members:
            z = abs((m["norm_sharpness"] - mu) / mad)
            if z > z_thresh:
                score = float(min(1.0, 0.5 + z / 8))
                regions.append({
                    "bbox": m["bbox"], "score": round(score, 3), "type": "compression_splice",
                    "text": m["word"]["text"],
                    "reason": "Edge sharpness/ringing on this text differs sharply from other "
                              "similarly-sized text on this document, consistent with a pasted-in or "
                              "re-rendered edit",
                })
    return regions
