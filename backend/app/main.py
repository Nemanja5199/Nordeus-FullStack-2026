from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routers import run, battle, save

load_dotenv()

app = FastAPI(title="RPG Game Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(run.router, prefix="/api")
app.include_router(battle.router, prefix="/api")
app.include_router(save.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
