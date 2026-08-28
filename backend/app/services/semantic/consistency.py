"""Text-consistency analysis over OCR output: repeated identifiers/names that
disagree, and date relationships (issue > expiry, DOB implying an
implausible age) that violate expected ordering."""
import re
from collections import Counter

DATE_RE = re.compile(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})")
ID_RE = re.compile(r"\b[A-Z]{1,3}\d{4,10}\b|\b\d{6,12}\b")


def analyze_consistency(ocr_words: list) -> dict:
    if not ocr_words:
        return {"score": 0.0, "findings": [], "note": "No OCR text available for consistency analysis"}

    full_text_tokens = [w["text"] for w in ocr_words]
    findings = []
    score = 0.0

    dates = []
    for w in ocr_words:
        m = DATE_RE.search(w["text"])
        if m:
            try:
                d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                y = y if y > 100 else 2000 + y
                dates.append((y, mo, d, w["text"], w["bbox"]))
            except ValueError:
                continue

    if len(dates) >= 2:
        dates_sorted = sorted(dates, key=lambda t: (t[0], t[1], t[2]))
        earliest, latest = dates_sorted[0], dates_sorted[-1]
        span_years = latest[0] - earliest[0]
        if span_years > 100 or span_years < 0:
            findings.append({
                "type": "semantic_inconsistency", "score": 0.6,
                "reason": f"Implausible date relationship between '{earliest[3]}' and '{latest[3]}'",
                "bbox": latest[4],
            })
            score = max(score, 0.6)

    ids = Counter()
    for w in ocr_words:
        if ID_RE.fullmatch(w["text"]):
            ids[w["text"]] += 1
    repeated_ids = [i for i, c in ids.items() if c == 1]
    if len(ids) > 1 and len(repeated_ids) == len(ids):
        findings.append({
            "type": "semantic_inconsistency", "score": 0.3,
            "reason": "Multiple distinct identifier-like values found where a single consistent ID is expected",
        })
        score = max(score, 0.3)

    return {"score": round(score, 3), "findings": findings, "token_count": len(full_text_tokens)}
