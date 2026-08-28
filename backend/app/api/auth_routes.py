"""Registration (creates an Organization + its first admin User), login, and
/me. Logout is stateless (JWTs are not server-tracked in this build) -- the
client just discards the token; see SECURITY.md for why that's an accepted
trade-off here."""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.db_models import Organization, User
from app.services.enterprise.audit import log_event
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    organization_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def _user_out(user: User) -> dict:
    return {"id": user.id, "email": user.email, "role": user.role,
            "organization_id": user.organization_id, "status": user.status}


@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if not EMAIL_RE.match(body.email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "An account with this email already exists")

    org = Organization(name=body.organization_name.strip() or "Unnamed Organization")
    db.add(org)
    db.flush()  # assigns org.id without committing yet

    user = User(organization_id=org.id, email=body.email.lower(),
                password_hash=hash_password(body.password), role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)

    log_event(db, org.id, user.id, "organization_registered", f"Organization '{org.name}' created")
    token = create_access_token(user.id, org.id, user.role)
    return {"token": token, "user": _user_out(user), "organization": {"id": org.id, "name": org.name}}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if user.status != "active":
        raise HTTPException(403, "This account has been disabled")

    import datetime as dt
    user.last_active_at = dt.datetime.utcnow()
    db.commit()

    log_event(db, user.organization_id, user.id, "user_logged_in", user.email)
    token = create_access_token(user.id, user.organization_id, user.role)
    org = db.get(Organization, user.organization_id)
    return {"token": token, "user": _user_out(user), "organization": {"id": org.id, "name": org.name}}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(Organization, user.organization_id)
    return {"user": _user_out(user), "organization": {"id": org.id, "name": org.name}}
