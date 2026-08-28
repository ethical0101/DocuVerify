"""Noise-residual and edge-discontinuity analysis. Genuine scans/photos carry
a roughly uniform sensor/print-noise texture; pasted-in or re-rendered
regions often break that uniformity."""
import cv2
import numpy as np


def noise_residual_map(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    denoised = cv2.GaussianBlur(gray, (3, 3), 0)
    residual = np.abs(gray - denoised)
    if residual.max() > 0:
        residual = (residual / residual.max()) * 255
    return residual.astype(np.uint8)


def local_variance_anomaly(image: np.ndarray, grid: int = 12, z_thresh: float = 2.4) -> list:
    residual = noise_residual_map(image)
    h, w = residual.shape
    cell_h, cell_w = h // grid, w // grid
    if cell_h == 0 or cell_w == 0:
        return []

    variances, cells = [], []
    for gy in range(grid):
        for gx in range(grid):
            y0, y1 = gy * cell_h, (gy + 1) * cell_h if gy < grid - 1 else h
            x0, x1 = gx * cell_w, (gx + 1) * cell_w if gx < grid - 1 else w
            cell = residual[y0:y1, x0:x1]
            variances.append(float(cell.var()))
            cells.append((x0, y0, x1 - x0, y1 - y0))

    arr = np.array(variances)
    mu, sigma = arr.mean(), arr.std() + 1e-6
    z_scores = np.abs((arr - mu) / sigma)

    regions = []
    for z, (x, y, cw, ch) in zip(z_scores, cells):
        if z > z_thresh:
            score = float(min(1.0, max(0.0, (z - z_thresh) / 3.0 + 0.4)))
            regions.append({"bbox": [x, y, cw, ch], "score": round(score, 3), "type": "noise_inconsistency",
                             "reason": "Local noise texture differs from surrounding regions"})
    return regions


def edge_discontinuity_score(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    density = edges.mean() / 255.0
    return float(density)
