from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "medmvp"

    # AI provider: "gemini" (cloud, deployable) or "ollama" (local).
    ai_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    ollama_base_url: str = "http://localhost:11434"
    # gemma2:2b is small + fast + stable on 8GB GPUs. Use ONE model and don't
    # run other models alongside it (model-switching can OOM small GPUs).
    ollama_model: str = "gemma2:2b"
    # Keep the model warm so there's no cold-start reload lag. Must be a valid
    # duration string ("30m") or number of seconds — NOT the string "-1".
    ollama_keep_alive: str = "30m"
    # Cap reply length so the receptionist stays snappy and to the point.
    ollama_num_predict: int = 220

    # Payments (Razorpay). Leave keys blank for DEMO mode (simulated success).
    # Get test keys free at https://dashboard.razorpay.com (Settings → API Keys).
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    consultation_fee_inr: int = 500

    clinic_name: str = "Sunrise Medical Clinic"
    clinic_phone: str = "+91 98765 43210"
    clinic_address: str = "12 Wellness Road, Kochi, Kerala"
    clinic_hours: str = "Mon-Sat 9:00 AM - 6:00 PM"

    cors_origins: str = "http://localhost:5173"

    # Staff auth (JWT). Set a strong JWT_SECRET in .env for production.
    jwt_secret: str = "change-this-secret-in-production-zenora"
    jwt_expire_hours: int = 12
    # A default admin is created on first run if no staff exist. Change after login.
    default_admin_user: str = "admin"
    default_admin_pass: str = "admin123"
    # Legacy shared key (kept only as a fallback; JWT login is primary).
    staff_key: str = "zenora-staff-2026"

    # ---- Notifications ----
    notify_email: bool = True
    notify_whatsapp: bool = True

    # Email (SMTP). For Gmail: host=smtp.gmail.com, port=587, user=your gmail,
    # password = a 16-char App Password (https://myaccount.google.com/apppasswords).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""  # defaults to smtp_user if blank

    # WhatsApp Cloud API (Meta). Get a token + phone number id from
    # https://developers.facebook.com (WhatsApp > API setup).
    whatsapp_token: str = ""
    whatsapp_phone_id: str = ""
    default_country_code: str = "91"  # prepended to 10-digit local numbers

    # Reminders: minutes-before-appointment to send. "1440,120" = 24h and 2h.
    reminder_offsets_minutes: str = "1440,120"
    scheduler_interval_seconds: int = 120  # how often the reminder loop checks

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def reminder_offsets(self) -> list[int]:
        return [int(x) for x in self.reminder_offsets_minutes.split(",") if x.strip()]


settings = Settings()
