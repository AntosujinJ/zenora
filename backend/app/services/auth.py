"""Staff authentication: hashed passwords + JWT tokens + user management."""
import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from ..config import settings
from ..db import DB


# ---------------- password hashing (stdlib pbkdf2) ----------------
def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return f"pbkdf2$200000${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, iters, salt_b64, dk_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        got = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, int(iters))
        return hmac.compare_digest(got, expected)
    except Exception:
        return False


# ---------------- JWT ----------------
def create_token(user: dict) -> str:
    payload = {
        "sub": user["username"],
        "name": user.get("name", ""),
        "role": user.get("role", "staff"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours),
    }
    if user.get("doctor_id"):
        payload["doctor_id"] = user["doctor_id"]
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except Exception:
        return None


# ---------------- user management ----------------
def _public(u: dict) -> dict:
    return {
        "username": u["username"],
        "name": u.get("name", ""),
        "role": u.get("role", "staff"),
        "doctor_id": u.get("doctor_id"),
    }


async def authenticate(username: str, password: str) -> dict | None:
    u = await DB.staff.find_one({"username": username.strip().lower()})
    if u and verify_password(password, u["password"]):
        return u
    return None


async def create_staff(username: str, password: str, name: str, role: str = "staff",
                       doctor_id: str | None = None) -> dict:
    username = username.strip().lower()
    if await DB.staff.find_one({"username": username}):
        raise ValueError("That username already exists.")
    role = role if role in ("admin", "staff", "doctor") else "staff"
    if role == "doctor" and not doctor_id:
        raise ValueError("Please link this doctor account to a doctor profile.")
    user = {
        "username": username,
        "name": name.strip() or username,
        "role": role,
        "doctor_id": doctor_id if role == "doctor" else None,
        "password": hash_password(password),
        "created_at": datetime.utcnow(),
    }
    await DB.staff.insert_one(user)
    return _public(user)


async def list_staff() -> list[dict]:
    rows = await DB.staff.find().sort("created_at", 1).to_list(length=200)
    return [_public(u) for u in rows]


async def ensure_default_admin():
    if await DB.staff.count_documents({}) == 0:
        await create_staff(
            settings.default_admin_user, settings.default_admin_pass, "Administrator", "admin"
        )
        print(f"[auth] created default admin '{settings.default_admin_user}' "
              f"(password '{settings.default_admin_pass}') — change it after first login.")
