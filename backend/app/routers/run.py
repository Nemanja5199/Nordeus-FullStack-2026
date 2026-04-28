import random
from fastapi import APIRouter, Query
from app.game_config import MONSTERS, MOVES, ITEMS, HERO_DEFAULTS
from app.models import RunConfigResponse
from app.tree_generator import generate_map_tree

router = APIRouter()


@router.get("/run/config", response_model=RunConfigResponse)
def get_run_config(seed: int | None = Query(default=None)):
    """Returns the full run configuration once at the start of every run."""
    run_seed = seed if seed is not None else random.randint(0, 2**31)
    return {
        "monsters": MONSTERS,
        "moves": MOVES,
        "items": ITEMS,
        "heroDefaults": HERO_DEFAULTS,
        "mapTree": generate_map_tree(run_seed),
        "seed": run_seed,
    }
