"""Booking logic: compute free slots and create appointments safely."""
from datetime import datetime, timedelta
import uuid

from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..db import DB
from ..models import AppointmentCreate
from . import patients


def _time_range(start: str, end: str, step_minutes: int) -> list[str]:
    fmt = "%H:%M"
    cur = datetime.strptime(start, fmt)
    stop = datetime.strptime(end, fmt)
    out = []
    while cur < stop:
        out.append(cur.strftime(fmt))
        cur += timedelta(minutes=step_minutes)
    return out


async def available_slots(doctor_id: str, date: str) -> list[str]:
    """All slots the doctor offers on `date` minus already-booked ones."""
    doc = await DB.doctors.find_one({"id": doctor_id})
    if not doc:
        return []

    weekday = datetime.strptime(date, "%Y-%m-%d").weekday()
    if weekday not in doc.get("work_days", [0, 1, 2, 3, 4, 5]):
        return []

    all_slots = _time_range(
        doc.get("work_start", "09:00"),
        doc.get("work_end", "17:00"),
        doc.get("slot_minutes", 30),
    )

    booked = DB.appointments.find(
        {"doctor_id": doctor_id, "date": date, "status": {"$ne": "cancelled"}}
    )
    taken = {a["time"] async for a in booked}

    # If booking for today, drop slots already in the past.
    now = datetime.now()
    if date == now.strftime("%Y-%m-%d"):
        current = now.strftime("%H:%M")
        all_slots = [s for s in all_slots if s > current]

    return [s for s in all_slots if s not in taken]


async def create_appointment(data: AppointmentCreate) -> dict:
    """Create an appointment, rejecting double-bookings."""
    slots = await available_slots(data.doctor_id, data.date)
    if data.time not in slots:
        raise ValueError("That slot is no longer available. Please pick another.")

    # Identify the patient (existing by ID/phone/email, or create a new record).
    patient, is_new = await patients.resolve_patient(
        data.patient_name, data.patient_phone, data.patient_email, data.patient_id
    )

    appt = {
        "id": str(uuid.uuid4()),
        "doctor_id": data.doctor_id,
        "date": data.date,
        "time": data.time,
        "patient_id": patient["patient_id"],
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "patient_email": data.patient_email,
        "reason": data.reason,
        "status": "confirmed",
        "amount_due": data.amount or settings.consultation_fee_inr,
        "payment_status": "unpaid",
        "reminders_sent": [],
        "created_at": datetime.utcnow(),
    }
    try:
        await DB.appointments.insert_one(appt)
    except DuplicateKeyError:
        raise ValueError("That slot was just taken. Please pick another.")

    appt.pop("_id", None)
    appt["is_new_patient"] = is_new  # transient flag for the response
    return appt
