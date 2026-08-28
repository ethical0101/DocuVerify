import hashlib
import uuid
from pathlib import Path

import io

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import Document, Analysis, User
from app.services.preprocessing.loader import page_count
from app.services.pipeline import analyze_document
from app.api.deps import get_optional_user

router = APIRouter()


def _get_authorized_document(doc_id: str, db: Session, user: User | None) -> Document:
    """Fetches a document, enforcing organization isolation: a document uploaded
    within an organization is only readable by a member of that SAME organization
    (404, not 403, so an unauthorized caller can't distinguish "wrong org" from
    "doesn't exist"). A document uploaded anonymously (organization_id IS NULL) stays
    readable by anyone, consistent with the core forensic demo working without login."""
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.organization_id and (not user or user.organization_id != doc.organization_id):
        raise HTTPException(404, "Document not found")
    return doc


@router.get("/health")
def health():
    from app.services.ocr.engine import is_available
    return {"status": "ok", "ocr_available": is_available()}


@router.post("/documents/upload")
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db),
                     user: User | None = Depends(get_optional_user)):
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
        organization_id=user.organization_id if user else None,
        uploaded_by=user.id if user else None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "filename": doc.filename, "pages": doc.pages, "size_bytes": doc.size_bytes,
            "sha256": doc.sha256, "status": doc.status}


