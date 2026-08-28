import hashlib
import uuid
from pathlib import Path

import io

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import Document, Analysis
from app.services.preprocessing.loader import page_count
from app.services.pipeline import analyze_document

router = APIRouter()


@router.get("/health")
def health():
    from app.services.ocr.engine import is_available
    return {"status": "ok", "ocr_available": is_available()}


@router.post("/documents/upload")
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.allowed_extensions:
        raise HTTPException(400, f"Unsupported file type '{suffix}'. Allowed: {settings.allowed_extensions}")

    contents = file.file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_mb:
        raise HTTPException(400, f"File too large ({size_mb:.1f}MB). Limit is {settings.max_upload_mb}MB.")
    if len(contents) == 0:
        raise HTTPException(400, "Empty file")

    safe_name = f"{uuid.uuid4().hex[:12]}{suffix}"
    dest = settings.upload_dir / safe_name
    dest.write_bytes(contents)

    sha256 = hashlib.sha256(contents).hexdigest()
    try:
        pages = page_count(dest)
    except Exception:
        pages = 1

    doc = Document(
        filename=file.filename or safe_name,
        stored_path=str(dest),
        sha256=sha256,
        file_type=suffix.lstrip("."),
        pages=pages,
        size_bytes=len(contents),
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "pages": doc.pages, "size_bytes": doc.size_bytes,
            "sha256": doc.sha256, "status": doc.status}


@router.post("/documents/{doc_id}/analyze")
def analyze(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.status = "analyzing"
    db.commit()

    try:
        result = analyze_document(Path(doc.stored_path))
    except Exception as exc:
        doc.status = "failed"
        db.commit()
        raise HTTPException(500, f"Analysis failed: {exc}") from exc

    doc.status = "complete"
    doc.category = result["category"]
    analysis = Analysis(
        document_id=doc.id,
        authenticity_score=result["authenticity_score"],
        risk_level=result["risk_level"],
        confidence=result["confidence"],
        evidence=result["evidence"],
        regions=result["regions"],
        ocr_result=result["ocr_words"],
        forgery_types=result["forgery_types"],
        explanation=result["explanation"],
        timing_ms=result["timing_ms"],
        page_size=result["page_size"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Record a tamper-evident provenance fingerprint (hash + non-sensitive summary only).
    # Wrapped so a ledger failure never breaks the core analysis response.
    verification = None
    try:
        from app.services.provenance.ledger import register
        verification = register(doc.sha256, {
            "authenticity_score": analysis.authenticity_score,
            "risk_level": analysis.risk_level,
            "confidence": analysis.confidence,
            "model_version": analysis.model_version,
        })
    except Exception:
        verification = None

    return {"document_id": doc.id, "analysis_id": analysis.id, "authenticity_score": analysis.authenticity_score,
            "risk_level": analysis.risk_level, "confidence": analysis.confidence,
            "verification_id": verification["verification_id"] if verification else None}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return {"id": doc.id, "filename": doc.filename, "category": doc.category, "pages": doc.pages,
            "status": doc.status, "created_at": doc.created_at, "file_type": doc.file_type,
            "size_bytes": doc.size_bytes}


@router.get("/documents/{doc_id}/results")
def get_results(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if not doc.analyses:
        raise HTTPException(404, "No analysis found for this document yet")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {
        "document": {"id": doc.id, "filename": doc.filename, "category": doc.category},
        "authenticity_score": latest.authenticity_score,
        "risk_level": latest.risk_level,
        "confidence": latest.confidence,
        "evidence": latest.evidence,
        "regions": latest.regions,
        "forgery_types": latest.forgery_types,
        "explanation": latest.explanation,
        "timing_ms": latest.timing_ms,
        "model_version": latest.model_version,
        "page_size": latest.page_size,
    }


@router.get("/documents/{doc_id}/file")
def get_file(doc_id: str, db: Session = Depends(get_db)):
    """Returns the document's primary page as a PNG (renders PDFs to their first page)
    so the frontend always has a single displayable image, regardless of source format."""
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    from pathlib import Path
    import cv2
    from app.services.pipeline import load_primary_page

    # Must match analyze_document()'s preprocessing exactly (including deskew) --
    # region bounding boxes from the analysis are only valid against this exact image.
    page, _ = load_primary_page(Path(doc.stored_path))
    ok, buf = cv2.imencode(".png", page)
    if not ok:
        raise HTTPException(500, "Failed to encode document preview")
    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/png")


@router.get("/documents/{doc_id}/regions")
def get_regions(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or not doc.analyses:
        raise HTTPException(404, "No analysis found")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {"regions": latest.regions}


@router.get("/documents/{doc_id}/report")
def get_report(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or not doc.analyses:
        raise HTTPException(404, "No analysis found")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {
        "document": {"id": doc.id, "filename": doc.filename, "sha256": doc.sha256, "category": doc.category},
        "authenticity_score": latest.authenticity_score,
        "risk_level": latest.risk_level,
        "confidence": latest.confidence,
        "forgery_types": latest.forgery_types,
        "explanation": latest.explanation,
        "evidence_summary": latest.evidence,
        "generated_at": latest.created_at,
        "model_version": latest.model_version,
        "disclaimer": ("This is an automated forensic risk assessment from a hackathon research prototype. "
                        "It is not an official government verification and should not be used as sole "
                        "grounds for a legal or financial decision."),
    }


@router.get("/documents/{doc_id}/provenance")
def get_provenance(doc_id: str, db: Session = Depends(get_db)):
    """Provenance lookup for a document: has this exact content been registered before,
    and is the tamper-evident ledger chain still intact? Stores/reveals only hashes and
    non-identifying analysis summaries -- never document content."""
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    from app.services.provenance.ledger import lookup, verify_chain
    return {
        "document_sha256": doc.sha256,
        "provenance": lookup(doc.sha256),
        "ledger_integrity": verify_chain(),
    }


@router.get("/provenance/verify")
def provenance_verify():
    """Recomputes the whole ledger hash chain and reports whether it is intact."""
    from app.services.provenance.ledger import verify_chain
    return verify_chain()
