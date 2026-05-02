import os
from fastapi import APIRouter, HTTPException
from app.models import LoadGameResponse, SaveStateRequest, SaveStateResponse

router = APIRouter()

# Frontend speaks camelCase (TS conventions); the DB is snake_case (Postgres
# conventions). We translate at the API boundary so neither side learns the
# other's casing. Also acts as an allowlist — fields not in the map are
# silently dropped on save, blocking accidental schema bleed-through.
HERO_FIELD_MAP = {
    "level": "level",
    "xp": "xp",
    "maxHp": "max_hp",
    "attack": "attack",
    "defense": "defense",
    "magic": "magic",
    "skillPoints": "skill_points",
    "gold": "gold",
    "hpPotions": "hp_potions",
    "manaPotions": "mp_potions",
    "learnedMoves": "learned_moves",
    "equippedMoves": "equipped_moves",
    "inventory": "inventory",
    "equipment": "equipment",
}
META_FIELD_MAP = {
    "shards": "shards",
    "purchasedUpgrades": "purchased_upgrades",
}
RUN_FIELD_MAP = {
    "currentMonsterIndex": "current_monster_index",
    "defeatedMonsterIds": "defeated_monster_ids",
    "runConfig": "run_config",
    "heroSnapshot": "hero_snapshot",
}

HERO_FIELD_MAP_REV = {v: k for k, v in HERO_FIELD_MAP.items()}
META_FIELD_MAP_REV = {v: k for k, v in META_FIELD_MAP.items()}
RUN_FIELD_MAP_REV = {v: k for k, v in RUN_FIELD_MAP.items()}


def _get_client():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        return None
    return create_client(url, key)


def _to_db(payload: dict, mapping: dict[str, str]) -> dict:
    return {mapping[k]: v for k, v in payload.items() if k in mapping}


def _to_camel(row: dict, mapping_rev: dict[str, str]) -> dict:
    return {mapping_rev[k]: v for k, v in row.items() if k in mapping_rev}


@router.post("/game/save", response_model=SaveStateResponse)
def save_game(req: SaveStateRequest):
    client = _get_client()
    if not client:
        raise HTTPException(503, "Supabase not configured")

    # Hero/meta/settings all live in the same row (hero_progress) — combine
    # whichever sections were sent into a single upsert. Sections not sent
    # leave their columns untouched (PostgREST merges on conflict).
    hero_columns: dict = {"session_id": req.sessionId}
    if req.hero:
        hero_columns.update(_to_db(req.hero, HERO_FIELD_MAP))
    if req.meta:
        hero_columns.update(_to_db(req.meta, META_FIELD_MAP))
    if req.settings is not None:
        hero_columns["settings"] = req.settings

    # Skip the no-op call that would only set session_id.
    if len(hero_columns) > 1:
        client.table("hero_progress").upsert(hero_columns).execute()

    if req.run is not None:
        run_columns = {"session_id": req.sessionId, **_to_db(req.run, RUN_FIELD_MAP)}
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
        hero_payload = _to_camel(row, HERO_FIELD_MAP_REV)
        meta_payload = _to_camel(row, META_FIELD_MAP_REV)
        # Empty settings JSONB is `{}` not None, so coerce both to None for
        # the "no saved settings yet" signal.
        s = row.get("settings")
        settings_payload = s if s else None

    run_payload = None
    if run_res and run_res.data:
        run_payload = _to_camel(run_res.data, RUN_FIELD_MAP_REV)

    return {
        "hero": hero_payload,
        "meta": meta_payload,
        "settings": settings_payload,
        "run": run_payload,
    }
