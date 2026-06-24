import asyncio
import sys
from contextlib import asynccontextmanager

# Windows consoles default to cp1252 and crash on emoji/arrows in log output.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import connect, disconnect
from .routers import admin, appointments, chat, doctor, doctors, patients, payments
from .routers import notifications as notifications_router
from .services import ai, auth, scheduler
from . import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    await auth.ensure_default_admin()  # create the first admin if none exist
    await seed.seed_if_empty()         # add demo doctors on a fresh database
    await ai.warm_up()  # pin the model in VRAM so the first reply is instant
    reminder_task = asyncio.create_task(scheduler.reminder_loop())
    yield
    reminder_task.cancel()
    await disconnect()


app = FastAPI(title="Med MVP API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(chat.router)
app.include_router(notifications_router.router)
app.include_router(admin.router)
app.include_router(patients.router)
app.include_router(doctor.router)
app.include_router(payments.router)


@app.get("/api/clinic")
async def clinic_info():
    return {
        "name": settings.clinic_name,
        "phone": settings.clinic_phone,
        "address": settings.clinic_address,
        "hours": settings.clinic_hours,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
