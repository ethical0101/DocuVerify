"""Copy-move (duplicate-region) detection. Splits the page into overlapping
blocks, hashes a downsampled version of each, and flags pairs of blocks that
are near-identical but spatially far apart -- a direct, threshold-light
signal for copy-paste tampering (unlike ELA/noise, this doesn't rely on a
document-wide statistical baseline)."""
import cv2
import numpy as np


def detect_copy_move(image: np.ndarray, block_size: int = 48, stride: int = 24,
                      min_distance_factor: float = 2.5, similarity_thresh: float = 0.996) -> list:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if h < block_size * 2 or w < block_size * 2:
        return []

    blocks = []
    for y in range(0, h - block_size, stride):
        for x in range(0, w - block_size, stride):
            patch = gray[y:y + block_size, x:x + block_size]
            edges = cv2.Canny(patch, 50, 150)
            edge_density = edges.mean() / 255.0
            # Skip flat/background blocks AND uniform stripes/solid-color bands
            # (e.g. a solid header) which are trivially "self-similar" without being copy-moved.
            if patch.std() < 8 or edge_density < 0.04:
                continue
            small = cv2.resize(patch, (8, 8), interpolation=cv2.INTER_AREA).astype(np.float32)
            small = (small - small.mean()) / (small.std() + 1e-6)
            blocks.append({"x": x, "y": y, "vec": small.flatten()})

    if len(blocks) < 2:
        return []

    vecs = np.array([b["vec"] for b in blocks])
    norms = np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-6
    unit = vecs / norms

    found = []
    used = set()
    min_dist = block_size * min_distance_factor
    for i in range(len(blocks)):
        if i in used:
            continue
        sims = unit @ unit[i]
        for j in range(i + 1, len(blocks)):
            if j in used or sims[j] < similarity_thresh:
                continue
            dist = np.hypot(blocks[i]["x"] - blocks[j]["x"], blocks[i]["y"] - blocks[j]["y"])
            if dist < min_dist:
                continue
            for b in (blocks[i], blocks[j]):
                found.append({
                    "bbox": [b["x"], b["y"], block_size, block_size], "score": round(float(sims[j]), 3),
                    "type": "copy_move", "reason": "This region's content closely duplicates another "
                                                    "region elsewhere on the page",
                })
            used.add(i)
            used.add(j)
            break

    return found
