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
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    analyses = relationship("Analysis", back_populates="document", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=gen_id)
    document_id = Column(String, ForeignKey("documents.id"))
    authenticity_score = Column(Float, default=0.0)
    risk_level = Column(String, default="UNKNOWN")
    confidence = Column(Float, default=0.0)
    evidence = Column(JSON, default=dict)
    regions = Column(JSON, default=list)
    ocr_result = Column(JSON, default=list)
    forgery_types = Column(JSON, default=list)
    explanation = Column(JSON, default=dict)
    model_version = Column(String, default="docuverify-fusion-v0.1")
    timing_ms = Column(JSON, default=dict)
    page_size = Column(JSON, default=list)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    document = relationship("Document", back_populates="analyses")
