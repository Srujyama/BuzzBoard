from fastapi import APIRouter, Depends, HTTPException, Header
from jose import jwt, JWTError
from config import SUPABASE_JWT_SECRET

router = APIRouter()


async def get_current_user(authorization: str = Header(...)) -> str:
    """Extract user_id from Supabase JWT token."""
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user)):
    return {"user_id": user_id}
