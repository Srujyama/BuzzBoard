from pydantic import BaseModel
from typing import Optional


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    biological_gender: Optional[str] = None
    height_inches: Optional[int] = None
    weight_lbs: Optional[int] = None
    university_name: Optional[str] = None
    personal_drink_limit: Optional[int] = None
    show_on_leaderboard: Optional[bool] = None


class DrinkLogCreate(BaseModel):
    session_id: str
    drink_type: str  # 'shot', 'beer', 'mixed'
    quantity: float = 1.0


class CalibrationCreate(BaseModel):
    drinks_consumed: int
    feeling_rating: int  # 1-5
    could_handle_more: bool


class FriendRequest(BaseModel):
    addressee_id: str


class GroupCreate(BaseModel):
    name: str


class GroupMemberAdd(BaseModel):
    user_id: str


class PrivacyToggle(BaseModel):
    can_see_drinks: bool


class NightPrivacyOverride(BaseModel):
    session_id: str
    friend_id: str
    can_see: bool
