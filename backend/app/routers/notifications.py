from fastapi import APIRouter
from pydantic import BaseModel

from ..services import notifications

router = APIRouter(prefix="/api", tags=["notifications"])


class TestRequest(BaseModel):
    channel: str  # "email" or "whatsapp"
    to: str


@router.get("/notifications/status")
async def status():
    return notifications.mode()


@router.post("/notifications/test")
async def test(req: TestRequest):
    if req.channel == "email":
        sent = await notifications.send_email(
            req.to,
            "Test from your clinic ✅",
            "<p>It works! Your email reminders are configured correctly.</p>",
            "It works! Your email reminders are configured correctly.",
        )
    else:
        sent = await notifications.send_whatsapp(
            req.to, "Test ✅ Your WhatsApp reminders are working!"
        )
    return {"sent": sent, "channel": req.channel, "mode": notifications.mode()}
