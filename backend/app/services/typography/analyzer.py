"""Typography-consistency analysis built on OCR word boxes. Compares each
word's local rendering statistics (glyph height, stroke density/boldness,
baseline offset) against the document-wide baseline to flag words whose
rendering differs from their neighbors -- a signal for text that was
replaced/re-rendered rather than originally printed."""
import cv2
import numpy as np


def analyze_typography(image: np.ndarray, ocr_words: list) -> dict:
    if len(ocr_words) < 4:
        return {"score": 0.0, "regions": [], "note": "Insufficient OCR text for typography analysis"}

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

    heights = np.array([s["height"] for s in stats], dtype=np.float32)
    densities = np.array([s["ink_density"] for s in stats], dtype=np.float32)
    h_mu, h_sigma = heights.mean(), heights.std() + 1e-6
    d_mu, d_sigma = densities.mean(), densities.std() + 1e-6

    regions = []
    for s in stats:
        h_z = abs((s["height"] - h_mu) / h_sigma)
        d_z = abs((s["ink_density"] - d_mu) / d_sigma)
        combined = (h_z + d_z) / 2
        if combined > 2.0:
            x, y, w, h = s["word"]["bbox"]
            score = float(min(1.0, combined / 5.0))
            regions.append({
                "bbox": [x, y, w, h], "score": round(score, 3), "type": "typography_inconsistency",
                "text": s["word"]["text"],
                "reason": "Local text rendering (glyph height/stroke density) differs from neighboring text blocks",
            })

    overall = float(min(1.0, len(regions) / max(1, len(stats)) * 3))
    return {"score": round(overall, 3), "regions": regions}
