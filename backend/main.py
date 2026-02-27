from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="BuzzBoard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, profile, calibration, drinks, social, leaderboard

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(calibration.router, prefix="/api/calibration", tags=["calibration"])
app.include_router(drinks.router, prefix="/api/drinks", tags=["drinks"])
app.include_router(social.router, prefix="/api/social", tags=["social"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["leaderboard"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
