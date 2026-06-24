"""Patient identity + records: stable Patient IDs and de-duplication.

A patient is matched (in order) by Patient ID, then phone, then email. If none
match, a new patient is created with the next sequential ID (e.g. ZN-0001).
"""
import re
from datetime import datetime

from pymongo.errors import DuplicateKeyError

from ..db import DB


async def _max_existing_seq() -> int:
    """Highest ZN-#### number currently in the patients collection."""
    top = await DB.patients.find({"patient_id": {"$regex": r"^ZN-\d+$"}}) \
        .sort("patient_id", -1).limit(1).to_list(1)
    if not top:
        return 0
    try:
        return int(top[0]["patient_id"].split("-")[1])
    except (ValueError, IndexError):
        return 0


async def _next_patient_id() -> str:
    """Allocate a Patient ID that has never been used. Atomic counter, but if it
    ever falls behind the real data (e.g. a partial DB reset/restore), repair it
    from the max existing ID and retry — so we never hand out a duplicate."""
    for _ in range(6):
        doc = await DB.counters.find_one_and_update(
            {"_id": "patient"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,  # ReturnDocument.AFTER
        )
        pid = f"ZN-{doc['seq']:04d}"
        if not await DB.patients.find_one({"patient_id": pid}):
            return pid
        # Counter is behind existing data — bump it past the real max and retry.
        await DB.counters.update_one(
            {"_id": "patient"}, {"$max": {"seq": await _max_existing_seq()}}, upsert=True
        )
    raise RuntimeError("Could not allocate a unique patient ID")


def _norm_phone(phone: str | None) -> str:
    return re.sub(r"\D", "", phone or "")


async def verify_patient(patient_id: str, phone: str):
    """Securely confirm a returning patient: BOTH Patient ID and phone must match
    the same record. Prevents enumerating patients by guessing sequential IDs."""
    if not patient_id or not phone:
        return None
    p = await DB.patients.find_one(
        {"patient_id": patient_id.strip().upper(), "phone_norm": _norm_phone(phone)}
    )
    if p:
        p.pop("_id", None)
    return p


async def find_patient(patient_id=None, phone=None, email=None):
    if patient_id:
        p = await DB.patients.find_one({"patient_id": patient_id.strip().upper()})
        if p:
            return p
    if phone:
        p = await DB.patients.find_one({"phone_norm": _norm_phone(phone)})
        if p:
            return p
    if email:
        p = await DB.patients.find_one({"email": email.strip().lower()})
        if p:
            return p
    return None


async def resolve_patient(name, phone, email, patient_id=None):
    """Return (patient_dict, is_new). Creates a new patient if none matches."""
    existing = await find_patient(patient_id, phone, email)
    if existing:
        # Backfill any newly provided contact info.
        updates = {}
        if email and not existing.get("email"):
            updates["email"] = email.strip().lower()
        if phone and not existing.get("phone"):
            updates["phone"] = phone
            updates["phone_norm"] = _norm_phone(phone)
        if updates:
            await DB.patients.update_one({"patient_id": existing["patient_id"]}, {"$set": updates})
            existing.update(updates)
        existing.pop("_id", None)
        return existing, False

    base = {
        "name": name,
        "phone": phone or "",
        "phone_norm": _norm_phone(phone),
        "email": (email or "").strip().lower() or None,
        "created_at": datetime.utcnow(),
    }
    for _ in range(6):  # retry if two signups race for the same fresh ID
        patient = {"patient_id": await _next_patient_id(), **base}
        try:
            await DB.patients.insert_one(patient)
            patient.pop("_id", None)
            return patient, True
        except DuplicateKeyError:
            continue
    raise RuntimeError("Could not create a unique patient record")


async def get_patient(patient_id: str):
    p = await DB.patients.find_one({"patient_id": patient_id})
    if p:
        p.pop("_id", None)
    return p


async def search_patients(query: str = "", limit: int = 100):
    q = {}
    if query:
        rx = {"$regex": re.escape(query), "$options": "i"}
        q = {"$or": [
            {"patient_id": rx},
            {"name": rx},
            {"phone": rx},
            {"email": rx},
        ]}
    rows = await DB.patients.find(q).sort("created_at", -1).to_list(length=limit)
    for r in rows:
        r.pop("_id", None)
    return rows
