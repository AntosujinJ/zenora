"""Grounds the AI receptionist in REAL availability so it can't hallucinate.

Parses the user's latest message for a doctor + date (+ optional time), looks up
the actual open slots from the booking service, and returns a FACTS string that
the system prompt forces the model to rely on for any availability question.
"""
import re
from datetime import datetime, timedelta

from ..db import DB
from . import booking

WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MONTHS = {
    m: i
    for i, m in enumerate(
        ["january", "february", "march", "april", "may", "june", "july", "august",
         "september", "october", "november", "december"],
        start=1,
    )
}


def _safe_md(month: int, day: int, today):
    try:
        d = datetime(today.year, month, day).date()
    except ValueError:
        return None
    if d < today:  # date already passed this year -> assume next year
        try:
            d = datetime(today.year + 1, month, day).date()
        except ValueError:
            return None
    return d


def _parse_date(text: str):
    t = text.lower()
    today = datetime.now().date()
    if "day after tomorrow" in t:
        return today + timedelta(days=2)
    if "tomorrow" in t:
        return today + timedelta(days=1)
    if "today" in t or "tonight" in t:
        return today
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", t)
    if m:
        try:
            return datetime.strptime(m.group(1), "%Y-%m-%d").date()
        except ValueError:
            pass
    m = re.search(r"\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b", t)
    if m and m.group(1) in MONTHS:
        return _safe_md(MONTHS[m.group(1)], int(m.group(2)), today)
    m = re.search(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b", t)
    if m and m.group(2) in MONTHS:
        return _safe_md(MONTHS[m.group(2)], int(m.group(1)), today)
    for i, wd in enumerate(WEEKDAYS):
        if wd in t:
            ahead = (i - today.weekday()) % 7
            return today + timedelta(days=ahead)
    return None


def _parse_time(text: str):
    t = text.lower()
    m = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)", t)
    if m:
        h = int(m.group(1))
        mm = int(m.group(2) or 0)
        ap = m.group(3).replace(".", "")
        if ap == "pm" and h != 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
        return f"{h:02d}:{mm:02d}"
    m = re.search(r"\b(\d{1,2}):(\d{2})\b", t)  # 24h / colon time, no am-pm
    if m:
        h, mm = int(m.group(1)), int(m.group(2))
        if 0 <= h <= 23 and 0 <= mm <= 59:
            return f"{h:02d}:{mm:02d}"
    return None


async def _match_doctor(text: str):
    t = text.lower()
    best = None
    for d in await DB.doctors.find().to_list(length=50):
        name = d["name"].lower()
        if name in t:  # full-name match wins outright
            return d
        for part in name.split():
            if re.search(rf"\b{re.escape(part)}\b", t):
                best = d
    return best


def _friendly(date_str: str) -> str:
    # Pre-format so the small model copies the date instead of miscomputing it.
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%A, %d %B %Y")


async def _next_availability(doctor_id: str):
    today = datetime.now().date()
    for i in range(14):
        d = (today + timedelta(days=i)).strftime("%Y-%m-%d")
        slots = await booking.available_slots(doctor_id, d)
        if slots:
            return d, slots
    return None


async def availability_facts(text: str) -> str:
    """Return an authoritative availability string, or '' if nothing to ground."""
    doctor = await _match_doctor(text)
    if not doctor:
        return ""
    dname = f"Dr. {doctor['name']}"
    date = _parse_date(text)

    if not date:
        nxt = await _next_availability(doctor["id"])
        if nxt:
            d, slots = nxt
            return f"{dname}: next open day is {_friendly(d)}; open times: {', '.join(slots[:8])}."
        return f"{dname}: no open slots in the next two weeks."

    date_str = date.strftime("%Y-%m-%d")
    slots = await booking.available_slots(doctor["id"], date_str)
    friendly = _friendly(date_str)

    if not slots:
        if date.weekday() not in doctor.get("work_days", [0, 1, 2, 3, 4, 5]):
            fact = f"{dname} does NOT work on {friendly}."
        else:
            fact = f"{dname} is FULLY BOOKED on {friendly} — no open slots."
    else:
        fact = f"{dname} open slots on {friendly}: {', '.join(slots)}."

    req_time = _parse_time(text)
    if req_time:
        ok = req_time in slots
        fact += f" The {req_time} slot specifically is {'AVAILABLE' if ok else 'NOT available'}."
    return fact
