"""Error Level Analysis: recompresses the image at a known JPEG quality and
measures per-pixel error, then aggregates into a coarse grid to surface
regions whose compression error differs sharply from their neighbors -- a
classic signal for spliced/edited regions."""
import io

import cv2
import numpy as np
from PIL import Image


def error_level_analysis(image: np.ndarray, quality: int = 90) -> np.ndarray:
    """Returns a single-channel error map (uint8) the same size as the input."""
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    buf = io.BytesIO()
    pil_img.save(buf, "JPEG", quality=quality)
    buf.seek(0)
    recompressed = np.array(Image.open(buf).convert("RGB"))

    diff = cv2.absdiff(rgb, recompressed).astype(np.float32)
    error = diff.mean(axis=2)
    if error.max() > 0:
        error = (error / error.max()) * 255
    return error.astype(np.uint8)


def grid_anomaly_regions(error_map: np.ndarray, grid: int = 12, z_thresh: float = 2.4) -> list:
    """Splits the error map into a grid, z-scores cell means, and returns
    bboxes for cells that stand out from the document's own baseline."""
    h, w = error_map.shape
    cell_h, cell_w = h // grid, w // grid
    if cell_h == 0 or cell_w == 0:
        return []

    means = []
    cells = []
    for gy in range(grid):
        for gx in range(grid):
            y0, y1 = gy * cell_h, (gy + 1) * cell_h if gy < grid - 1 else h
            x0, x1 = gx * cell_w, (gx + 1) * cell_w if gx < grid - 1 else w
            cell = error_map[y0:y1, x0:x1]
            means.append(float(cell.mean()))
            cells.append((x0, y0, x1 - x0, y1 - y0))

    means_arr = np.array(means)
    mu, sigma = means_arr.mean(), means_arr.std() + 1e-6
    z_scores = (means_arr - mu) / sigma

    regions = []
    for z, (x, y, cw, ch) in zip(z_scores, cells):
        if z > z_thresh:
            score = float(min(1.0, max(0.0, (z - z_thresh) / 3.0 + 0.5)))
            regions.append({"bbox": [x, y, cw, ch], "score": round(score, 3), "type": "visual_anomaly",
                             "reason": "Local compression error deviates from the document's baseline"})
    return regions
