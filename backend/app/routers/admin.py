"""Staff dashboard API — auth, appointments, stats, staff management.

Protected by a JWT bearer token (obtained from /api/admin/login).
"""
import asyncio
import csv
import io
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from ..db import DB
from ..services import auth, booking, notifications, ratelimit

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------- auth dependencies ----------------
async def current_staff(authorization: str = Header(default="")):
    token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
    payload = auth.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload  # {sub, name, role}


async def require_admin(staff=Depends(current_staff)):
    if staff.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return staff


class LoginRequest(BaseModel):
    username: str
    password: str


class StaffCreate(BaseModel):
    username: str
    password: str
    name: str = ""
    role: str = "staff"
    doctor_id: str | None = None


class RescheduleRequest(BaseModel):
    date: str
    time: str


class PaymentRecord(BaseModel):
    amount: int
    method: str  # cash | card | upi | online


@router.post("/login")
async def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not ratelimit.allow(f"login:{ip}", limit=8, window=60):
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a minute.")
    user = await auth.authenticate(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Wrong username or password")
    return {
        "token": auth.create_token(user),
        "user": {
            "username": user["username"],
            "name": user.get("name", ""),
            "role": user.get("role", "staff"),
            "doctor_id": user.get("doctor_id"),
        },
    }


@router.get("/me", dependencies=[])
async def me(staff=Depends(current_staff)):
    return staff


# ---------------- staff management (admin only) ----------------
@router.get("/staff", dependencies=[Depends(require_admin)])
async def get_staff():
    return await auth.list_staff()


@router.post("/staff", dependencies=[Depends(require_admin)])
async def add_staff(req: StaffCreate):
    try:
        return await auth.create_staff(req.username, req.password, req.name, req.role, req.doctor_id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


async def _doctor_map() -> dict:
    docs = await DB.doctors.find().to_list(length=100)
    return {d["id"]: d for d in docs}


@router.get("/appointments", dependencies=[Depends(current_staff)])
async def list_appointments(
    scope: str = Query("upcoming"),  # upcoming | today | all
    doctor_id: str | None = None,
    status: str | None = None,
    payment: str | None = None,  # paid | unpaid
    search: str | None = None,
):
    today = datetime.now().strftime("%Y-%m-%d")
    q: dict = {}
    if scope == "today":
        q["date"] = today
    elif scope == "upcoming":
        q["date"] = {"$gte": today}
    if doctor_id:
        q["doctor_id"] = doctor_id
    if status:
        q["status"] = status
    if payment == "paid":
        q["payment_status"] = "paid"
    elif payment == "unpaid":
        q["payment_status"] = {"$ne": "paid"}
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        q["$or"] = [{"patient_name": rx}, {"patient_phone": rx}, {"patient_email": rx}]

    docs = await _doctor_map()
    rows = await DB.appointments.find(q).sort([("date", 1), ("time", 1)]).to_list(length=500)
    out = []
    for a in rows:
        a.pop("_id", None)
        doc = docs.get(a["doctor_id"], {})
        a["doctor_name"] = doc.get("name", a["doctor_id"])
        a["doctor_specialty"] = doc.get("specialty", "")
        out.append(a)
    return out


@router.post("/appointments/{appt_id}/cancel", dependencies=[Depends(current_staff)])
async def cancel_appointment(appt_id: str):
    appt = await DB.appointments.find_one({"id": appt_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    already_cancelled = appt.get("status") == "cancelled"
    if not already_cancelled:
        await DB.appointments.update_one({"id": appt_id}, {"$set": {"status": "cancelled"}})
        appt["status"] = "cancelled"
        # Notify the patient in the background so the response stays instant.
        asyncio.create_task(notifications.notify_appointment(appt, kind="cancellation"))

    return {"ok": True, "id": appt_id, "status": "cancelled", "notified": not already_cancelled}


@router.post("/appointments/{appt_id}/reschedule", dependencies=[Depends(current_staff)])
async def reschedule(appt_id: str, req: RescheduleRequest):
    appt = await DB.appointments.find_one({"id": appt_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot reschedule a cancelled appointment.")
    if req.date == appt["date"] and req.time == appt["time"]:
        return {"ok": True, "unchanged": True}

    slots = await booking.available_slots(appt["doctor_id"], req.date)
    if req.time not in slots:
        raise HTTPException(status_code=409, detail="That slot is not available.")
    try:
        await DB.appointments.update_one(
            {"id": appt_id}, {"$set": {"date": req.date, "time": req.time, "reminders_sent": []}}
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="That slot was just taken.")

    appt["date"], appt["time"] = req.date, req.time
    asyncio.create_task(notifications.notify_appointment(appt, kind="reschedule"))
    return {"ok": True, "id": appt_id, "date": req.date, "time": req.time}


@router.post("/appointments/{appt_id}/payment", dependencies=[Depends(current_staff)])
async def record_payment(appt_id: str, req: PaymentRecord):
    appt = await DB.appointments.find_one({"id": appt_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await DB.appointments.update_one(
        {"id": appt_id},
        {"$set": {
            "payment_status": "paid",
            "paid_amount": req.amount,
            "payment_method": req.method,
            "paid_at": datetime.utcnow(),
            "paid_date": datetime.now().strftime("%Y-%m-%d"),
        }},
    )
    return {"ok": True, "paid_amount": req.amount, "payment_method": req.method}


@router.get("/analytics", dependencies=[Depends(require_admin)])
async def analytics(days: int = 30):
    coll = DB.appointments
    today = datetime.now().date()
    start = today - timedelta(days=days - 1)
    start_str = start.strftime("%Y-%m-%d")
    date_list = [(start + timedelta(d)).strftime("%Y-%m-%d") for d in range(days)]

    bk = await coll.aggregate([
        {"$match": {"date": {"$gte": start_str}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
    ]).to_list(1000)
    bk_map = {x["_id"]: x["count"] for x in bk}
    bookings_per_day = [{"date": d[5:], "count": bk_map.get(d, 0)} for d in date_list]

    rv = await coll.aggregate([
        {"$match": {"payment_status": "paid", "paid_date": {"$gte": start_str}}},
        {"$group": {"_id": "$paid_date", "amount": {"$sum": "$paid_amount"}}},
    ]).to_list(1000)
    rv_map = {x["_id"]: x["amount"] for x in rv}
    revenue_per_day = [{"date": d[5:], "amount": rv_map.get(d, 0)} for d in date_list]

    st = await coll.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(50)
    by_status = [{"name": (x["_id"] or "unknown"), "value": x["count"]} for x in st]

    docs = {d["id"]: d.get("name", d["id"]) for d in await DB.doctors.find().to_list(100)}
    bd = await coll.aggregate([
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": "$doctor_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(50)
    by_doctor = [{"name": "Dr. " + docs.get(x["_id"], x["_id"]), "value": x["count"]} for x in bd]

    pm = await coll.aggregate([
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": "$payment_method", "count": {"$sum": 1}, "amount": {"$sum": "$paid_amount"}}},
    ]).to_list(50)
    by_payment = [{"name": (x["_id"] or "other"), "value": x["count"], "amount": x["amount"]} for x in pm]

    total_appts = await coll.count_documents({})
    total_cancelled = await coll.count_documents({"status": "cancelled"})
    return {
        "days": days,
        "bookings_per_day": bookings_per_day,
        "revenue_per_day": revenue_per_day,
        "by_status": by_status,
        "by_doctor": by_doctor,
        "by_payment": by_payment,
        "totals": {
            "appointments": total_appts,
            "patients": await DB.patients.count_documents({}),
            "revenue": sum(x["amount"] for x in pm),
            "cancellation_rate": round(100 * total_cancelled / total_appts) if total_appts else 0,
        },
    }


@router.get("/export/appointments.csv", dependencies=[Depends(require_admin)])
async def export_appointments():
    docs = {d["id"]: d.get("name", d["id"]) for d in await DB.doctors.find().to_list(100)}
    rows = await DB.appointments.find().sort([("date", 1), ("time", 1)]).to_list(10000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date", "Time", "Patient ID", "Patient", "Phone", "Email", "Doctor",
                "Reason", "Status", "Payment", "Amount", "Method"])
    for a in rows:
        w.writerow([
            a.get("date", ""), a.get("time", ""), a.get("patient_id", ""), a.get("patient_name", ""),
            a.get("patient_phone", ""), a.get("patient_email", "") or "",
            docs.get(a.get("doctor_id"), a.get("doctor_id", "")), a.get("reason", ""),
            a.get("status", ""), a.get("payment_status", "unpaid"),
            a.get("paid_amount", ""), a.get("payment_method", ""),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=appointments.csv"},
    )


@router.get("/stats", dependencies=[Depends(current_staff)])
async def stats():
    today = datetime.now().strftime("%Y-%m-%d")
    coll = DB.appointments

    async def _sum(match):
        agg = await coll.aggregate([
            {"$match": match},
            {"$group": {"_id": None, "total": {"$sum": "$paid_amount"}}},
        ]).to_list(1)
        return agg[0]["total"] if agg else 0

    return {
        "today": await coll.count_documents({"date": today, "status": {"$ne": "cancelled"}}),
        "upcoming": await coll.count_documents({"date": {"$gte": today}, "status": {"$ne": "cancelled"}}),
        "total": await coll.count_documents({"status": {"$ne": "cancelled"}}),
        "cancelled": await coll.count_documents({"status": "cancelled"}),
        "collected_today": await _sum({"payment_status": "paid", "paid_date": today}),
        "collected_total": await _sum({"payment_status": "paid"}),
    }
