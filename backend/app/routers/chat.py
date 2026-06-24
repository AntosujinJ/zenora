from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import httpx

from ..db import DB
from ..models import ChatRequest
from ..services import ai, ratelimit

router = APIRouter(prefix="/api", tags=["chat"])


def _check_rate(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not ratelimit.allow(f"chat:{ip}", limit=20, window=60):
        raise HTTPException(status_code=429, detail="Too many messages. Please slow down.")


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, request: Request):
    _check_rate(request)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def gen():
        collected = []
        try:
            async for token in ai.chat_stream(messages):
                collected.append(token)
                yield token
        except httpx.HTTPError:
            yield "\n[Sorry, the assistant is unavailable right now. Please try again, or use the Book Appointment button.]"
            return
        # Log the full conversation once finished.
        reply = "".join(collected)
        await DB.chats.insert_one(
            {
                "session_id": req.session_id,
                "messages": messages + [{"role": "assistant", "content": reply}],
                "at": datetime.utcnow(),
            }
        )

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")


@router.post("/chat")
async def chat(req: ChatRequest, request: Request):
    _check_rate(request)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    try:
        reply = await ai.chat(messages)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is temporarily unavailable. Please try again shortly.",
        )

    # Log the conversation (useful for the clinic dashboard later).
    await DB.chats.insert_one(
        {
            "session_id": req.session_id,
            "messages": messages + [{"role": "assistant", "content": reply}],
            "at": datetime.utcnow(),
        }
    )
    return {"reply": reply}
