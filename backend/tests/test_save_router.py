"""Router-level tests for /api/game/save and /api/game/load with the Supabase
client mocked. Exercises the camelCase ↔ snake_case translator and the
partial-section upsert logic without needing real network access — these
catch the kind of regression where someone removes a field from
HERO_FIELD_MAP and silently breaks (e.g.) gold syncing.

The end-to-end "the SQL actually executes" check lives in
scripts/test_supabase.py, which needs real Supabase credentials and is run
manually, not in CI.
"""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.data.monsters import MonsterId
from app.main import app

client = TestClient(app)


def _mock_client():
    """Returns a mock Supabase client that records .upsert() and .delete()
    calls, and lets tests stub .maybe_single().execute() return values for
    SELECT paths. The chained call pattern matches what save.py uses:
        client.table(name).upsert(payload).execute()
        client.table(name).select(...).eq(...).maybe_single().execute()
    """
    mock = MagicMock()
    mock.table.return_value.upsert.return_value.execute = MagicMock()
    return mock


# ── /api/game/save: outbound translation ────────────────────────────────────

class TestSaveTranslation:
    def test_503_when_supabase_unconfigured(self):
        with patch("app.routers.save._get_client", return_value=None):
            r = client.post("/api/game/save", json={"sessionId": "abc", "hero": {"level": 1}})
        assert r.status_code == 503

    def test_hero_camelcase_keys_become_snake_case_columns(self):
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            r = client.post("/api/game/save", json={
                "sessionId": "test-1",
                "hero": {
                    "level": 5, "xp": 200, "maxHp": 150, "attack": 25,
                    "defense": 12, "magic": 18, "skillPoints": 2, "gold": 88,
                    "hpPotions": 3, "manaPotions": 1,
                    "learnedMoves": ["slash"], "equippedMoves": ["slash"],
                    "inventory": ["iron_sword"], "equipment": {"weapon": "iron_sword"},
                },
            })
        assert r.status_code == 200
        upsert_args = mock.table.return_value.upsert.call_args[0][0]
        assert upsert_args["session_id"] == "test-1"
        assert upsert_args["max_hp"] == 150
        assert upsert_args["skill_points"] == 2
        assert upsert_args["hp_potions"] == 3
        assert upsert_args["mp_potions"] == 1  # manaPotions → mp_potions, not manaPotions
        assert upsert_args["learned_moves"] == ["slash"]
        assert upsert_args["equipped_moves"] == ["slash"]
        # camelCase keys must NOT leak through
        assert "maxHp" not in upsert_args
        assert "skillPoints" not in upsert_args
        assert "manaPotions" not in upsert_args

    def test_meta_keys_translate_alongside_hero_into_one_row(self):
        # hero_progress holds both player progression and meta-progression in
        # the same row. A single upsert should carry columns from both maps.
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            client.post("/api/game/save", json={
                "sessionId": "test-2",
                "hero": {"level": 3},
                "meta": {"shards": 42, "purchasedUpgrades": ["vitality_1", "scholar"]},
            })
        upsert_args = mock.table.return_value.upsert.call_args[0][0]
        assert upsert_args["level"] == 3
        assert upsert_args["shards"] == 42
        assert upsert_args["purchased_upgrades"] == ["vitality_1", "scholar"]

    def test_settings_passes_through_as_jsonb_blob(self):
        # Settings is stored as a single JSONB column, not flattened. The
        # whole object should land in upsert_args["settings"] as-is.
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            client.post("/api/game/save", json={
                "sessionId": "test-3",
                "settings": {
                    "musicVolume": 0.42, "sfxVolume": 0.7,
                    "fastAnimations": True, "screenShake": False,
                },
            })
        upsert_args = mock.table.return_value.upsert.call_args[0][0]
        assert upsert_args["settings"] == {
            "musicVolume": 0.42, "sfxVolume": 0.7,
            "fastAnimations": True, "screenShake": False,
        }

    def test_unknown_hero_fields_are_dropped_silently(self):
        # The translator is an allowlist — random extra fields don't get
        # forwarded to Postgres, where they'd cause a column-not-found error.
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            client.post("/api/game/save", json={
                "sessionId": "test-4",
                "hero": {"level": 1, "unknownField": "garbage", "currentHp": 50},
            })
        upsert_args = mock.table.return_value.upsert.call_args[0][0]
        assert upsert_args["level"] == 1
        # currentHp is a runtime-only field, not stored in DB; should be filtered.
        assert "currentHp" not in upsert_args
        assert "current_hp" not in upsert_args
        assert "unknownField" not in upsert_args


