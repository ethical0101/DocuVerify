"""FastAPI auth dependencies. Auth is OPTIONAL at the transport level -- most
document-analysis endpoints work unauthenticated (so the core forensic demo keeps
working standalone) but attach organization context when a valid token IS present,
which is what lets the enterprise model layer activate for logged-in HR users."""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.db_models import User


def get_optional_user(
    authorization: str | None = Header(default=None), db: Session = Depends(get_db)
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = decode_access_token(authorization.removeprefix("Bearer ").strip())
    if not payload:
        return None
    user = db.get(User, payload["sub"])
    if not user or user.status != "active":
        return None
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin role required")
    return user
