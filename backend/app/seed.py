"""Seed the database with sample doctors. Run: python -m app.seed"""
import asyncio

from .db import connect, disconnect, DB

DOCTORS = [
    {
        "id": "dr-anita-rao", "name": "Anita Rao", "specialty": "General Physician",
        "bio": "15+ years in family medicine, preventive care, and chronic disease management.",
        "photo": "https://i.pravatar.cc/400?img=47",
        "work_start": "09:00", "work_end": "17:00", "slot_minutes": 30, "work_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "id": "dr-john-mathew", "name": "John Mathew", "specialty": "Dermatologist",
        "bio": "Skin, hair, and cosmetic dermatology specialist with a gentle approach.",
        "photo": "https://i.pravatar.cc/400?img=12",
        "work_start": "10:00", "work_end": "16:00", "slot_minutes": 30, "work_days": [0, 1, 2, 3, 4],
    },
    {
        "id": "dr-priya-nair", "name": "Priya Nair", "specialty": "Pediatrician",
        "bio": "Caring for newborns, children, and adolescents for over a decade.",
        "photo": "https://i.pravatar.cc/400?img=45",
        "work_start": "09:30", "work_end": "15:30", "slot_minutes": 20, "work_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "id": "dr-sameer-khan", "name": "Sameer Khan", "specialty": "Cardiologist",
        "bio": "Heart-health screening, ECG/echo, and long-term cardiac care.",
        "photo": "https://i.pravatar.cc/400?img=53",
        "work_start": "09:00", "work_end": "14:00", "slot_minutes": 30, "work_days": [1, 2, 3, 4, 5],
    },
    {
        "id": "dr-lena-george", "name": "Lena George", "specialty": "Dentist",
        "bio": "Cleanings, fillings, and same-day cosmetic smile makeovers.",
        "photo": "https://i.pravatar.cc/400?img=31",
        "work_start": "10:00", "work_end": "18:00", "slot_minutes": 45, "work_days": [0, 1, 2, 3, 4, 5],
    },
    {
        "id": "dr-arjun-menon", "name": "Arjun Menon", "specialty": "Orthopedic Surgeon",
        "bio": "Sports injuries, joint pain, and fracture care for all ages.",
        "photo": "https://i.pravatar.cc/400?img=14",
        "work_start": "11:00", "work_end": "17:00", "slot_minutes": 30, "work_days": [0, 2, 4, 5],
    },
    {
        "id": "dr-fatima-ali", "name": "Fatima Ali", "specialty": "Neurologist",
        "bio": "Migraine, epilepsy, and nerve-condition assessment and management.",
        "photo": "https://i.pravatar.cc/400?img=49",
        "work_start": "09:00", "work_end": "13:00", "slot_minutes": 40, "work_days": [1, 3, 5],
    },
    {
        "id": "dr-david-thomas", "name": "David Thomas", "specialty": "General Physician",
        "bio": "Internal medicine, lifestyle health, and everyday wellness care.",
        "photo": "https://i.pravatar.cc/400?img=60",
        "work_start": "13:00", "work_end": "18:00", "slot_minutes": 30, "work_days": [0, 1, 2, 3, 4, 5],
    },
]


async def seed_if_empty():
    """Insert the demo doctors only if none exist (safe to call on every startup)."""
    if await DB.doctors.count_documents({}) == 0:
        await DB.doctors.insert_many([dict(d) for d in DOCTORS])
        print(f"[seed] inserted {len(DOCTORS)} demo doctors")


async def main():
    await connect()
    await DB.doctors.delete_many({})
    await DB.doctors.insert_many(DOCTORS)
    print(f"Seeded {len(DOCTORS)} doctors.")
    await disconnect()


if __name__ == "__main__":
    asyncio.run(main())
