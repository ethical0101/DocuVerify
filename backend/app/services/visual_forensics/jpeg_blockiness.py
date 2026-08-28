"""JPEG blocking-grid artifact detection. Any region that has ever been
through JPEG compression carries periodic 8x8 DCT block-boundary energy
(quantization treats each 8x8 block independently, so edges consistently
form at block boundaries). A native, never-recompressed PNG region has no
such periodicity at any grid offset. This makes blockiness a strong,
physically-grounded signal for regions that were edited with a tool that
re-saved them through JPEG at some point -- independent of ELA/noise
thresholds and largely immune to the font/word-size confounds that limit
the OCR-relative signals in text_region_forensics.py."""
import cv2
import numpy as np


def _blockiness_at_offset(diff: np.ndarray, offset: int, axis_len: int) -> float:
    """Mean gradient energy specifically at columns/rows congruent to `offset` mod 8,
    vs. the mean everywhere else. Returns the ratio (>1 means a real block boundary)."""
    idx = np.arange(offset, axis_len - 1, 8)
    if len(idx) == 0:
        return 1.0
    on_grid = diff[..., idx] if diff.ndim == 2 else diff[idx]
    on_grid_mean = float(on_grid.mean()) if on_grid.size else 0.0
    overall_mean = float(diff.mean()) + 1e-6
    return on_grid_mean / overall_mean


def cell_blockiness_score(gray_cell: np.ndarray) -> float:
    """Best-offset blockiness ratio for one image patch, in both directions."""
    if gray_cell.shape[0] < 16 or gray_cell.shape[1] < 16:
        return 0.0
    gray_cell = gray_cell.astype(np.float32)
    h_diff = np.abs(np.diff(gray_cell, axis=1))  # column-wise energy, shape (H, W-1)
    v_diff = np.abs(np.diff(gray_cell, axis=0))  # row-wise energy, shape (H-1, W)

    h_ratios = [_blockiness_at_offset(h_diff, off, gray_cell.shape[1]) for off in range(8)]
    v_ratios = [_blockiness_at_offset(v_diff.T, off, gray_cell.shape[0]) for off in range(8)]
    return max(max(h_ratios), max(v_ratios))


def detect_blocking_regions(image: np.ndarray, ocr_words: list | None = None,
                             cell: int = 40, stride: int = 20, ratio_thresh: float = 1.9) -> list:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if h < cell * 2 or w < cell * 2:
        return []

    regions = []
    for y in range(0, h - cell, stride):
        for x in range(0, w - cell, stride):
            patch = gray[y:y + cell, x:x + cell]
            if patch.std() < 6:  # skip flat background -- no edges to carry a grid signal either way
                continue
            ratio = cell_blockiness_score(patch)
            if ratio > ratio_thresh:
                score = float(min(1.0, 0.5 + (ratio - ratio_thresh) / 3))
                regions.append({
                    "bbox": [x, y, cell, cell], "score": round(score, 3), "type": "compression_splice",
                    "reason": "This region shows a JPEG block-compression grid that the rest of the "
                              "document does not -- consistent with a pasted or re-saved edit",
                })

    return _merge_overlapping(regions)


def _merge_overlapping(regions: list) -> list:
    """Collapses adjacent flagged cells (from the sliding window) into single boxes
    so the UI doesn't show a checkerboard of overlapping rectangles."""
    if not regions:
        return []
    regions = sorted(regions, key=lambda r: -r["score"])
    kept = []
    for r in regions:
        x, y, w, h = r["bbox"]
        cx, cy = x + w / 2, y + h / 2
        if any(abs(cx - (k["bbox"][0] + k["bbox"][2] / 2)) < w and
               abs(cy - (k["bbox"][1] + k["bbox"][3] / 2)) < h for k in kept):
            continue
        kept.append(r)
    return kept
