"""AI receptionist.

Supports two providers (set AI_PROVIDER in .env):
- "gemini": Google Gemini cloud API (free tier) — works anywhere, no GPU. Best
  for deployment / selling.
- "ollama": local Ollama model — free, on-device, no internet.

Replies are streamed token-by-token and grounded in real availability data.
"""
import json
from typing import AsyncIterator

import httpx

from ..config import settings
from ..db import DB
from . import grounding


def _last_user_message(messages: list[dict]) -> str:
    return next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")


async def _clinic_context() -> str:
    doctors = await DB.doctors.find().to_list(length=50)
    lines = [f"- Dr. {d['name']} — {d['specialty']}" for d in doctors]
    roster = "\n".join(lines) if lines else "- (no doctors listed yet)"
    return (
        f"Clinic name: {settings.clinic_name}\n"
        f"Phone: {settings.clinic_phone}\n"
        f"Address: {settings.clinic_address}\n"
        f"Hours: {settings.clinic_hours}\n"
        f"Doctors:\n{roster}"
    )


async def system_prompt(availability: str = "") -> str:
    context = await _clinic_context()
    avail_block = availability if availability else "(no availability looked up for this question)"
    return (
        "You are the friendly virtual receptionist for a medical clinic. "
        "Be warm and BRIEF — 1 to 3 short sentences. You can answer questions "
        "about the clinic, its doctors, hours, and services, and guide patients "
        "to book using the 'Book Appointment' button on the site.\n\n"
        "SAFETY RULES:\n"
        "- You are NOT a doctor. Never diagnose, prescribe, or give medical "
        "advice. If someone describes symptoms, suggest booking with the right "
        "specialist.\n"
        "- For emergencies, tell them to call local emergency services now.\n\n"
        "AVAILABILITY RULES (very important):\n"
        "- You do NOT know the schedule from memory. Answer availability ONLY "
        "from the LIVE AVAILABILITY block below.\n"
        "- NEVER claim a doctor or time is available unless the block explicitly "
        "says so. If it says NOT available / fully booked / does not work, say "
        "that clearly and offer the open times listed (or the Book button).\n"
        "- If the block has no info for what they asked, do NOT guess — ask them "
        "to use the 'Book Appointment' button to see live openings, or to tell "
        "you the doctor and date.\n"
        "- Answer naturally. Do NOT mention 'the availability block', 'live data', "
        "or that you looked anything up — just state the times like a receptionist.\n\n"
        f"LIVE AVAILABILITY (real-time, authoritative):\n{avail_block}\n\n"
        "Clinic information:\n"
        f"{context}"
    )


# ---------------- Gemini ----------------
def _gemini_contents(messages: list[dict]) -> list[dict]:
    # Gemini uses roles "user" and "model" (assistant -> model).
    out = []
    for m in messages:
        role = "model" if m.get("role") == "assistant" else "user"
        out.append({"role": role, "parts": [{"text": m["content"]}]})
    return out


def _gemini_payload(sys: str, messages: list[dict]) -> dict:
    return {
        "system_instruction": {"parts": [{"text": sys}]},
        "contents": _gemini_contents(messages),
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": settings.ollama_num_predict,
        },
    }


def _gemini_url(method: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:{method}"


async def _gemini_chat(sys: str, messages: list[dict]) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            _gemini_url("generateContent"),
            params={"key": settings.gemini_api_key},
            json=_gemini_payload(sys, messages),
        )
        r.raise_for_status()
        data = r.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _gemini_chat_stream(sys: str, messages: list[dict]) -> AsyncIterator[str]:
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            _gemini_url("streamGenerateContent"),
            params={"key": settings.gemini_api_key, "alt": "sse"},
            json=_gemini_payload(sys, messages),
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                chunk = line[5:].strip()
                if not chunk:
                    continue
                try:
                    data = json.loads(chunk)
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                if text:
                    yield text


# ---------------- Ollama (local) ----------------
def _ollama_payload(sys: str, messages: list[dict], stream: bool) -> dict:
    return {
        "model": settings.ollama_model,
        "messages": [{"role": "system", "content": sys}, *messages],
        "stream": stream,
        "keep_alive": settings.ollama_keep_alive,
        "options": {"temperature": 0.4, "num_predict": settings.ollama_num_predict},
    }


async def _ollama_chat(sys: str, messages: list[dict]) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/api/chat", json=_ollama_payload(sys, messages, False)
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"].strip()


async def _ollama_chat_stream(sys: str, messages: list[dict]) -> AsyncIterator[str]:
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST", f"{settings.ollama_base_url}/api/chat", json=_ollama_payload(sys, messages, True)
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                token = json.loads(line).get("message", {}).get("content", "")
                if token:
                    yield token


# ---------------- public API (provider-agnostic) ----------------
async def chat(messages: list[dict]) -> str:
    facts = await grounding.availability_facts(_last_user_message(messages))
    sys = await system_prompt(facts)
    if settings.ai_provider == "gemini":
        return await _gemini_chat(sys, messages)
    return await _ollama_chat(sys, messages)


async def chat_stream(messages: list[dict]) -> AsyncIterator[str]:
    facts = await grounding.availability_facts(_last_user_message(messages))
    sys = await system_prompt(facts)
    if settings.ai_provider == "gemini":
        async for t in _gemini_chat_stream(sys, messages):
            yield t
    else:
        async for t in _ollama_chat_stream(sys, messages):
            yield t


async def warm_up():
    """Only Ollama needs warming (load model into memory). Gemini is cloud."""
    if settings.ai_provider != "ollama":
        return
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False,
                    "keep_alive": settings.ollama_keep_alive,
                    "options": {"num_predict": 1},
                },
            )
    except Exception:
        pass
