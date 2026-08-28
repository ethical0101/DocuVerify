"""Enterprise audit log. Records WHO did WHAT and WHEN, never document contents --
see SECURITY.md."""
from sqlalchemy.orm import Session

from app.models.db_models import AuditLog


def log_event(db: Session, organization_id: str | None, user_id: str | None,
               event: str, detail: str = "") -> None:
    db.add(AuditLog(organization_id=organization_id, user_id=user_id, event=event, detail=detail))
    db.commit()
