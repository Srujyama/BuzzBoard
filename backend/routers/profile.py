from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from models.schemas import ProfileUpdate
from config import supabase
from services.limit_engine import adjust_limits_from_calibration

router = APIRouter()


@router.get("/")
async def get_profile(user_id: str = Depends(get_current_user)):
    result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


@router.put("/")
async def update_profile(
    updates: ProfileUpdate, user_id: str = Depends(get_current_user)
):
    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("profiles")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {"status": "updated"}


@router.get("/limits")
async def get_limits(user_id: str = Depends(get_current_user)):
    profile = (
        supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    p = profile.data
    if p.get("calibration_count", 0) >= 3:
        limits = adjust_limits_from_calibration(
            user_id, p["weight_lbs"], p["biological_gender"]
        )
    else:
        limits = {
            "low": p.get("calculated_low_limit"),
            "med": p.get("calculated_med_limit"),
            "high": p.get("calculated_high_limit"),
        }

    return {
        "limits": limits,
        "personal_limit": p.get("personal_drink_limit"),
        "calibration_count": p.get("calibration_count", 0),
    }
