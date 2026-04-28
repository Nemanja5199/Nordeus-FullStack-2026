import os
from fastapi import APIRouter, HTTPException
from app.models import LoadGameResponse, SaveStateRequest, SaveStateResponse

router = APIRouter()


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

    client.table("hero_progress").upsert({
        "session_id": req.sessionId,
        **req.hero,
    }).execute()

    if req.run is not None:
        client.table("run_saves").upsert({
            "session_id": req.sessionId,
            **req.run,
        }).execute()

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

    return {
        "hero": hero_res.data,
        "run": run_res.data,
    }
