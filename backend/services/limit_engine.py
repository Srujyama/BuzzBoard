from config import supabase
from services.bac_calculator import calculate_limits


def adjust_limits_from_calibration(user_id: str, weight_lbs: int, gender: str) -> dict:
    """After 3 calibration sessions, adjust limits based on feedback."""
    base_limits = calculate_limits(weight_lbs, gender)

    result = (
        supabase.table("calibration_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("session_number")
        .execute()
    )

    sessions = result.data
    if len(sessions) < 3:
        return base_limits

    handle_more_count = sum(1 for s in sessions if s["could_handle_more"])
    avg_feeling = sum(s["feeling_rating"] for s in sessions) / len(sessions)

    adjustment = 0
    if handle_more_count >= 2 and avg_feeling >= 3:
        adjustment = 1
    elif handle_more_count == 0 and avg_feeling <= 2:
        adjustment = -1

    return {
        "low": max(1, base_limits["low"] + adjustment),
        "med": max(2, base_limits["med"] + adjustment),
        "high": min(base_limits["high"] + adjustment, base_limits["high"]),
    }
