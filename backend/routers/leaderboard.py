from fastapi import APIRouter, Depends, Query
from routers.auth import get_current_user
from config import supabase

router = APIRouter()


@router.get("/university")
async def university_leaderboard(
    name: str = Query(..., description="University name"),
    user_id: str = Depends(get_current_user),
):
    # Get opted-in profiles at this university
    profiles = (
        supabase.table("profiles")
        .select("id, display_name")
        .eq("university_name", name)
        .eq("show_on_leaderboard", True)
        .execute()
    )

    if not profiles.data:
        return []

    user_ids = [p["id"] for p in profiles.data]

    # Get completed session counts
    sessions = (
        supabase.table("drink_sessions")
        .select("user_id")
        .in_("user_id", user_ids)
        .eq("status", "completed")
        .execute()
    )

    session_counts = {}
    for s in sessions.data or []:
        session_counts[s["user_id"]] = session_counts.get(s["user_id"], 0) + 1

    ranked = sorted(
        [
            {
                "id": p["id"],
                "display_name": p["display_name"],
                "sessions": session_counts.get(p["id"], 0),
            }
            for p in profiles.data
        ],
        key=lambda x: x["sessions"],
        reverse=True,
    )[:50]

    return ranked


@router.get("/group/{group_id}")
async def group_leaderboard(
    group_id: str, user_id: str = Depends(get_current_user)
):
    members = (
        supabase.table("friend_group_members")
        .select("user_id, profiles:profiles!friend_group_members_user_id_fkey(id, display_name)")
        .eq("group_id", group_id)
        .execute()
    )

    if not members.data:
        return []

    user_ids = [m["user_id"] for m in members.data]

    sessions = (
        supabase.table("drink_sessions")
        .select("user_id")
        .in_("user_id", user_ids)
        .eq("status", "completed")
        .execute()
    )

    session_counts = {}
    for s in sessions.data or []:
        session_counts[s["user_id"]] = session_counts.get(s["user_id"], 0) + 1

    ranked = sorted(
        [
            {
                "id": m["user_id"],
                "display_name": m["profiles"]["display_name"] if m.get("profiles") else "Unknown",
                "sessions": session_counts.get(m["user_id"], 0),
            }
            for m in members.data
        ],
        key=lambda x: x["sessions"],
        reverse=True,
    )

    return ranked
