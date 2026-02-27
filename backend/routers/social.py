from fastapi import APIRouter, Depends, HTTPException
from routers.auth import get_current_user
from models.schemas import FriendRequest, GroupCreate, GroupMemberAdd, PrivacyToggle, NightPrivacyOverride
from config import supabase

router = APIRouter()


@router.get("/friends")
async def get_friends(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friendships")
        .select("*, requester:profiles!friendships_requester_id_fkey(id, display_name), addressee:profiles!friendships_addressee_id_fkey(id, display_name)")
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .eq("status", "accepted")
        .execute()
    )

    friends = []
    for f in result.data or []:
        friend_profile = f["addressee"] if f["requester_id"] == user_id else f["requester"]
        # Check if friend has active session
        active = (
            supabase.table("drink_sessions")
            .select("id")
            .eq("user_id", friend_profile["id"])
            .eq("is_active", True)
            .execute()
        )
        friends.append(
            {
                **friend_profile,
                "friendship_id": f["id"],
                "can_see_drinks": f["can_see_drinks"],
                "has_active_session": bool(active.data),
            }
        )

    return friends


@router.post("/friends/request")
async def send_friend_request(
    data: FriendRequest, user_id: str = Depends(get_current_user)
):
    if data.addressee_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    result = (
        supabase.table("friendships")
        .insert({"requester_id": user_id, "addressee_id": data.addressee_id})
        .execute()
    )
    return result.data[0] if result.data else {"status": "sent"}


@router.put("/friends/{friendship_id}/accept")
async def accept_request(friendship_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friendships")
        .update({"status": "accepted"})
        .eq("id", friendship_id)
        .eq("addressee_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {"status": "accepted"}


@router.put("/friends/{friendship_id}/block")
async def block_friend(friendship_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friendships")
        .update({"status": "blocked"})
        .eq("id", friendship_id)
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .execute()
    )
    return result.data[0] if result.data else {"status": "blocked"}


@router.put("/friends/{friendship_id}/privacy")
async def toggle_privacy(
    friendship_id: str,
    data: PrivacyToggle,
    user_id: str = Depends(get_current_user),
):
    result = (
        supabase.table("friendships")
        .update({"can_see_drinks": data.can_see_drinks})
        .eq("id", friendship_id)
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .execute()
    )
    return result.data[0] if result.data else {"status": "updated"}


@router.post("/groups")
async def create_group(data: GroupCreate, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friend_groups")
        .insert({"creator_id": user_id, "name": data.name})
        .execute()
    )
    return result.data[0] if result.data else {"status": "created"}


@router.get("/groups")
async def get_groups(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friend_groups")
        .select("*, friend_group_members(user_id)")
        .eq("creator_id", user_id)
        .execute()
    )
    return result.data or []


@router.post("/groups/{group_id}/members")
async def add_group_member(
    group_id: str,
    data: GroupMemberAdd,
    user_id: str = Depends(get_current_user),
):
    # Verify user owns the group
    group = (
        supabase.table("friend_groups")
        .select("id")
        .eq("id", group_id)
        .eq("creator_id", user_id)
        .single()
        .execute()
    )
    if not group.data:
        raise HTTPException(status_code=403, detail="Not your group")

    result = (
        supabase.table("friend_group_members")
        .insert({"group_id": group_id, "user_id": data.user_id})
        .execute()
    )
    return result.data[0] if result.data else {"status": "added"}


@router.get("/alerts")
async def get_alerts(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friend_alerts")
        .select("*")
        .eq("friend_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data or []


@router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("friend_alerts")
        .update({"is_read": True})
        .eq("id", alert_id)
        .eq("friend_id", user_id)
        .execute()
    )
    return {"status": "read"}


@router.post("/privacy/override")
async def set_night_override(
    data: NightPrivacyOverride, user_id: str = Depends(get_current_user)
):
    result = (
        supabase.table("night_privacy_overrides")
        .upsert(
            {
                "user_id": user_id,
                "session_id": data.session_id,
                "friend_id": data.friend_id,
                "can_see": data.can_see,
            }
        )
        .execute()
    )
    return result.data[0] if result.data else {"status": "set"}
