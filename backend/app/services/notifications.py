"""Email + WhatsApp notifications.

If credentials aren't configured, messages are printed to the console instead
of being sent — so the whole flow works out of the box, and you just drop in
your SMTP / WhatsApp keys when you're ready to go live.
"""
import asyncio
import smtplib
import ssl
from email.message import EmailMessage

import httpx

from ..config import settings
from ..db import DB


def _resend_configured() -> bool:
    return bool(settings.resend_api_key)


def _smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _email_configured() -> bool:
    return _resend_configured() or _smtp_configured()


def _whatsapp_configured() -> bool:
    return bool(settings.whatsapp_token and settings.whatsapp_phone_id)


def mode() -> dict:
    """Current send mode per channel — useful for the test endpoint."""
    return {
        "email": "live" if _email_configured() else "console",
        "whatsapp": "live" if _whatsapp_configured() else "console",
    }


def _normalize_phone(phone: str) -> str:
    p = "".join(ch for ch in phone if ch.isdigit())
    if len(p) == 10 and settings.default_country_code:
        p = settings.default_country_code + p
    return p


def _mask(value: str) -> str:
    """Mask PII for logs: a***@x.com / *****6789."""
    if not value:
        return ""
    if "@" in value:
        local, _, domain = value.partition("@")
        return (local[:1] + "***") + "@" + domain
    return "*" * max(0, len(value) - 4) + value[-4:]


# ---------------- senders ----------------
async def _send_email_resend(to: str, subject: str, html: str, text: str):
    """Send via Resend's HTTPS API (works where SMTP ports are blocked)."""
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": f"{settings.clinic_name} <{settings.email_from}>",
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            },
        )
        r.raise_for_status()


def _send_email_sync(to: str, subject: str, html: str, text: str):
    msg = EmailMessage()
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as s:
        s.starttls(context=ssl.create_default_context())
        s.login(settings.smtp_user, settings.smtp_password)
        s.send_message(msg)


async def send_email(to: str, subject: str, html: str, text: str) -> bool:
    if not to:
        return False
    if not _email_configured():
        print(f"\n[EMAIL · console] → {_mask(to)}\nSubject: {subject}\n{text}\n", flush=True)
        return True
    try:
        if _resend_configured():
            await _send_email_resend(to, subject, html, text)
        else:
            await asyncio.to_thread(_send_email_sync, to, subject, html, text)
        print(f"[EMAIL · sent] → {_mask(to)} | {subject}", flush=True)
        return True
    except httpx.HTTPStatusError as e:
        body = e.response.text[:300] if e.response is not None else ""
        print(f"[EMAIL · ERROR] → {_mask(to)}: HTTP {e.response.status_code} {body}", flush=True)
        return False
    except Exception as e:
        print(f"[EMAIL · ERROR] → {_mask(to)}: {type(e).__name__}: {e}", flush=True)
        return False


async def send_whatsapp(to: str, text: str) -> bool:
    if not to:
        return False
    phone = _normalize_phone(to)
    if not _whatsapp_configured():
        print(f"\n[WHATSAPP · console] → {_mask(phone)}\n{text}\n", flush=True)
        return True
    url = f"https://graph.facebook.com/v21.0/{settings.whatsapp_phone_id}/messages"
    headers = {"Authorization": f"Bearer {settings.whatsapp_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
        print(f"[WHATSAPP · sent] → {phone}", flush=True)
        return True
    except Exception as e:
        print(f"[WHATSAPP · ERROR] → {phone}: {e}", flush=True)
        return False


# ---------------- message templates ----------------
async def _doctor_name(doctor_id: str) -> str:
    d = await DB.doctors.find_one({"id": doctor_id})
    return f"Dr. {d['name']}" if d else "your doctor"


def _html(lead: str, doctor: str, when: str, footer: str = "") -> str:
    return f"""\
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
  <div style="background:#0d9488;color:#fff;padding:20px;border-radius:12px 12px 0 0">
    <h2 style="margin:0">{settings.clinic_name}</h2>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px">
    <p style="font-size:16px">{lead}</p>
    <table style="margin:16px 0;font-size:15px">
      <tr><td>🩺</td><td style="padding-left:8px"><b>{doctor}</b></td></tr>
      <tr><td>📅</td><td style="padding-left:8px">{when}</td></tr>
      <tr><td>📍</td><td style="padding-left:8px">{settings.clinic_address}</td></tr>
    </table>
    <p style="color:#666;font-size:13px">{footer or f'Need to reschedule? Call {settings.clinic_phone}.'}</p>
  </div>
</div>"""


async def notify_appointment(appt: dict, kind: str = "confirmation"):
    """Send confirmation or reminder over the enabled channels."""
    doctor = await _doctor_name(appt["doctor_id"])
    when = f"{appt['date']} at {appt['time']}"
    name = appt.get("patient_name", "there")

    if kind == "confirmation":
        subject = f"Your appointment at {settings.clinic_name} is confirmed ✅"
        lead = f"Hi {name}, your appointment is confirmed!"
        footer = f"Reschedule? Call {settings.clinic_phone}."
    elif kind == "cancellation":
        subject = f"Your appointment at {settings.clinic_name} was cancelled ❌"
        lead = f"Hi {name}, your appointment below has been cancelled."
        footer = f"To rebook, visit our website or call {settings.clinic_phone}."
    elif kind == "reschedule":
        subject = f"Your appointment at {settings.clinic_name} was rescheduled 📅"
        lead = f"Hi {name}, your appointment has been moved to the new time below."
        footer = f"Questions? Call {settings.clinic_phone}."
    else:
        subject = f"Reminder: your appointment at {settings.clinic_name} ⏰"
        lead = f"Hi {name}, a friendly reminder about your upcoming visit."
        footer = f"Reschedule? Call {settings.clinic_phone}."

    text = (
        f"{lead}\n\n{doctor}\n{when}\n{settings.clinic_name}\n"
        f"{settings.clinic_address}\n\n{footer}"
    )
    html = _html(lead, doctor, when, footer)

    results = {}
    if settings.notify_email and appt.get("patient_email"):
        results["email"] = await send_email(appt["patient_email"], subject, html, text)
    if settings.notify_whatsapp and appt.get("patient_phone"):
        results["whatsapp"] = await send_whatsapp(appt["patient_phone"], text)
    return results
