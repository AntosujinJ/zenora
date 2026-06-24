"""Doctor dashboard API — a doctor sees/edits their own profile + availability,
and views their appointments, patients, and patient records.

Scoped by the doctor_id embedded in the logged-in doctor's JWT.
"""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..db import DB
from ..models import DoctorAvailability
from .admin import current_staff
from .patients import ALLOWED_UPLOAD_EXTS, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR

router = APIRouter(prefix="/api/doctor", tags=["doctor"])


async def current_doctor(staff=Depends(current_staff)):
    if staff.get("role") != "doctor" or not staff.get("doctor_id"):
        raise HTTPException(status_code=403, detail="Doctor access required")
    return staff


@router.get("/me")
async def me(doc=Depends(current_doctor)):
    d = await DB.doctors.find_one({"id": doc["doctor_id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    d.pop("_id", None)
    return d


@router.put("/availability")
async def update_availability(body: DoctorAvailability, doc=Depends(current_doctor)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await DB.doctors.update_one({"id": doc["doctor_id"]}, {"$set": updates})
    d = await DB.doctors.find_one({"id": doc["doctor_id"]})
    d.pop("_id", None)
    return d


@router.get("/appointments")
async def appointments(scope: str = "upcoming", doc=Depends(current_doctor)):
    today = datetime.now().strftime("%Y-%m-%d")
    q = {"doctor_id": doc["doctor_id"]}
    if scope == "today":
        q["date"] = today
    elif scope == "upcoming":
        q["date"] = {"$gte": today}
        q["status"] = {"$ne": "cancelled"}
    rows = await DB.appointments.find(q).sort([("date", 1), ("time", 1)]).to_list(length=500)
    for a in rows:
        a.pop("_id", None)
    return rows


@router.post("/appointments/{appt_id}/complete")
async def complete_appointment(appt_id: str, doc=Depends(current_doctor)):
    appt = await DB.appointments.find_one({"id": appt_id, "doctor_id": doc["doctor_id"]})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot complete a cancelled appointment.")
    await DB.appointments.update_one({"id": appt_id}, {"$set": {"status": "completed"}})
    return {"ok": True, "id": appt_id, "status": "completed"}


@router.post("/patients/{patient_id}/records")
async def add_record(
    patient_id: str,
    note: str = Form(""),
    appointment_id: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    doc=Depends(current_doctor),
):
    if not await DB.patients.find_one({"patient_id": patient_id}):
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
        attachments.append({"filename": f.filename, "url": f"/api/uploads/{stored}", "ocr_text": ""})

    rec = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "note": note.strip(),
        "transcript": "",
        "doctor_id": doc["doctor_id"],          # scoped to this doctor
        "appointment_id": appointment_id,
        "attachments": attachments,
        "created_by": doc.get("name") or doc.get("sub") or "Doctor",
        "created_at": datetime.utcnow(),
    }
    await DB.records.insert_one(rec)
    rec.pop("_id", None)
    return rec


@router.get("/patients")
async def patients(doc=Depends(current_doctor)):
    """Distinct patients who have booked this doctor, with visit counts."""
    appts = await DB.appointments.find({"doctor_id": doc["doctor_id"]}).to_list(length=2000)
    by_patient: dict[str, dict] = {}
    for a in appts:
        pid = a.get("patient_id")
        if not pid:
            continue
        info = by_patient.setdefault(pid, {"patient_id": pid, "visits": 0, "last_date": ""})
        info["visits"] += 1
        if a["date"] > info["last_date"]:
            info["last_date"] = a["date"]

    out = []
    for pid, info in by_patient.items():
        p = await DB.patients.find_one({"patient_id": pid})
        if p:
            info["name"] = p.get("name", "")
            info["phone"] = p.get("phone", "")
            info["email"] = p.get("email")
        out.append(info)
    out.sort(key=lambda x: x["last_date"], reverse=True)
    return out


@router.get("/patients/{patient_id}")
async def patient_detail(patient_id: str, doc=Depends(current_doctor)):
    p = await DB.patients.find_one({"patient_id": patient_id})
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    p.pop("_id", None)

    # only this doctor's appointments with the patient
    appts = await DB.appointments.find(
        {"patient_id": patient_id, "doctor_id": doc["doctor_id"]}
    ).sort([("date", -1)]).to_list(length=200)
    for a in appts:
        a.pop("_id", None)

    # only records from THIS doctor's appointments (or attributed to this doctor) —
    # a doctor shouldn't see records from another doctor's visits.
    my_appt_ids = [a["id"] for a in appts]
    recs = await DB.records.find({
        "patient_id": patient_id,
        "$or": [
            {"appointment_id": {"$in": my_appt_ids}},
            {"doctor_id": doc["doctor_id"]},
        ],
    }).sort("created_at", -1).to_list(length=200)
    for r in recs:
        r.pop("_id", None)

    return {"patient": p, "appointments": appts, "records": recs}
