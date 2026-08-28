import datetime as dt

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    category: str
    pages: int
    size_bytes: int
    status: str
    created_at: dt.datetime

    class Config:
        from_attributes = True


class AnalysisOut(BaseModel):
    id: str
    document_id: str
    authenticity_score: float
    risk_level: str
    confidence: float
    evidence: dict
    regions: list
    ocr_result: list
    forgery_types: list
    explanation: dict
    model_version: str
    timing_ms: dict
    created_at: dt.datetime

    class Config:
        from_attributes = True
