from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from models.schemas import CalibrationCreate
from config import supabase
from services.limit_engine import adjust_limits_from_calibration

router = APIRouter()


@router.post("/")
async def submit_calibration(
    data: CalibrationCreate, user_id: str = Depends(get_current_user)
):
    # Get current calibration count
    profile = (
        supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    current_count = profile.data.get("calibration_count", 0)
    if current_count >= 3:
        raise HTTPException(status_code=400, detail="Calibration already complete")

    session_number = current_count + 1

    # Insert calibration session
    supabase.table("calibration_sessions").insert(
        {
            "user_id": user_id,
            "session_number": session_number,
            "drinks_consumed": data.drinks_consumed,
            "feeling_rating": data.feeling_rating,
            "could_handle_more": data.could_handle_more,
        }
    ).execute()

    # Update profile calibration count
    new_count = session_number
    updates = {"calibration_count": new_count}

    # After 3rd session, recalculate limits
    if new_count >= 3:
        p = profile.data
        adjusted = adjust_limits_from_calibration(
            user_id, p["weight_lbs"], p["biological_gender"]
        )
        updates["calculated_low_limit"] = adjusted["low"]
        updates["calculated_med_limit"] = adjusted["med"]
        updates["calculated_high_limit"] = adjusted["high"]

    supabase.table("profiles").update(updates).eq("id", user_id).execute()

    return {
        "session_number": session_number,
        "calibration_complete": new_count >= 3,
    }


@router.get("/status")
async def calibration_status(user_id: str = Depends(get_current_user)):
    profile = (
        supabase.table("profiles")
        .select("calibration_count")
        .eq("id", user_id)
        .single()
        .execute()
    )
    count = profile.data.get("calibration_count", 0) if profile.data else 0
    return {"count": count, "complete": count >= 3}
