# Deploying Zenora (free hosting)

Three free services: **MongoDB Atlas** (database), **Render** (backend API),
**Vercel** (frontend website). All deploy from a **GitHub repo**.

```
Patient/staff browser ──> Vercel (React)  ──/api──>  Render (FastAPI)  ──>  MongoDB Atlas
                                                          └──> Google Gemini (AI)
```

---

## 0. Push the code to GitHub (one time)

Use a **PRIVATE** repo. Secrets are gitignored (`backend/.env`), so they won't be pushed.

```powershell
cd D:\Projects\Med
git init
git add .
git commit -m "Zenora clinic app"
# create an EMPTY private repo on github.com, then:
git remote add origin https://github.com/<you>/zenora.git
git branch -M main
git push -u origin main
```

---

## 1. MongoDB Atlas (database) — free

1. Sign up at https://www.mongodb.com/cloud/atlas → create a **free M0 cluster**.
2. **Database Access** → add a user (username + password) → note them.
3. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`).
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
   (put your real password in place of `PASSWORD`). This is your **MONGO_URI**.

---

## 2. Backend on Render — free

1. Sign up at https://render.com → **New + → Blueprint** → connect your repo
   (it reads `backend/render.yaml`). Or **New + → Web Service** with:
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. Set **Environment variables**:
   | Key | Value |
   |-----|-------|
   | `MONGO_URI` | (from Atlas, step 1) |
   | `GEMINI_API_KEY` | your Google AI Studio key |
   | `GEMINI_MODEL` | `gemini-2.5-flash` |
   | `JWT_SECRET` | a long random string (or let Render generate) |
   | `CORS_ORIGINS` | leave blank for now — fill after step 3 |
   | `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS` | your admin login |
   | *(optional)* `SMTP_HOST/SMTP_USER/SMTP_PASSWORD` | for live email |
   | *(optional)* `RAZORPAY_KEY_ID/SECRET` | for live payments |
3. Deploy. Your API URL will be like `https://zenora-api.onrender.com`.
   On boot it auto-creates the admin and seeds demo doctors. Test:
   `https://zenora-api.onrender.com/api/health` → `{"status":"ok"}`

> Free Render sleeps after inactivity — the first request after idle takes ~30s.

---

## 3. Frontend on Vercel — free

1. Sign up at https://vercel.com → **Add New → Project** → import your repo.
2. Set **Root Directory** to `frontend` (framework auto-detects Vite).
3. Add an **Environment Variable**:
   `VITE_API_URL = https://zenora-api.onrender.com` (your Render URL)
4. Deploy. Your site will be like `https://zenora.vercel.app`.

---

## 4. Connect them

1. Back in **Render → Environment**, set `CORS_ORIGINS` to your Vercel URL
   (e.g. `https://zenora.vercel.app`) and save → it redeploys.
2. Open the Vercel URL — patient site works; `/staff` is the dashboard
   (log in with your `DEFAULT_ADMIN_USER` / `DEFAULT_ADMIN_PASS`).

---

## Notes & limits (free tier)

- **Uploaded files** (record images) live on Render's disk, which **resets on
  redeploy**. Fine for demos; for production add cloud storage (S3/Cloudinary) later.
- **WhatsApp** stays console-mode until you add Meta credentials.
- Per clinic you sell to: change `CLINIC_NAME`, logo, doctors, services & pricing,
  use a fresh Atlas DB + Render/Vercel project (separate instance per clinic).
- To customise branding: clinic name is the `CLINIC_NAME` env var; the logo wordmark
  is in `frontend/src/components/Logo.jsx`.
