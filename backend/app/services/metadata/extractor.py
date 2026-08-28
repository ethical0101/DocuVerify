"""Metadata extraction (EXIF for images, doc-info for PDFs). Missing metadata
is reported neutrally, never treated as suspicious on its own -- absence of
EXIF is normal for scanned/screenshotted/re-saved documents."""
from pathlib import Path


def extract_metadata(path: Path) -> dict:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_metadata(path)
    return _extract_image_metadata(path)


def _extract_image_metadata(path: Path) -> dict:
    try:
        from PIL import Image
        img = Image.open(path)
        exif = img.getexif()
        if not exif:
            return {"available": False, "anomaly": False, "note": "Metadata unavailable", "fields": {}}
        fields = {}
        for tag_id, value in exif.items():
            from PIL.ExifTags import TAGS
            tag = TAGS.get(tag_id, str(tag_id))
            fields[str(tag)] = str(value)[:200]
        software = fields.get("Software", "")
        anomaly = any(kw in software.lower() for kw in ["photoshop", "gimp", "editor"])
        return {
            "available": True, "anomaly": anomaly, "fields": fields,
            "note": f"Editing software signature detected: {software}" if anomaly else "No obvious editor signature",
        }
    except Exception:
        return {"available": False, "anomaly": False, "note": "Metadata unavailable", "fields": {}}


def _extract_pdf_metadata(path: Path) -> dict:
    try:
        import fitz
        doc = fitz.open(path)
        meta = {k: v for k, v in doc.metadata.items() if v}
        doc.close()
        if not meta:
            return {"available": False, "anomaly": False, "note": "Metadata unavailable", "fields": {}}
        producer = meta.get("producer", "") + meta.get("creator", "")
        anomaly = any(kw in producer.lower() for kw in ["photoshop", "gimp"])
        return {
            "available": True, "anomaly": anomaly, "fields": meta,
            "note": f"Editing software signature detected: {producer}" if anomaly else "No obvious editor signature",
        }
    except Exception:
        return {"available": False, "anomaly": False, "note": "Metadata unavailable", "fields": {}}
