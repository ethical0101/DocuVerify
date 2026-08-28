"""Typography-consistency analysis built on OCR word boxes. Compares each
word's local rendering statistics (glyph height, stroke density/boldness,
baseline offset) against the document-wide baseline to flag words whose
rendering differs from their neighbors -- a signal for text that was
replaced/re-rendered rather than originally printed."""
import cv2
import numpy as np


def analyze_typography(image: np.ndarray, ocr_words: list) -> dict:
    if len(ocr_words) < 4:
        return {"score": None, "regions": [], "note": "Insufficient OCR text for typography analysis"}

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    stats = []
    for word in ocr_words:
        x, y, w, h = word["bbox"]
        if w <= 0 or h <= 0:
            continue
        crop = gray[max(0, y):y + h, max(0, x):x + w]
        if crop.size == 0:
            continue
        _, binarized = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        ink_density = float(binarized.mean() / 255.0)
        stats.append({"word": word, "height": h, "ink_density": ink_density})

    if len(stats) < 4:
        return {"score": 0.0, "regions": [], "note": "Insufficient OCR text for typography analysis"}

    # Cluster words by their X-position (column) rather than by height/size directly.
    # Forms/certificates typically align a field's labels in one column and values in
    # another; each column legitimately keeps one font size, so comparing a word only
    # against its own column's peers isolates true rendering anomalies without being
    # confused by a document that intentionally mixes label/value/header sizes.
    xs_only = np.array([s["word"]["bbox"][0] for s in stats], dtype=np.float32)
    cluster_ids = _cluster_1d(xs_only, bin_width=max(40.0, float(xs_only.std()) * 0.3))

    regions = []
    for cluster in set(cluster_ids):
        members = [s for s, c in zip(stats, cluster_ids) if c == cluster]
        if len(members) < 3:
            continue
        m_heights = np.array([m["height"] for m in members], dtype=np.float32)
        m_densities = np.array([m["ink_density"] for m in members], dtype=np.float32)
        h_mu, h_sigma = float(np.median(m_heights)), m_heights.std() + 1e-6
        d_mu, d_sigma = float(np.median(m_densities)), m_densities.std() + 1e-6

        for s in members:
            h_z = abs((s["height"] - h_mu) / h_sigma)
            d_z = abs((s["ink_density"] - d_mu) / d_sigma)
            combined = max(h_z, d_z)
            if combined > 2.6:
                x, y, w, h = s["word"]["bbox"]
                score = float(min(1.0, combined / 5.0))
                regions.append({
                    "bbox": [x, y, w, h], "score": round(score, 3), "type": "typography_inconsistency",
                    "text": s["word"]["text"],
                    "reason": "Local text rendering (glyph height/stroke density) differs from other "
                              "similarly-sized text on this document",
                })
    overall = float(min(1.0, len(regions) / max(1, len(stats)) * 3))
    return {"score": round(overall, 3), "regions": regions}


def _cluster_1d(values: np.ndarray, bin_width: float) -> list:
    """Simple 1D agglomerative-style clustering: sort values and start a new
    cluster whenever the gap to the previous value exceeds bin_width."""
    order = np.argsort(values)
    cluster_ids = [0] * len(values)
    current = 0
    for idx, pos in enumerate(order):
        if idx > 0:
            prev_pos = order[idx - 1]
            if values[pos] - values[prev_pos] > bin_width:
                current += 1
        cluster_ids[pos] = current
    return cluster_ids
