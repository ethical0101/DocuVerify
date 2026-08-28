"""Educational/certificate document heuristics -- keyword-based
classification only, no external verification."""
import re

EDU_KEYWORDS = re.compile(
    r"\b(certificate|university|college|degree|diploma|bachelor|master|"
    r"graduat|registration\s?no|grade|marksheet|institute)\b", re.IGNORECASE)


def looks_like_educational_document(ocr_words: list) -> bool:
    text = " ".join(w["text"] for w in ocr_words)
    return bool(EDU_KEYWORDS.search(text))


def classify_document_category(ocr_words: list) -> str:
    from app.services.identity.detector import looks_like_identity_document
    if looks_like_educational_document(ocr_words):
        return "education"
    if looks_like_identity_document(ocr_words):
        return "identity"
    return "unknown"