class TestPartialSectionUpsert:
    def test_settings_only_does_not_touch_run_saves(self):
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            client.post("/api/game/save", json={
                "sessionId": "test-5",
                "settings": {"musicVolume": 0.5},
            })
        # hero_progress upsert was called; run_saves was not.
        called_tables = [c.args[0] for c in mock.table.call_args_list]
        assert "hero_progress" in called_tables
        assert "run_saves" not in called_tables

    def test_session_id_only_payload_is_a_noop(self):
        # Empty payload (just session_id) shouldn't issue a useless upsert
        # that would otherwise overwrite columns with their defaults.
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            r = client.post("/api/game/save", json={"sessionId": "test-6"})
        assert r.status_code == 200
        mock.table.return_value.upsert.assert_not_called()

    def test_run_section_writes_to_run_saves_table(self):
        mock = _mock_client()
        with patch("app.routers.save._get_client", return_value=mock):
            client.post("/api/game/save", json={
                "sessionId": "test-7",
                "run": {"currentMonsterIndex": 2, "defeatedMonsterIds": [MonsterId.GOBLIN_WARRIOR], "runConfig": {"seed": 1}},
            })
        # Find the run_saves upsert
        run_calls = [c for c in mock.table.call_args_list if c.args[0] == "run_saves"]
        assert run_calls, "run_saves was never written to"
        # Payload uses snake_case
        upsert_payloads = mock.table.return_value.upsert.call_args_list
        run_payload = next(c.args[0] for c in upsert_payloads if "current_monster_index" in c.args[0])
        assert run_payload["current_monster_index"] == 2
        assert run_payload["defeated_monster_ids"] == [MonsterId.GOBLIN_WARRIOR]
        assert run_payload["run_config"] == {"seed": 1}


# ── /api/game/load: inbound translation ────────────────────────────────────

class TestLoadTranslation:
    def test_503_when_supabase_unconfigured(self):
        with patch("app.routers.save._get_client", return_value=None):
            r = client.get("/api/game/load/abc")
        assert r.status_code == 503

    def test_empty_db_row_returns_all_nulls(self):
        # supabase-py 2.x returns None from .maybe_single().execute() for
        # missing rows. The endpoint must not crash on that.
        mock = MagicMock()
        chain = mock.table.return_value.select.return_value.eq.return_value.maybe_single.return_value
        chain.execute.return_value = None
        with patch("app.routers.save._get_client", return_value=mock):
            r = client.get("/api/game/load/never-saved")
        assert r.status_code == 200
        body = r.json()
        assert body == {"hero": None, "meta": None, "settings": None, "run": None}

    def test_populated_row_translates_snake_to_camel(self):
        # Hero row with the snake_case columns the DB actually stores.
        mock = MagicMock()
        select_chain = mock.table.return_value.select.return_value.eq.return_value.maybe_single.return_value
        # First call: hero_progress; second: run_saves. Use side_effect so
        # the two SELECTs return different rows.
        hero_row = MagicMock()
        hero_row.data = {
            "session_id": "abc",
            "level": 4, "xp": 80, "max_hp": 120, "attack": 20, "defense": 10,
            "magic": 14, "skill_points": 1, "gold": 33,
            "hp_potions": 2, "mp_potions": 0,
            "learned_moves": ["slash"], "equipped_moves": ["slash"],
            "inventory": [], "equipment": {},
            "shards": 25, "purchased_upgrades": ["vitality_1"],
            "settings": {"musicVolume": 0.42},
        }
        select_chain.execute.side_effect = [hero_row, None]
        with patch("app.routers.save._get_client", return_value=mock):
            r = client.get("/api/game/load/abc")
        body = r.json()
        # Hero section: snake → camel
        assert body["hero"]["maxHp"] == 120
        assert body["hero"]["skillPoints"] == 1
        # Frontend uses manaPotions (not mpPotions) — make sure the reverse map matches.
        assert body["hero"]["manaPotions"] == 0
        assert body["hero"]["learnedMoves"] == ["slash"]
        # session_id is not part of the hero section response
        assert "session_id" not in body["hero"]
        # Meta section
        assert body["meta"]["shards"] == 25
        assert body["meta"]["purchasedUpgrades"] == ["vitality_1"]
        # Settings JSONB passes through unchanged
        assert body["settings"] == {"musicVolume": 0.42}

    def test_empty_settings_jsonb_coerces_to_none(self):
        # Postgres column default is '{}'::jsonb; the endpoint maps that empty
        # dict to None so the frontend can distinguish "never saved" from
        # "saved but cleared".
        mock = MagicMock()
        select_chain = mock.table.return_value.select.return_value.eq.return_value.maybe_single.return_value
        hero_row = MagicMock()
        hero_row.data = {"session_id": "abc", "level": 1, "settings": {}}
        select_chain.execute.side_effect = [hero_row, None]
        with patch("app.routers.save._get_client", return_value=mock):
            r = client.get("/api/game/load/abc")
        assert r.json()["settings"] is None
