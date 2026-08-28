"""Enterprise admin API: dataset upload/validation, model training (runs in a
background thread with real, pollable per-stage progress -- not a simulated
progress bar), model registry/activation, user management, audit log, and the
enterprise dashboard. Every route here requires an authenticated admin except
where noted."""
import datetime as dt
import threading
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, SessionLocal
from app.core.security import hash_password
from app.models.db_models import (
    Organization, User, Dataset, TrainingJob, ModelVersion, Document, Analysis,
)
from app.api.deps import require_admin, get_current_user
from app.services.enterprise.dataset_service import safe_extract_zip, validate_dataset, DatasetValidationError
from app.services.enterprise.audit import log_event

router = APIRouter(prefix="/enterprise", tags=["enterprise"])


# ---------------------------------------------------------------- datasets ----

@router.post("/datasets/upload")
def upload_dataset(file: UploadFile = File(...), user: User = Depends(require_admin), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are accepted")
    contents = file.file.read()
    if len(contents) > settings.max_dataset_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Limit is {settings.max_dataset_mb}MB.")

    dataset = Dataset(organization_id=user.organization_id, filename=file.filename, extracted_path="")
    db.add(dataset)
    db.flush()

    extract_dir = settings.enterprise_dir / user.organization_id / "datasets" / dataset.id
    try:
        safe_extract_zip(contents, extract_dir)
        report = validate_dataset(extract_dir)
    except DatasetValidationError as exc:
        db.rollback()
        raise HTTPException(400, str(exc)) from exc

    dataset.extracted_path = str(extract_dir)
    dataset.genuine_count = report["genuine_count"]
    dataset.forged_count = report["forged_count"]
    dataset.forgery_type_counts = report["forgery_type_counts"]
    dataset.status = "validated" if report["ready_for_training"] else "invalid"
    dataset.validation_report = report
    db.commit()
    db.refresh(dataset)

    log_event(db, user.organization_id, user.id, "dataset_uploaded",
              f"{file.filename} ({report['genuine_count']} genuine / {report['forged_count']} forged)")
    return _dataset_out(dataset)


@router.get("/datasets")
def list_datasets(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Dataset).filter(Dataset.organization_id == user.organization_id) \
        .order_by(Dataset.created_at.desc()).all()
    return {"datasets": [_dataset_out(d) for d in rows]}


def _dataset_out(d: Dataset) -> dict:
    return {"id": d.id, "filename": d.filename, "genuine_count": d.genuine_count,
            "forged_count": d.forged_count, "forgery_type_counts": d.forgery_type_counts,
            "status": d.status, "validation_report": d.validation_report, "created_at": d.created_at}


# ---------------------------------------------------------------- training ----

TRAINING_STAGES = ["dataset_preparation", "feature_extraction", "train_validation_split",
                    "model_training", "cross_validation", "evaluation", "model_packaging", "completed"]


class TrainRequest(BaseModel):
    dataset_id: str
    model_name: str = "Organization Forensics"


@router.post("/train")
def start_training(body: TrainRequest, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    dataset = db.get(Dataset, body.dataset_id)
    if not dataset or dataset.organization_id != user.organization_id:
        raise HTTPException(404, "Dataset not found")
    if dataset.status != "validated":
        raise HTTPException(400, "Dataset is not ready for training -- see its validation report")

    job = TrainingJob(organization_id=user.organization_id, dataset_id=dataset.id, status="running",
                       stages=[{"name": s, "status": "pending", "at": None} for s in TRAINING_STAGES])
    db.add(job)
    db.commit()
    db.refresh(job)

    log_event(db, user.organization_id, user.id, "training_started", f"dataset={dataset.filename}")

    thread = threading.Thread(
        target=_run_training_job,
        args=(job.id, dataset.id, user.organization_id, user.id, body.model_name),
        daemon=True,
    )
    thread.start()
    return {"training_job_id": job.id, "status": job.status}


def _run_training_job(job_id: str, dataset_id: str, org_id: str, user_id: str, model_name: str) -> None:
    """Runs in a background thread with its OWN DB session (SQLAlchemy sessions are
    not thread-safe to share with the request thread). Updates TrainingJob.stages
    after each real stage completes so the frontend can poll for genuine progress."""
    from app.services.pipeline import analyze_document
    from ml.training.dataset_loader import load_dataset_paths
    from ml.training.train_enterprise_model import train_enterprise_model

    db = SessionLocal()
    try:
        job = db.get(TrainingJob, job_id)
        dataset = db.get(Dataset, dataset_id)
        report = dataset.validation_report or {}
        items = load_dataset_paths(report.get("genuine_paths", []), report.get("forged_paths", []))

        def on_stage(name: str, status: str):
            # Build a genuinely NEW list (not mutate-in-place) so SQLAlchemy's change
            # detection on the JSON column actually fires an UPDATE -- reassigning the
            # same list object after in-place mutation is silently a no-op otherwise.
            new_stages = [dict(s) for s in job.stages]
            for s in new_stages:
                if s["name"] == name:
                    s["status"] = status
                    s["at"] = dt.datetime.utcnow().isoformat()
            job.stages = new_stages
            db.commit()

        model, metrics, notes = train_enterprise_model(items, analyze_document, on_stage=on_stage)

        existing_versions = db.query(ModelVersion).filter(
            ModelVersion.organization_id == org_id, ModelVersion.name == model_name).count()
        version_label = f"v1.{existing_versions}" if existing_versions else "v1.0"
        model_path = settings.enterprise_dir / org_id / "models" / f"{model_name.replace(' ', '_')}_{version_label}.joblib"
        model.save(model_path)

        mv = ModelVersion(
            organization_id=org_id, name=model_name, version=version_label, algorithm=model.algorithm,
            dataset_id=dataset_id, feature_schema=model.feature_schema,
            metrics={"accuracy": metrics.accuracy, "precision": metrics.precision, "recall": metrics.recall,
                     "f1": metrics.f1, "roc_auc": metrics.roc_auc, "train_size": metrics.train_size,
                     "val_size": metrics.val_size, "test_size": metrics.test_size, **notes[0]},
            status="archived", model_path=str(model_path),
        )
        db.add(mv)
        db.commit()
        db.refresh(mv)

        job.status = "completed"
        job.model_version_id = mv.id
        job.completed_at = dt.datetime.utcnow()
        db.commit()
        log_event(db, org_id, user_id, "model_trained", f"{model_name} {version_label} (F1={metrics.f1})")
    except Exception as exc:
        job = db.get(TrainingJob, job_id)
        if job:
            job.status = "failed"
            job.error = str(exc)
            db.commit()
        log_event(db, org_id, user_id, "training_failed", str(exc)[:200])
    finally:
        db.close()


@router.get("/training-jobs/{job_id}")
def get_training_job(job_id: str, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    job = db.get(TrainingJob, job_id)
    if not job or job.organization_id != user.organization_id:
        raise HTTPException(404, "Training job not found")
    return {"id": job.id, "status": job.status, "stages": job.stages, "error": job.error,
            "model_version_id": job.model_version_id, "created_at": job.created_at,
            "completed_at": job.completed_at}


# ------------------------------------------------------------- model registry ----

@router.get("/models")
def list_models(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ModelVersion).filter(ModelVersion.organization_id == user.organization_id) \
        .order_by(ModelVersion.created_at.desc()).all()
    return {"models": [_model_out(m) for m in rows]}


@router.post("/models/{model_id}/activate")
def activate_model(model_id: str, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    model = db.get(ModelVersion, model_id)
    if not model or model.organization_id != user.organization_id:
        raise HTTPException(404, "Model not found")

    previously_active = db.query(ModelVersion).filter(
        ModelVersion.organization_id == user.organization_id, ModelVersion.name == model.name,
        ModelVersion.status == "active").all()
    for m in previously_active:
        m.status = "archived"
    model.status = "active"
    db.commit()

    log_event(db, user.organization_id, user.id, "model_activated", f"{model.name} {model.version}")
    return _model_out(model)


def _model_out(m: ModelVersion) -> dict:
    return {"id": m.id, "name": m.name, "version": m.version, "algorithm": m.algorithm,
            "metrics": m.metrics, "status": m.status, "created_at": m.created_at}


# --------------------------------------------------------------------- users ----

class AddUserRequest(BaseModel):
    email: str
    password: str
    role: str = "hr"


@router.get("/users")
def list_users(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.organization_id == user.organization_id).order_by(User.created_at).all()
    return {"users": [_user_out(u) for u in rows]}


@router.post("/users")
def add_user(body: AddUserRequest, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.api.auth_routes import EMAIL_RE
    if not EMAIL_RE.match(body.email):
        raise HTTPException(400, "Invalid email address")
    if body.role not in ("admin", "hr", "viewer"):
        raise HTTPException(400, "Invalid role")
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(400, "A user with this email already exists")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    new_user = User(organization_id=user.organization_id, email=body.email.lower(),
                     password_hash=hash_password(body.password), role=body.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    log_event(db, user.organization_id, user.id, "user_added", f"{new_user.email} ({new_user.role})")
    return _user_out(new_user)


@router.patch("/users/{user_id}")
def update_user(user_id: str, status: str | None = None, role: str | None = None,
                 user: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target or target.organization_id != user.organization_id:
        raise HTTPException(404, "User not found")
    if status:
        target.status = status
    if role:
        target.role = role
    db.commit()
    log_event(db, user.organization_id, user.id, "user_updated", f"{target.email}: status={status} role={role}")
    return _user_out(target)


def _user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "role": u.role, "status": u.status,
            "created_at": u.created_at, "last_active_at": u.last_active_at}


# ---------------------------------------------------------------- audit log ----

@router.get("/audit-log")
def get_audit_log(user: User = Depends(require_admin), db: Session = Depends(get_db), limit: int = 100):
    from app.models.db_models import AuditLog
    rows = db.query(AuditLog).filter(AuditLog.organization_id == user.organization_id) \
        .order_by(AuditLog.created_at.desc()).limit(limit).all()
    users_by_id = {u.id: u.email for u in db.query(User).filter(User.organization_id == user.organization_id)}
    return {"events": [
        {"id": r.id, "event": r.event, "detail": r.detail, "created_at": r.created_at,
         "user_email": users_by_id.get(r.user_id, "system")}
        for r in rows
    ]}


# --------------------------------------------------------------- dashboard ----

@router.get("/dashboard")
def enterprise_dashboard(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    org = db.get(Organization, user.organization_id)
    active_model = db.query(ModelVersion).filter(
        ModelVersion.organization_id == org.id, ModelVersion.status == "active").first()

    docs = db.query(Document).filter(Document.organization_id == org.id).all()
    analyzed = [d for d in docs if d.analyses]
    by_risk = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for d in analyzed:
        latest = sorted(d.analyses, key=lambda a: a.created_at)[-1]
        by_risk[latest.risk_level] = by_risk.get(latest.risk_level, 0) + 1

    recent_training = db.query(TrainingJob).filter(TrainingJob.organization_id == org.id) \
        .order_by(TrainingJob.created_at.desc()).limit(5).all()
    all_models = db.query(ModelVersion).filter(ModelVersion.organization_id == org.id) \
        .order_by(ModelVersion.created_at.desc()).all()

    return {
        "organization": {"id": org.id, "name": org.name},
        "active_model": _model_out(active_model) if active_model else None,
        "total_investigations": len(analyzed),
        "high_risk": by_risk["HIGH"], "medium_risk": by_risk["MEDIUM"], "low_risk": by_risk["LOW"],
        "available_models": [_model_out(m) for m in all_models],
        "recent_training": [
            {"id": j.id, "status": j.status, "dataset_id": j.dataset_id, "created_at": j.created_at,
             "model_version_id": j.model_version_id} for j in recent_training
        ],
    }