@router.post("/documents/{doc_id}/analyze")
def analyze(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
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
    if not doc.case_number:
        doc.case_number = f"DV-{doc.created_at.strftime('%Y')}-{doc.id[:6].upper()}"

    # If the caller is logged in and their organization has an ACTIVE trained model,
    # layer its assessment on top of the base forensic result. The base pipeline
    # result is unchanged either way -- this is additive, never a replacement.
    enterprise_model_id, enterprise_assessment = None, {}
    if user:
        from app.models.db_models import ModelVersion
        active = db.query(ModelVersion).filter(
            ModelVersion.organization_id == user.organization_id, ModelVersion.status == "active").first()
        if active:
            try:
                from pathlib import Path as _Path
                from ml.inference.enterprise_predictor import predict_with_enterprise_model
                enterprise_assessment = predict_with_enterprise_model(result, _Path(active.model_path))
                enterprise_assessment["model_name"] = active.name
                enterprise_assessment["model_version"] = active.version
                enterprise_model_id = active.id
            except Exception:
                enterprise_assessment = {}  # organization model is additive -- never fail the base analysis

    analysis = Analysis(
        document_id=doc.id,
        authenticity_score=result["authenticity_score"],
        forensic_risk=result["forensic_risk"],
        risk_level=result["risk_level"],
        confidence=result["confidence"],
        evidence=result["evidence"],
        evidence_list=result["evidence_list"],
        regions=result["regions"],
        ocr_result=result["ocr_words"],
        forgery_types=result["forgery_types"],
        explanation=result["explanation"],
        timing_ms=result["timing_ms"],
        stage_summaries=result["stage_summaries"],
        page_size=result["page_size"],
        enterprise_model_id=enterprise_model_id,
        enterprise_assessment=enterprise_assessment,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return {"document_id": doc.id, "analysis_id": analysis.id, "authenticity_score": analysis.authenticity_score,
            "forensic_risk": analysis.forensic_risk, "risk_level": analysis.risk_level,
            "confidence": analysis.confidence, "case_number": doc.case_number,
            "enterprise_assessment": enterprise_assessment or None}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    doc = _get_authorized_document(doc_id, db, user)
    return {"id": doc.id, "filename": doc.filename, "category": doc.category, "pages": doc.pages,
            "status": doc.status, "created_at": doc.created_at, "file_type": doc.file_type,
            "size_bytes": doc.size_bytes}


@router.get("/documents/{doc_id}/results")
def get_results(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    doc = _get_authorized_document(doc_id, db, user)
    if not doc.analyses:
        raise HTTPException(404, "No analysis found for this document yet")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {
        "document": {"id": doc.id, "filename": doc.filename, "category": doc.category,
                      "case_number": doc.case_number},
        "authenticity_score": latest.authenticity_score,
        "forensic_risk": latest.forensic_risk,
        "risk_level": latest.risk_level,
        "confidence": latest.confidence,
        "evidence": latest.evidence,
        "evidence_list": latest.evidence_list,
        "regions": latest.regions,
        "ocr_words": latest.ocr_result,
        "forgery_types": latest.forgery_types,
        "explanation": latest.explanation,
        "timing_ms": latest.timing_ms,
        "stage_summaries": latest.stage_summaries,
        "model_version": latest.model_version,
        "page_size": latest.page_size,
        "enterprise_assessment": latest.enterprise_assessment or None,
    }


@router.get("/documents/{doc_id}/evidence")
def get_evidence(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    doc = _get_authorized_document(doc_id, db, user)
    if not doc.analyses:
        raise HTTPException(404, "No analysis found")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {"evidence": latest.evidence_list}


@router.get("/documents/{doc_id}/file")
def get_file(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    """Returns the document's primary page as a PNG (renders PDFs to their first page)
    so the frontend always has a single displayable image, regardless of source format."""
    doc = _get_authorized_document(doc_id, db, user)

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
def get_regions(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    doc = _get_authorized_document(doc_id, db, user)
    if not doc.analyses:
        raise HTTPException(404, "No analysis found")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {"regions": latest.regions}


@router.get("/documents")
def list_documents(db: Session = Depends(get_db), limit: int = 100,
                    user: User | None = Depends(get_optional_user)):
    """Investigation history: every document that has at least one analysis, newest first.
    Never fabricated -- reads directly from the database, empty list if nothing analyzed yet.

    Scoped to the caller's organization -- logged-in users must never see another
    organization's investigations (see the enterprise isolation requirement in
    SECURITY.md). An anonymous caller only sees documents that were themselves
    uploaded anonymously (organization_id IS NULL), never any organization's data."""
    query = db.query(Document).filter(Document.organization_id == (user.organization_id if user else None))
    docs = query.order_by(Document.created_at.desc()).limit(limit).all()
    out = []
    for doc in docs:
        if not doc.analyses:
            continue
        latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
        out.append({
            "id": doc.id, "filename": doc.filename, "category": doc.category,
            "case_number": doc.case_number, "status": doc.status, "created_at": doc.created_at,
            "authenticity_score": latest.authenticity_score, "forensic_risk": latest.forensic_risk,
            "risk_level": latest.risk_level, "confidence": latest.confidence,
            "finding_count": len([e for e in (latest.evidence_list or []) if not e.get("informational")]),
        })
    return {"investigations": out}


@router.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    """Real counts from the database only -- no fabricated statistics. Returns zeros, not
    placeholder numbers, when nothing has been analyzed yet. Scoped to the caller's
    organization, same isolation rule as list_documents() above."""
    docs = db.query(Document).filter(Document.organization_id == (user.organization_id if user else None)).all()
    analyzed = [d for d in docs if d.analyses]
    by_risk = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    recent = []
    for doc in analyzed:
        latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
        by_risk[latest.risk_level] = by_risk.get(latest.risk_level, 0) + 1
        recent.append({
            "id": doc.id, "filename": doc.filename, "category": doc.category,
            "case_number": doc.case_number, "created_at": doc.created_at,
            "authenticity_score": latest.authenticity_score, "risk_level": latest.risk_level,
        })
    recent.sort(key=lambda r: r["created_at"], reverse=True)

    active_model = None
    if user:
        from app.models.db_models import ModelVersion
        m = db.query(ModelVersion).filter(
            ModelVersion.organization_id == user.organization_id, ModelVersion.status == "active").first()
        if m:
            active_model = {"id": m.id, "name": m.name, "version": m.version, "metrics": m.metrics}

    return {
        "total_investigations": len(analyzed),
        "high_risk": by_risk.get("HIGH", 0),
        "medium_risk": by_risk.get("MEDIUM", 0),
        "low_risk": by_risk.get("LOW", 0),
        "recent_investigations": recent[:8],
        "active_model": active_model,
    }


@router.get("/documents/{doc_id}/report")
def get_report(doc_id: str, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    doc = _get_authorized_document(doc_id, db, user)
    if not doc.analyses:
        raise HTTPException(404, "No analysis found")
    latest = sorted(doc.analyses, key=lambda a: a.created_at)[-1]
    return {
        "document": {"id": doc.id, "filename": doc.filename, "sha256": doc.sha256, "category": doc.category,
                      "case_number": doc.case_number},
        "authenticity_score": latest.authenticity_score,
        "forensic_risk": latest.forensic_risk,
        "risk_level": latest.risk_level,
        "confidence": latest.confidence,
        "forgery_types": latest.forgery_types,
        "explanation": latest.explanation,
        "evidence_summary": latest.evidence,
        "evidence_list": latest.evidence_list,
        "generated_at": latest.created_at,
        "model_version": latest.model_version,
        "disclaimer": ("This is an automated forensic risk assessment from a hackathon research prototype. "
                        "It is not an official government verification and should not be used as sole "
                        "grounds for a legal or financial decision."),
    }
