# Med MVP — Healthcare clinic website + booking + AI receptionist

A starter SaaS MVP for clinics: an animated marketing website, online appointment
booking, and a 24/7 AI receptionist powered by a **free local Ollama model**.

**Stack:** FastAPI · MongoDB (Motor) · React (Vite + Tailwind + Framer Motion) · Ollama

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) — start it with
  `.\start-mongo.ps1` (stores data on `D:\mongodb` because `C:` is low on space)
- Ollama running with a model pulled (`ollama pull qwen2.5:7b`)

## 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # edit if needed
python -m app.seed            # load sample doctors
uvicorn app.main:app --reload --port 8000
```

API runs at http://localhost:8000 — docs at http://localhost:8000/docs

## 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Website runs at http://localhost:5173 (it proxies `/api` to the backend).

## 3. Ollama (AI receptionist)

The app uses `gemma2:2b` — small, fast, and free.

```powershell
ollama pull gemma2:2b
.\start-ai.ps1          # starts Ollama in CPU mode + warms the model
```

**Why CPU mode?** This machine's RTX 5050 (Blackwell) crashes on the current
Ollama CUDA build (`cudaMalloc failed` / access violation even with VRAM free).
CPU mode is stable and, thanks to streaming + a warm model, replies start in
~250 ms. If you later update Ollama (https://ollama.com/download) and the GPU
works, remove the `CUDA_VISIBLE_DEVICES` line in `start-ai.ps1` for GPU speed.

### Speed tactics baked in
- **Streaming** — reply text appears word-by-word instantly (`/api/chat/stream`).
- **keep_alive "30m"** — model stays warm, no reload lag between messages.
- **Warm-up on startup** — backend loads the model when it boots.
- **num_predict cap** — short, snappy receptionist answers.

---

## How booking works

1. Visitor clicks **Book Appointment** (navbar, hero, or a doctor card).
2. **Step 1** — pick a doctor.
3. **Step 2** — pick a date. The frontend calls `GET /api/availability` and the
   backend returns only free slots = (doctor's working hours split into slots)
   − (already-booked slots) − (past times if today).
4. **Step 3** — enter name / phone / reason.
5. **Confirm** → `POST /api/appointments`. The backend re-checks the slot is still
   free and a **unique index** on `(doctor_id, date, time)` guarantees no
   double-booking even under a race. Returns a confirmation reference.

The AI chat widget (bottom-right) answers questions about the clinic and guides
patients to the booking button. It never diagnoses — safety rules are baked into
the system prompt.

## Staff dashboard

Visit **http://localhost:5173/staff** (or the "Staff login" link in the footer).

- Log in with the **staff key** (`STAFF_KEY` in `.env`, default `zenora-staff-2026`).
- See live **stats** (today / upcoming / total / cancelled).
- **Filter** by scope (upcoming/today/all), doctor, status, or search by
  name/phone/email.
- View every appointment with patient contacts, doctor, reason, and
  **reminder status** (24h / 2h badges).
- **Cancel** an appointment — this frees the slot for rebooking.

The admin API is protected by the `X-Staff-Key` header; unauthorized requests
get a 401.

## Patient records (EMR)

Every patient gets a stable **Patient ID** (e.g. `ZN-0001`):

- **Booking dedup** — at booking, a returning patient can enter their Patient ID
  to auto-fill details; otherwise the system matches by phone/email or creates a
  new patient and shows them their new ID on the confirmation screen.
- **Staff → Patients tab** — search patients by ID/name/phone/email, view a
  patient's full **appointment history** and **medical records**.
- **Add records** — typed doctor's notes + uploaded document images (stored under
  `backend/uploads/`, served at `/api/uploads`).
- Phase 2 will add **OCR** (image → text) and **voice-to-text** consultation notes.

Note: the unique slot index is partial (`status: confirmed`) so a **cancelled
slot can be rebooked**.

## Reminders (email + WhatsApp)

Booking sends an instant **confirmation**, and a background scheduler sends
**reminders** 24h and 2h before each appointment (configurable).

- **Out of the box:** runs in *console mode* — messages print to the backend
  terminal instead of sending, so you can see the whole flow with zero setup.
- **Go live with email (free):** set `SMTP_*` in `.env` using a Gmail
  [App Password](https://myaccount.google.com/apppasswords).
- **Go live with WhatsApp:** set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` from
  Meta's [Cloud API](https://developers.facebook.com). Note: business-initiated
  reminders require an **approved message template**.

Test it without booking:

```powershell
# check current mode (console vs live)
curl http://localhost:8000/api/notifications/status
# send a test
curl -X POST http://localhost:8000/api/notifications/test -H "Content-Type: application/json" -d "{\"channel\":\"email\",\"to\":\"you@example.com\"}"
```

Tune timing in `.env`: `REMINDER_OFFSETS_MINUTES=1440,120` (24h + 2h).

## Next steps to productionize

- Auth + multi-tenant (one DB per clinic or tenant_id scoping)
- SMS/email reminders (Twilio / SendGrid)
- Staff + owner dashboards
- Swap Ollama → self-hosted model with a signed BAA before real patient data
