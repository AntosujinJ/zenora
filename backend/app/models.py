from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class Doctor(BaseModel):
    id: str
    name: str
    specialty: str
    bio: str = ""
    photo: str = ""
    # Working hours used to generate bookable slots.
    work_start: str = "09:00"   # 24h "HH:MM"
    work_end: str = "17:00"
    slot_minutes: int = 30
    # Weekday indices the doctor works (0 = Mon ... 6 = Sun)
    work_days: list[int] = [0, 1, 2, 3, 4, 5]


class AppointmentCreate(BaseModel):
    doctor_id: str
    date: str = Field(..., description="YYYY-MM-DD")
    time: str = Field(..., description="HH:MM (24h)")
    patient_name: str
    patient_phone: str
    patient_email: EmailStr | None = None
    reason: str = ""
    # Returning patients can pass their Patient ID; otherwise we dedup by
    # phone/email and create a new patient record automatically.
    patient_id: str | None = None
    # Expected fee for this visit (e.g. the checkup package price). Falls back to
    # the clinic's consultation fee if not given.
    amount: int | None = None

    @field_validator("patient_email", "patient_id", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        # Treat empty strings from forms as "not provided".
        if isinstance(v, str) and not v.strip():
            return None
        return v


class DoctorAvailability(BaseModel):
    work_start: str | None = None   # "HH:MM"
    work_end: str | None = None
    slot_minutes: int | None = None
    work_days: list[int] | None = None  # 0=Mon ... 6=Sun
    bio: str | None = None


class RecordCreate(BaseModel):
    note: str = ""
    transcript: str = ""  # voice-to-text (Phase 2)
    doctor_id: str | None = None
    appointment_id: str | None = None


class Appointment(AppointmentCreate):
    id: str
    status: str = "confirmed"
    created_at: datetime


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    session_id: str | None = None
