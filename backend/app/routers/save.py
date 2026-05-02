import os
from fastapi import APIRouter, HTTPException
from app.models import LoadGameResponse, SaveStateRequest, SaveStateResponse

router = APIRouter()


class FieldMap:
    """camelCase (TS) ↔ snake_case (Postgres) translator + allowlist.
    Unknown keys are dropped in both directions, so a renamed/removed
    field can't silently leak unmapped data into the DB or back to the
    client."""

    def __init__(self, mapping: dict[str, str]) -> None:
        self._fwd = mapping
        self._rev = {v: k for k, v in mapping.items()}

    def to_db(self, payload: dict) -> dict:
        return {self._fwd[k]: v for k, v in payload.items() if k in self._fwd}

    def to_camel(self, row: dict) -> dict:
        return {self._rev[k]: v for k, v in row.items() if k in self._rev}


HERO = FieldMap({
    "level":         "level",
    "xp":            "xp",
    "maxHp":         "max_hp",
    "attack":        "attack",
    "defense":       "defense",
    "magic":         "magic",
    "skillPoints":   "skill_points",
    "gold":          "gold",
    "hpPotions":     "hp_potions",
    "manaPotions":   "mp_potions",
    "learnedMoves":  "learned_moves",
    "equippedMoves": "equipped_moves",
    "inventory":     "inventory",
    "equipment":     "equipment",
})
META = FieldMap({
    "shards":            "shards",
    "purchasedUpgrades": "purchased_upgrades",
})
RUN = FieldMap({
    "currentMonsterIndex": "current_monster_index",
    "defeatedMonsterIds":  "defeated_monster_ids",
    "runConfig":           "run_config",
    "heroSnapshot":        "hero_snapshot",
})


def _get_client():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        return None
    return create_client(url, key)


@router.post("/game/save", response_model=SaveStateResponse)
def save_game(req: SaveStateRequest):
    client = _get_client()
    if not client:
        raise HTTPException(503, "Supabase not configured")

    # hero/meta/settings share one row. PostgREST upsert merges on conflict,
    # so unsent sections keep their existing values.
    hero_columns: dict = {"session_id": req.sessionId}
    if req.hero:
        hero_columns.update(HERO.to_db(req.hero))
    if req.meta:
        hero_columns.update(META.to_db(req.meta))
    if req.settings is not None:
        hero_columns["settings"] = req.settings

    # Skip the upsert when only session_id is set.
    if len(hero_columns) > 1:
        client.table("hero_progress").upsert(hero_columns).execute()

    if req.run is not None:
        run_columns = {"session_id": req.sessionId, **RUN.to_db(req.run)}
        if len(run_columns) > 1:
            client.table("run_saves").upsert(run_columns).execute()

    return SaveStateResponse(ok=True)


@router.get("/game/load/{session_id}", response_model=LoadGameResponse)
def load_game(session_id: str):
    client = _get_client()
    if not client:
        raise HTTPException(503, "Supabase not configured")

    hero_res = (
        client.table("hero_progress")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )
    run_res = (
        client.table("run_saves")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )

    hero_payload = None
    meta_payload = None
    settings_payload = None
    if hero_res and hero_res.data:
        row = hero_res.data
        hero_payload = HERO.to_camel(row)
        meta_payload = META.to_camel(row)
        # Empty JSONB ({}) maps to None so frontend can detect "never saved".
        s = row.get("settings")
        settings_payload = s if s else None

    run_payload = None
    if run_res and run_res.data:
        run_payload = RUN.to_camel(run_res.data)

    return LoadGameResponse(
        hero=hero_payload,
        meta=meta_payload,
        settings=settings_payload,
        run=run_payload,
    )
