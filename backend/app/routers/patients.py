"""Patient identity + EMR records.

- Public: /api/patients/lookup  -> detect existing patient at booking time.
- Staff:  /api/admin/patients...-> search, view history + records, add records
          with typed notes, voice transcript, and uploaded document images.
"""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..db import DB
from ..services import auth, patients as patients_svc
from .admin import current_staff

# Upload safety limits.
ALLOWED_UPLOAD_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
ALLOWED_UPLOAD_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB


class PatientCreate(BaseModel):
    name: str
    phone: str = ""
    email: str | None = None

router = APIRouter(prefix="/api", tags=["patients"])

# Uploads live under backend/uploads (which is on the D: drive with the project).
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------- Public: verify a returning patient (ID + phone must BOTH match) ----------
@router.get("/patients/lookup")
async def lookup(patient_id: str = "", phone: str = ""):
    # Requires both Patient ID and the matching phone, so people can't enumerate
    # patients by guessing IDs. Returns minimal info to pre-fill their own form.
    p = await patients_svc.verify_patient(patient_id, phone)
    if not p:
        return {"found": False}
    return {
        "found": True,
        "patient": {
            "patient_id": p["patient_id"],
            "name": p.get("name", ""),
            "email": p.get("email"),
        },
    }


# ---------- Staff: patient list / search ----------
@router.get("/admin/patients", dependencies=[Depends(current_staff)])
async def list_patients(search: str = ""):
    return await patients_svc.search_patients(search)


# ---------- Staff: register a new patient directly ----------
@router.post("/admin/patients", dependencies=[Depends(current_staff)])
async def create_patient(body: PatientCreate):
    patient, is_new = await patients_svc.resolve_patient(body.name, body.phone, body.email)
    return {"patient": patient, "is_new": is_new}


# ---------- Staff: full patient profile (info + history + records) ----------
@router.get("/admin/patients/{patient_id}", dependencies=[Depends(current_staff)])
async def patient_detail(patient_id: str):
    p = await patients_svc.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    docs = {d["id"]: d for d in await DB.doctors.find().to_list(length=100)}
    appts = await DB.appointments.find({"patient_id": patient_id}).sort([("date", -1), ("time", -1)]).to_list(length=200)
    for a in appts:
        a.pop("_id", None)
        a["doctor_name"] = docs.get(a["doctor_id"], {}).get("name", a["doctor_id"])

    recs = await DB.records.find({"patient_id": patient_id}).sort("created_at", -1).to_list(length=200)
    for r in recs:
        r.pop("_id", None)
        r["doctor_name"] = docs.get(r.get("doctor_id"), {}).get("name", r.get("doctor_id") or "")

    return {"patient": p, "appointments": appts, "records": recs}


# ---------- Staff: add a medical record (note + transcript + images) ----------
@router.post("/admin/patients/{patient_id}/records")
async def add_record(
    patient_id: str,
    note: str = Form(""),
    transcript: str = Form(""),
    doctor_id: str | None = Form(None),
    appointment_id: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    staff: dict = Depends(current_staff),
):
    if not await patients_svc.get_patient(patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    attachments = []
    for f in files:
        if not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTS or (f.content_type or "") not in ALLOWED_UPLOAD_TYPES:
            raise HTTPException(status_code=400, detail="Only image files (png, jpg, webp, gif) are allowed.")
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail="Each image must be 5 MB or smaller.")
        stored = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(UPLOAD_DIR, stored), "wb") as out:
            out.write(data)
        attachments.append({
            "filename": f.filename,
            "url": f"/api/uploads/{stored}",
            "ocr_text": "",  # filled in Phase 2 (OCR)
        })

    rec = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "note": note.strip(),
        "transcript": transcript.strip(),
        "doctor_id": doctor_id,
        "appointment_id": appointment_id,
        "attachments": attachments,
        "created_by": staff.get("name") or staff.get("sub") or "Staff",
        "created_at": datetime.utcnow(),
    }
    await DB.records.insert_one(rec)
    rec.pop("_id", None)
    return rec


# ---------- Authenticated document download (no public access to PHI) ----------
@router.get("/uploads/{filename}")
async def get_upload(filename: str, token: str = Query(default=""), authorization: str = ""):
    # accept token from query (so <img src> works) or Authorization header
    if not token and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not auth.decode_token(token):
        raise HTTPException(status_code=401, detail="Not authorized")
    safe = os.path.basename(filename)  # block path traversal
    path = os.path.join(UPLOAD_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
