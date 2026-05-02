import random
from fastapi import APIRouter, Query
from app.game_config import MONSTERS, MOVES, ITEMS, HERO_CLASSES, UPGRADE_DEFS
from app.models import GameMetaResponse, RunStartResponse
from app.tree_generator import generate_map_tree

router = APIRouter()


@router.get("/run/meta", response_model=GameMetaResponse)
def get_game_meta() -> GameMetaResponse:
    """Static config — monsters/moves/items/hero classes. Cache on the client."""
    return GameMetaResponse(
        monsters=MONSTERS,
        moves=MOVES,
        items=ITEMS,
        heroClasses=HERO_CLASSES,
        upgrades=UPGRADE_DEFS,
    )


@router.get("/run/start", response_model=RunStartResponse)
def start_run(seed: int | None = Query(default=None)) -> RunStartResponse:
    """Run-specific data (map tree + seed). Pass seed to reproduce the map."""
    run_seed = seed if seed is not None else random.randint(0, 2**31)
    return RunStartResponse(
        mapTree=generate_map_tree(run_seed),
        seed=run_seed,
    )
