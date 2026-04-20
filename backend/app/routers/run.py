from fastapi import APIRouter
from app.game_config import MONSTERS, MOVES, HERO_DEFAULTS

router = APIRouter()


@router.get("/run/config")
def get_run_config():
    """Returns the full run configuration once at the start of every run."""
    return {
        "monsters": MONSTERS,
        "moves": MOVES,
        "heroDefaults": HERO_DEFAULTS,
    }
