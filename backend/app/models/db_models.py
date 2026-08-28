import uuid
import datetime as dt

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_id() -> str:
    return uuid.uuid4().hex[:12]


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_id)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    sha256 = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    category = Column(String, default="unknown")  # identity | education | unknown
    pages = Column(Integer, default=1)
    size_bytes = Column(Integer, default=0)
    status = Column(String, default="uploaded")  # uploaded | analyzing | complete | failed
    case_number = Column(String, default="")
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    analyses = relationship("Analysis", back_populates="document", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"))
    authenticity_score = Column(Float, default=0.0)
    forensic_risk = Column(Float, default=0.0)
    risk_level = Column(String, default="UNKNOWN")
    confidence = Column(Float, default=0.0)
    evidence = Column(JSON, default=dict)
    evidence_list = Column(JSON, default=list)
    regions = Column(JSON, default=list)
    ocr_result = Column(JSON, default=list)
    forgery_types = Column(JSON, default=list)
    explanation = Column(JSON, default=dict)
    model_version = Column(String, default="docuverify-fusion-v0.1")
    timing_ms = Column(JSON, default=dict)
    stage_summaries = Column(JSON, default=dict)
    page_size = Column(JSON, default=list)
    # Set only when the analyzing user belongs to an organization with an active
    # EnterpriseDocumentClassifier -- see ml/inference/enterprise_predictor.py.
    enterprise_model_id = Column(String, ForeignKey("model_versions.id"), nullable=True)
    enterprise_assessment = Column(JSON, default=dict)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    document = relationship("Document", back_populates="analyses")


class Organization(Base):
    """A tenant. Every enterprise record (users, datasets, models, audit log) is
    scoped to one organization_id -- simple local-DB multi-tenancy, not a distributed
    system, which is appropriate for this hackathon's scope (see SECURITY.md)."""
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    datasets = relationship("Dataset", back_populates="organization", cascade="all, delete-orphan")
    models = relationship("ModelVersion", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)  # PBKDF2-HMAC-SHA256, see app/core/security.py
    role = Column(String, default="hr")  # admin | hr | viewer
    status = Column(String, default="active")  # active | disabled
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    last_active_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="users")


class Dataset(Base):
    """One uploaded+validated organization training dataset (a ZIP of genuine/forged
    document images, safely extracted -- see app/services/enterprise/dataset_service.py)."""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    filename = Column(String, nullable=False)
    extracted_path = Column(String, nullable=False)
    genuine_count = Column(Integer, default=0)
    forged_count = Column(Integer, default=0)
    forgery_type_counts = Column(JSON, default=dict)
    status = Column(String, default="uploaded")  # uploaded | validated | invalid
    validation_report = Column(JSON, default=dict)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    organization = relationship("Organization", back_populates="datasets")


class TrainingJob(Base):
    """One run of ml/training/train_enterprise_model.py against a Dataset. Stage
    timestamps let the UI show real (not simulated) stage-based progress."""
    __tablename__ = "training_jobs"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    status = Column(String, default="pending")  # pending | running | completed | failed
    stages = Column(JSON, default=list)  # [{"name": "...", "status": "...", "at": "..."}]
    model_version_id = Column(String, ForeignKey("model_versions.id"), nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class ModelVersion(Base):
    """A trained EnterpriseDocumentClassifier. model_path points at a joblib file this
    backend itself wrote (see ml/models/enterprise_classifier.py) -- never a path
    derived from user-supplied input, and never deserialized from an uploaded file."""
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g. "Certificate Forensics"
    version = Column(String, nullable=False)  # e.g. "v1.0"
    algorithm = Column(String, nullable=False)  # "RandomForestClassifier" | "LogisticRegression"
    dataset_id = Column(String, ForeignKey("datasets.id"), nullable=False)
    feature_schema = Column(JSON, default=list)
    metrics = Column(JSON, default=dict)  # {"accuracy":..,"precision":..,"recall":..,"f1":..,"roc_auc":..}
    status = Column(String, default="archived")  # active | archived
    model_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    organization = relationship("Organization", back_populates="models")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_id)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    event = Column(String, nullable=False)
    detail = Column(String, default="")
    created_at = Column(DateTime, default=dt.datetime.utcnow)
