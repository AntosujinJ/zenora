# Running Zenora Clinic — instructions

The app has **3 parts** (the AI now runs on Google Gemini in the cloud, so no
Ollama/GPU is needed — just a `GEMINI_API_KEY` in `backend/.env`).

| Part | What | Where | Port |
|------|------|-------|------|
| MongoDB | database | data on `D:\mongodb` | 27017 |
| Backend | FastAPI API (+ calls Gemini) | `D:\Projects\Med\backend` | 8000 |
| Frontend | React site | `D:\Projects\Med\frontend` | 5173 |

Start them **in this order**. Use a **separate PowerShell window** for the backend
and frontend (they keep running).

---

## Step 1 — MongoDB

MongoDB runs as the **Windows service** (auto-starts on boot, data on `D:\mongodb`),
so usually there's nothing to do. Just verify it's up:

```powershell
cd D:\Projects\Med
powershell -ExecutionPolicy Bypass -File .\start-mongo.ps1
```

One-time setup (if not done): run **as Administrator** to point the service's data
to D: so it stops competing with any manual instance:
```powershell
powershell -ExecutionPolicy Bypass -File .\fix-mongo-service.ps1
```
⚠️ Don't run two MongoDB instances at once — that causes data to "change" between
runs. Use only the service.

## Step 2 — Backend (new PowerShell window)

```powershell
cd D:\Projects\Med\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
Expect: `Application startup complete`.

> Requires `GEMINI_API_KEY` set in `backend\.env` (already done).
> If you get **WinError 10013**, a backend is already on port 8000 — free it:
> ```powershell
> Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```

## Step 3 — Frontend (another new PowerShell window)

```powershell
cd D:\Projects\Med\frontend
npm run dev
```
Expect: `Local: http://localhost:5173/`.

---

## Open the app

- **Patient site:** http://localhost:5173
- **Staff dashboard:** http://localhost:5173/staff  (key: `zenora-staff-2026`)

## Quick health checks

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health     # {"status":"ok"}
# AI test:
$b = @{messages=@(@{role="user";content="hi"})} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8000/api/chat -Method Post -Body $b -ContentType "application/json"
```

## Stop everything

```powershell
Get-Process mongod, python, node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Notes

- **AI = Google Gemini (cloud).** Model `gemini-2.5-flash` (free tier). No Ollama
  needed; `start-ai.ps1` is no longer required. To use local AI instead, set
  `AI_PROVIDER=ollama` in `.env`.
- **Email reminders are live** (Gmail); WhatsApp is console-mode.
- **First run setup** (only once): backend deps `pip install -r requirements.txt`
  in the venv, frontend deps `npm install`, and seed doctors `python -m app.seed`.
- Keep a few GB free on **C:** (MongoDB + uploads live on D: to be safe).
