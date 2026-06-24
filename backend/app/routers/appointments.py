import asyncio

from fastapi import APIRouter, HTTPException, Query

from ..models import AppointmentCreate
from ..services import booking, notifications

router = APIRouter(prefix="/api", tags=["appointments"])


@router.get("/availability")
async def get_availability(
    doctor_id: str = Query(...), date: str = Query(..., description="YYYY-MM-DD")
):
    slots = await booking.available_slots(doctor_id, date)
    return {"doctor_id": doctor_id, "date": date, "slots": slots}


@router.post("/appointments")
async def book(data: AppointmentCreate):
    try:
        appt = await booking.create_appointment(data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Fire the confirmation in the background so booking stays instant.
    asyncio.create_task(notifications.notify_appointment(appt, kind="confirmation"))
    return appt


@router.get("/appointments")
async def list_appointments(date: str | None = None):
    from ..db import DB

    query = {"date": date} if date else {}
    appts = await DB.appointments.find(query, {"_id": 0}).sort("time", 1).to_list(200)
    return appts
