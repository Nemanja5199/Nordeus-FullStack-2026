"""Smoke tests for /api/run/meta and /api/run/start.

The two endpoints replaced a single combined /api/run/config; verifying that
the split returns the same data the frontend expects keeps the contract honest.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestRunMeta:
    def test_returns_200_and_expected_top_level_keys(self):
        r = client.get("/api/run/meta")
        assert r.status_code == 200
        body = r.json()
        assert set(body.keys()) == {"monsters", "moves", "items", "heroClasses", "upgrades"}

    def test_hero_classes_includes_knight_and_mage(self):
        body = client.get("/api/run/meta").json()
        assert set(body["heroClasses"].keys()) == {"knight", "mage"}
        # Mage has its unique moveset
        assert body["heroClasses"]["mage"]["defaultMoves"] == ["arc_lash", "mana_ward", "focus", "mend"]

    def test_upgrades_present_and_well_formed(self):
        body = client.get("/api/run/meta").json()
        upgrades = body["upgrades"]
        assert isinstance(upgrades, list) and len(upgrades) > 0
        ids = [u["id"] for u in upgrades]
        # IDs must be unique.
        assert len(set(ids)) == len(ids), "duplicate upgrade ids"
        id_set = set(ids)
        for u in upgrades:
            assert u["cost"] > 0, f"upgrade {u['id']} has non-positive cost"
            if "requires" in u:
                assert u["requires"] in id_set, f"upgrade {u['id']} requires unknown {u['requires']}"

    def test_meta_is_deterministic_across_calls(self):
        # Static config; same response every time. If this fails, /run/meta has
        # snuck in run-specific state (timestamp, random seed, etc).
        a = client.get("/api/run/meta").json()
        b = client.get("/api/run/meta").json()
        assert a == b

    def test_does_not_include_run_specific_fields(self):
        body = client.get("/api/run/meta").json()
        assert "mapTree" not in body
        assert "seed" not in body

    def test_monsters_have_required_reward_fields(self):
        # Catches silent regressions on the goldMin/Max + shardMin/Max schema
        # introduced by the anti-farm rebalance.
        body = client.get("/api/run/meta").json()
        for m in body["monsters"]:
            for k in ("goldMin", "goldMax", "shardMin", "shardMax", "xpReward"):
                assert k in m, f"monster {m['id']} missing {k}"


class TestRunStart:
    def test_returns_200_with_mapTree_and_seed(self):
        r = client.get("/api/run/start")
        assert r.status_code == 200
        body = r.json()
        assert set(body.keys()) == {"mapTree", "seed"}
        assert isinstance(body["seed"], int)

    def test_explicit_seed_is_echoed_back(self):
        body = client.get("/api/run/start?seed=12345").json()
        assert body["seed"] == 12345

    def test_same_seed_produces_same_map(self):
        # Continue uses this property: re-fetching the run with the saved seed
        # must regenerate the same map nodes.
        a = client.get("/api/run/start?seed=42").json()
        b = client.get("/api/run/start?seed=42").json()
        assert a == b

    def test_omitted_seed_is_random(self):
        a = client.get("/api/run/start").json()
        b = client.get("/api/run/start").json()
        # Statistically near-certain to differ. If you ever see a flake here,
        # the seed range collapsed.
        assert a["seed"] != b["seed"]
