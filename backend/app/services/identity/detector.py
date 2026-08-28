"""Identity-document heuristics: detects the likely portrait region and
classifies whether a document looks ID-like, purely from geometry/OCR
keywords. No connection to any government database -- forensic-only."""
import re

import cv2
import numpy as np

ID_KEYWORDS = re.compile(
    r"\b(passport|licen[cs]e|identity|id\s?no|date of birth|dob|nationality|"
    r"expiry|issued|driving)\b", re.IGNORECASE)


def looks_like_identity_document(ocr_words: list) -> bool:
    text = " ".join(w["text"] for w in ocr_words)
    return bool(ID_KEYWORDS.search(text))


def detect_portrait_region(image: np.ndarray) -> dict | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    pad_x, pad_y = int(w * 0.3), int(h * 0.4)
    x0, y0 = max(0, x - pad_x), max(0, y - pad_y)
    x1 = min(image.shape[1], x + w + pad_x)
    y1 = min(image.shape[0], y + h + pad_y)
    return {"bbox": [x0, y0, x1 - x0, y1 - y0], "type": "portrait_region"}
