from fastapi import APIRouter

from ..db import DB

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


@router.get("")
async def list_doctors():
    docs = await DB.doctors.find({}, {"_id": 0}).to_list(length=100)
    return docs
