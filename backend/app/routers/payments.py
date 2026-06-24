"""Payments via Razorpay, with a DEMO fallback when no keys are configured.

Flow: frontend asks for an order -> opens Razorpay checkout -> sends the result
back to /verify -> we check the signature and mark the appointment paid.
"""
import hashlib
import hmac
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..db import DB

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _live() -> bool:
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


class OrderRequest(BaseModel):
    amount_inr: int | None = None
    appointment_id: str | None = None


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""
    appointment_id: str | None = None


@router.get("/config")
async def config():
    return {
        "live": _live(),
        "key_id": settings.razorpay_key_id,
        "consultation_fee_inr": settings.consultation_fee_inr,
    }


@router.post("/order")
async def create_order(req: OrderRequest):
    amount = int(req.amount_inr or settings.consultation_fee_inr)
    paise = amount * 100

    if not _live():
        # DEMO: no real gateway — return a fake order the frontend can "pay".
        return {"demo": True, "order_id": f"demo_{uuid.uuid4().hex}", "amount_inr": amount}

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://api.razorpay.com/v1/orders",
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            json={"amount": paise, "currency": "INR", "receipt": f"appt_{req.appointment_id or uuid.uuid4().hex}"},
        )
        r.raise_for_status()
        order = r.json()
    return {
        "demo": False,
        "order_id": order["id"],
        "amount_inr": amount,
        "key_id": settings.razorpay_key_id,
    }


async def _mark_paid(appointment_id: str | None, amount: int, payment_id: str):
    if appointment_id:
        await DB.appointments.update_one(
            {"id": appointment_id},
            {"$set": {
                "payment_status": "paid",
                "paid_amount": amount,
                "payment_method": "online",
                "payment_id": payment_id,
                "paid_date": datetime.now().strftime("%Y-%m-%d"),
            }},
        )


@router.post("/verify")
async def verify(req: VerifyRequest):
    # DEMO order — accept without a real gateway.
    if req.razorpay_order_id.startswith("demo_"):
        await _mark_paid(req.appointment_id, settings.consultation_fee_inr, "demo_payment")
        return {"ok": True, "paid": True, "demo": True}

    # Live: verify the HMAC signature Razorpay sends back.
    body = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode()
    expected = hmac.new(settings.razorpay_key_secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")
    await _mark_paid(req.appointment_id, settings.consultation_fee_inr, req.razorpay_payment_id)
    return {"ok": True, "paid": True}
