"""Authentication primitives: PBKDF2 password hashing (stdlib, no extra dependency)
and short-lived JWT session tokens (PyJWT). Deliberately minimal -- this is a
hackathon prototype's auth layer, not a hardened enterprise identity system (see
SECURITY.md for the honest threat model)."""
import datetime as dt
import hashlib
import hmac
import os

import jwt

from app.core.config import settings

PBKDF2_ITERATIONS = 200_000
TOKEN_TTL_HOURS = 12


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$")
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_access_token(user_id: str, organization_id: str, role: str) -> str:
    payload = {
        "sub": user_id, "org": organization_id, "role": role,
        "exp": dt.datetime.utcnow() + dt.timedelta(hours=TOKEN_TTL_HOURS),
        "iat": dt.datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
