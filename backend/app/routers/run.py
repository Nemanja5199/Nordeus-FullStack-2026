import random
from fastapi import APIRouter, Query
from app.game_config import MONSTERS, MOVES, ITEMS, HERO_DEFAULTS
from app.models import GameMetaResponse, RunStartResponse
from app.tree_generator import generate_map_tree

router = APIRouter()


@router.get("/run/meta", response_model=GameMetaResponse)
def get_game_meta():
    """Returns the static parts of a run (monsters, moves, items, hero defaults).
    Same response on every call; clients should cache this for the page session."""
    return {
        "monsters": MONSTERS,
        "moves": MOVES,
        "items": ITEMS,
        "heroDefaults": HERO_DEFAULTS,
    }


@router.get("/run/start", response_model=RunStartResponse)
def start_run(seed: int | None = Query(default=None)):
    """Returns the run-specific data (map tree + seed). Cheap; ~1.5KB payload.
    Pass an existing seed to regenerate the same map (used by Continue)."""
    run_seed = seed if seed is not None else random.randint(0, 2**31)
    return {
        "mapTree": generate_map_tree(run_seed),
        "seed": run_seed,
    }
