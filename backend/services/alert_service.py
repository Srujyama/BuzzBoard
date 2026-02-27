from config import supabase


def send_friend_alerts(user_id: str, session_id: str, bac: float, limit_level: str):
    """Send alerts to friends who have can_see_drinks = true."""
    # Get all accepted friendships where can_see_drinks is true
    friendships = (
        supabase.table("friendships")
        .select("*")
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .eq("status", "accepted")
        .eq("can_see_drinks", True)
        .execute()
    )

    # Check night privacy overrides for this session
    overrides = (
        supabase.table("night_privacy_overrides")
        .select("friend_id, can_see")
        .eq("user_id", user_id)
        .eq("session_id", session_id)
        .execute()
    )

    override_map = {o["friend_id"]: o["can_see"] for o in overrides.data}

    for friendship in friendships.data:
        friend_id = (
            friendship["addressee_id"]
            if friendship["requester_id"] == user_id
            else friendship["requester_id"]
        )

        # Check override
        if friend_id in override_map and not override_map[friend_id]:
            continue

        message = f"Your friend has exceeded their {limit_level} limit (BAC: {bac:.3f}). Check in on them!"

        supabase.table("friend_alerts").insert(
            {
                "user_id": user_id,
                "friend_id": friend_id,
                "session_id": session_id,
                "message": message,
            }
        ).execute()
