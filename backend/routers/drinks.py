from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from models.schemas import DrinkLogCreate
from config import supabase
from services.bac_calculator import calculate_bac, DRINK_STANDARD_EQUIVALENTS
from services.alert_service import send_friend_alerts

router = APIRouter()


@router.post("/sessions")
async def start_session(user_id: str = Depends(get_current_user)):
    # Check for existing active session
    existing = (
        supabase.table("drink_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Already have an active session")

    result = (
        supabase.table("drink_sessions")
        .insert({"user_id": user_id})
        .execute()
    )
    return result.data[0]


@router.get("/sessions/active")
async def get_active_session(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("drink_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .maybe_single()
        .execute()
    )
    return result.data


@router.post("/log")
async def log_drink(data: DrinkLogCreate, user_id: str = Depends(get_current_user)):
    # Validate drink type
    std_equiv = DRINK_STANDARD_EQUIVALENTS.get(data.drink_type)
    if std_equiv is None:
        raise HTTPException(status_code=400, detail="Invalid drink type")

    # Verify session belongs to user
    session = (
        supabase.table("drink_sessions")
        .select("*")
        .eq("id", data.session_id)
        .eq("user_id", user_id)
        .eq("is_active", True)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Active session not found")

    # Insert drink log
    log_result = (
        supabase.table("drink_logs")
        .insert(
            {
                "session_id": data.session_id,
                "drink_type": data.drink_type,
                "quantity": data.quantity,
                "standard_drink_equivalent": std_equiv * data.quantity,
            }
        )
        .execute()
    )

    # Recalculate totals
    new_total = (session.data["total_standard_drinks"] or 0) + (std_equiv * data.quantity)

    # Get user profile for BAC calculation
    profile = (
        supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    )

    hours_elapsed = (
        datetime.now(timezone.utc) - datetime.fromisoformat(session.data["started_at"])
    ).total_seconds() / 3600

    current_bac = calculate_bac(
        new_total,
        profile.data["weight_lbs"],
        profile.data["biological_gender"],
        hours_elapsed,
    )

    peak_bac = max(session.data.get("peak_bac", 0), current_bac)

    # Update session
    supabase.table("drink_sessions").update(
        {"total_standard_drinks": new_total, "peak_bac": peak_bac}
    ).eq("id", data.session_id).execute()

    # Check limits and send alerts if exceeded
    high_limit = profile.data.get("calculated_high_limit", 0)
    med_limit = profile.data.get("calculated_med_limit", 0)

    if high_limit and new_total >= high_limit:
        send_friend_alerts(user_id, data.session_id, current_bac, "high")
    elif med_limit and new_total >= med_limit:
        send_friend_alerts(user_id, data.session_id, current_bac, "medium")

    return {
        "log": log_result.data[0] if log_result.data else None,
        "total_standard_drinks": new_total,
        "current_bac": current_bac,
        "peak_bac": peak_bac,
    }


@router.put("/sessions/{session_id}/end")
async def end_session(session_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("drink_sessions")
        .update(
            {
                "is_active": False,
                "ended_at": datetime.now(timezone.utc).isoformat(),
                "status": "completed",
            }
        )
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    return result.data[0]


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(get_current_user)):
    session = (
        supabase.table("drink_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")

    logs = (
        supabase.table("drink_logs")
        .select("*")
        .eq("session_id", session_id)
        .order("logged_at")
        .execute()
    )

    return {"session": session.data, "logs": logs.data or []}
