"""Background loop that sends appointment reminders at the configured offsets.

Every `scheduler_interval_seconds` it scans upcoming appointments and, for each
reminder offset (e.g. 24h and 2h before), sends a reminder once — tracked by the
`reminders_sent` array on each appointment so nothing is sent twice.
"""
import asyncio
from datetime import datetime, timedelta

from ..config import settings
from ..db import DB
from . import notifications


def _appt_datetime(appt: dict) -> datetime | None:
    try:
        return datetime.strptime(f"{appt['date']} {appt['time']}", "%Y-%m-%d %H:%M")
    except (ValueError, KeyError):
        return None


async def process_due_reminders():
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    offsets = settings.reminder_offsets

    cursor = DB.appointments.find(
        {"status": {"$ne": "cancelled"}, "date": {"$gte": today}}
    )
    async for appt in cursor:
        appt_dt = _appt_datetime(appt)
        if not appt_dt or appt_dt < now:
            continue

        already = set(appt.get("reminders_sent", []))
        for offset in offsets:
            if offset in already:
                continue
            send_after = appt_dt - timedelta(minutes=offset)
            if now >= send_after:
                await notifications.notify_appointment(appt, kind="reminder")
                await DB.appointments.update_one(
                    {"id": appt["id"]}, {"$addToSet": {"reminders_sent": offset}}
                )


async def reminder_loop():
    print(
        f"[scheduler] reminder loop started "
        f"(offsets={settings.reminder_offsets} min, "
        f"every {settings.scheduler_interval_seconds}s)"
    )
    while True:
        try:
            await process_due_reminders()
        except Exception as e:
            print(f"[scheduler] error: {e}")
        await asyncio.sleep(settings.scheduler_interval_seconds)
