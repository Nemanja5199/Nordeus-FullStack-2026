import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import run, battle, save

load_dotenv()

app = FastAPI(title="RPG Game Server")

# Localhost dev origins (Vite default + alt port) are always allowed.
# Production origins come from CORS_ALLOWED_ORIGINS (comma-separated)
# so the GitHub Pages URL can be added without a code change.
_DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5173"]
_extra = [o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
allow_origins = _DEV_ORIGINS + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(run.router, prefix="/api")
app.include_router(battle.router, prefix="/api")
app.include_router(save.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
