"""Loads PDFs/images into a list of numpy BGR page arrays without relying on
external binaries (uses PyMuPDF for PDFs, falling back gracefully if absent)."""
from pathlib import Path
from typing import List

import numpy as np
from PIL import Image, ImageOps


def load_pages(path: Path) -> List[np.ndarray]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _load_pdf(path)
    return [_load_image(path)]


def _load_image(path: Path) -> np.ndarray:
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)  # normalize orientation
    img = img.convert("RGB")
    arr = np.array(img)
    return arr[:, :, ::-1].copy()  # RGB -> BGR


def _load_pdf(path: Path) -> List[np.ndarray]:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise RuntimeError("PDF support requires PyMuPDF (pip install PyMuPDF)") from exc

    pages = []
    doc = fitz.open(path)
    for page in doc:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for forensic detail
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        arr = np.array(img)
        pages.append(arr[:, :, ::-1].copy())
    doc.close()
    if not pages:
        raise ValueError("PDF contains no renderable pages")
    return pages


def page_count(path: Path) -> int:
    suffix = path.suffix.lower()
    if suffix != ".pdf":
        return 1
    try:
        import fitz
        doc = fitz.open(path)
        n = doc.page_count
        doc.close()
        return n
    except Exception:
        return 1
