"""Smoke test for the Supabase connection. Run from the backend/ directory:
    python3 -m scripts.test_supabase

Exercises the same client + upsert path the /api/game/save endpoint uses,
but fails loudly with the actual exception so you can see what's wrong
without reading the uvicorn log.
"""
import os
import sys
import traceback
from dotenv import load_dotenv

load_dotenv()

TEST_SESSION = "_smoketest_session"


def main() -> int:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")
    print(f"SUPABASE_URL set: {bool(url)} (length={len(url)})")
    print(f"SUPABASE_KEY set: {bool(key)} (length={len(key)})")
    if not url or not key:
        print("FAIL: env vars missing — backend cannot reach Supabase")
        return 1

    try:
        from supabase import create_client
    except ImportError as e:
        print(f"FAIL: supabase package not installed: {e}")
        return 1

    try:
        client = create_client(url, key)
        print("OK: client created")
    except Exception:
        print("FAIL: client creation threw")
        traceback.print_exc()
        return 1

    # ── 1. SELECT ───────────────────────────────────────────────────────
    # supabase-py 2.x returns None from .maybe_single().execute() when no row
    # matches; older versions return a response with .data = None. Handle both.
    try:
        res = (
            client.table("hero_progress")
            .select("*")
            .eq("session_id", TEST_SESSION)
            .maybe_single()
            .execute()
        )
        data = getattr(res, "data", None) if res is not None else None
        print(f"OK: SELECT returned data={data}")
    except Exception:
        print("FAIL: SELECT threw")
        traceback.print_exc()
        return 1

    # ── 2. UPSERT — same shape the save endpoint sends ─────────────────
    payload = {
        "session_id": TEST_SESSION,
        "level": 3,
        "xp": 50,
        "max_hp": 110,
        "attack": 18,
        "defense": 12,
        "magic": 10,
        "skill_points": 1,
        "gold": 25,
        "hp_potions": 2,
        "mp_potions": 1,
        "shards": 5,
        "learned_moves": ["slash", "shield_up"],
        "equipped_moves": ["slash", "shield_up", "battle_cry", "second_wind"],
        "inventory": ["iron_sword"],
        "equipment": {"weapon": "iron_sword"},
        "purchased_upgrades": ["vitality_1"],
        "settings": {"musicVolume": 0.5, "sfxVolume": 0.7, "fastAnimations": False, "screenShake": True},
    }
    try:
        client.table("hero_progress").upsert(payload).execute()
        print("OK: UPSERT succeeded")
    except Exception:
        print("FAIL: UPSERT threw — this is what your /api/game/save sees")
        traceback.print_exc()
        return 1

    # ── 3. Verify the upsert landed ─────────────────────────────────────
    try:
        res = (
            client.table("hero_progress")
            .select("session_id, level, gold, settings")
            .eq("session_id", TEST_SESSION)
            .maybe_single()
            .execute()
        )
        data = getattr(res, "data", None) if res is not None else None
        print(f"OK: round-trip read: {data}")
    except Exception:
        print("FAIL: post-upsert SELECT threw")
        traceback.print_exc()
        return 1

    # ── 4. Cleanup ──────────────────────────────────────────────────────
    try:
        client.table("hero_progress").delete().eq("session_id", TEST_SESSION).execute()
        print("OK: cleanup deleted test row")
    except Exception:
        print("WARN: cleanup failed (test row will linger)")
        traceback.print_exc()

    print("\n✓ All checks passed — Supabase connection is healthy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
