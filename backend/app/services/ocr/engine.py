"""OCR engine with a graceful fallback chain: EasyOCR -> pytesseract -> unavailable.

Only one engine is initialized (lazily, once) per process. If neither engine is
available the analysis pipeline continues without OCR-dependent evidence and
reports 'ocr_unavailable' rather than failing the whole request."""
import shutil
from functools import lru_cache
from typing import List, TypedDict

import numpy as np


class OcrWord(TypedDict):
    text: str
    bbox: list  # [x, y, w, h]
    confidence: float


@lru_cache(maxsize=1)
def _engine_name() -> str:
    try:
        import easyocr  # noqa
        return "easyocr"
    except ImportError:
        pass
    if shutil.which("tesseract"):
        return "tesseract"
    return "none"


@lru_cache(maxsize=1)
def _easyocr_reader():
    import easyocr
    return easyocr.Reader(["en"], gpu=False, verbose=False)


def run_ocr(image: np.ndarray) -> List[OcrWord]:
    engine = _engine_name()
    if engine == "easyocr":
        return _run_easyocr(image)
    if engine == "tesseract":
        return _run_tesseract(image)
    return []


def _run_easyocr(image: np.ndarray) -> List[OcrWord]:
    reader = _easyocr_reader()
    results = reader.readtext(image)
    words: List[OcrWord] = []
    for box, text, conf in results:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        x, y = min(xs), min(ys)
        w, h = max(xs) - x, max(ys) - y
        words.append({"text": text, "bbox": [int(x), int(y), int(w), int(h)], "confidence": float(conf)})
    return words


def _run_tesseract(image: np.ndarray) -> List[OcrWord]:
    import pytesseract
    import cv2
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    data = pytesseract.image_to_data(rgb, output_type=pytesseract.Output.DICT)
    words: List[OcrWord] = []
    for i, text in enumerate(data["text"]):
        text = text.strip()
        if not text:
            continue
        conf = float(data["conf"][i]) if str(data["conf"][i]) not in ("-1",) else 0.0
        words.append({
            "text": text,
            "bbox": [data["left"][i], data["top"][i], data["width"][i], data["height"][i]],
            "confidence": max(conf, 0.0) / 100.0,
        })
    return words


def is_available() -> bool:
    return _engine_name() != "none"
