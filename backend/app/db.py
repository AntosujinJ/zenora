import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

client: AsyncIOMotorClient | None = None


class DB:
    """Holds collection handles once connected."""

    doctors = None
    appointments = None
    chats = None
    patients = None
    records = None
    counters = None
    staff = None


async def connect():
    global client
    # Atlas (mongodb+srv / *.mongodb.net) needs an explicit CA bundle for TLS.
    kwargs = {"serverSelectionTimeoutMS": 30000}
    if "mongodb.net" in settings.mongo_uri or settings.mongo_uri.startswith("mongodb+srv"):
        kwargs["tlsCAFile"] = certifi.where()
    client = AsyncIOMotorClient(settings.mongo_uri, **kwargs)
    db = client[settings.db_name]
    DB.doctors = db["doctors"]
    DB.appointments = db["appointments"]
    DB.chats = db["chats"]
    DB.patients = db["patients"]
    DB.records = db["records"]
    DB.counters = db["counters"]
    DB.staff = db["staff"]

    # Prevent double-booking the same doctor + slot — but only for ACTIVE
    # bookings, so a cancelled slot can be booked again. (A plain unique index
    # would keep counting cancelled rows and block rebooking.)
    try:
        await DB.appointments.drop_index("doctor_id_1_date_1_time_1")
    except Exception:
        pass  # old index may not exist
    await DB.appointments.create_index(
        [("doctor_id", 1), ("date", 1), ("time", 1)],
        unique=True,
        partialFilterExpression={"status": "confirmed"},
        name="uniq_active_slot",
    )
    await DB.patients.create_index("patient_id", unique=True)
    await DB.patients.create_index("phone")
    await DB.records.create_index([("patient_id", 1), ("created_at", -1)])
    await DB.staff.create_index("username", unique=True)


async def disconnect():
    if client:
        client.close()
