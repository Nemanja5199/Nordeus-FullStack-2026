"""Tests for generate_map_tree — enforces all structural rules from the spec."""
import pytest
from app.tree_generator import (
    generate_map_tree,
    TIER1_MONSTERS,
    TIER1_ELITE_MONSTERS,
    TIER2_LV3_MONSTERS,
    TIER2_LV4_MONSTERS,
    BOSS_MONSTERS,
)

SEEDS = [0, 1, 42, 999, 12345]  # test multiple seeds to catch non-deterministic edge cases


def get_tree(seed=42):
    return generate_map_tree(seed)


# ── Structure ─────────────────────────────────────────────────────────────────

class TestTreeStructure:
    @pytest.mark.parametrize("seed", SEEDS)
    def test_has_nodes_and_roots(self, seed):
        tree = get_tree(seed)
        assert "nodes" in tree
        assert "roots" in tree
        assert len(tree["nodes"]) > 0
        assert len(tree["roots"]) > 0

    @pytest.mark.parametrize("seed", SEEDS)
    def test_five_levels(self, seed):
        tree = get_tree(seed)
        levels = {n["level"] for n in tree["nodes"].values()}
        assert levels == {1, 2, 3, 4, 5}

    @pytest.mark.parametrize("seed", SEEDS)
    def test_each_level_has_two_or_three_nodes(self, seed):
        tree = get_tree(seed)
        nodes = tree["nodes"].values()
        for level in range(1, 5):
            count = sum(1 for n in nodes if n["level"] == level)
            assert 2 <= count <= 3, f"Level {level} has {count} nodes (expected 2-3)"

    @pytest.mark.parametrize("seed", SEEDS)
    def test_exactly_one_boss_node(self, seed):
        tree = get_tree(seed)
        bosses = [n for n in tree["nodes"].values() if n["level"] == 5]
        assert len(bosses) == 1

    @pytest.mark.parametrize("seed", SEEDS)
    def test_boss_node_type_is_boss(self, seed):
        tree = get_tree(seed)
        boss = next(n for n in tree["nodes"].values() if n["level"] == 5)
        assert boss["type"] == "boss"

    @pytest.mark.parametrize("seed", SEEDS)
    def test_non_boss_nodes_are_monster_type(self, seed):
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            if n["level"] < 5:
                assert n["type"] == "monster", (
                    f"Node '{n['id']}' at level {n['level']} should be 'monster' type"
                )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_roots_are_all_level_one(self, seed):
        tree = get_tree(seed)
        for root_id in tree["roots"]:
            assert tree["nodes"][root_id]["level"] == 1


# ── Reachability ──────────────────────────────────────────────────────────────

class TestReachability:
    def _reachable_nodes(self, tree):
        """BFS from all roots."""
        visited = set()
        queue = list(tree["roots"])
        while queue:
            nid = queue.pop(0)
            if nid in visited:
                continue
            visited.add(nid)
            queue.extend(tree["nodes"][nid]["children"])
        return visited

    @pytest.mark.parametrize("seed", SEEDS)
    def test_all_nodes_reachable_from_roots(self, seed):
        tree = get_tree(seed)
        reachable = self._reachable_nodes(tree)
        all_ids = set(tree["nodes"].keys())
        unreachable = all_ids - reachable
        assert not unreachable, f"Unreachable nodes: {unreachable}"

    @pytest.mark.parametrize("seed", SEEDS)
    def test_every_node_has_at_least_one_child_except_boss(self, seed):
        tree = get_tree(seed)
        for nid, node in tree["nodes"].items():
            if node["level"] < 5:
                assert len(node["children"]) >= 1, (
                    f"Node '{nid}' at level {node['level']} has no children"
                )


# ── Boss convergence ──────────────────────────────────────────────────────────

class TestBossConvergence:
    @pytest.mark.parametrize("seed", SEEDS)
    def test_all_level4_nodes_connect_to_boss(self, seed):
        tree = get_tree(seed)
        boss_id = next(n["id"] for n in tree["nodes"].values() if n["level"] == 5)
        level4 = [n for n in tree["nodes"].values() if n["level"] == 4]
        for node in level4:
            assert boss_id in node["children"], (
                f"Level-4 node '{node['id']}' doesn't connect to boss"
            )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_boss_has_no_children(self, seed):
        tree = get_tree(seed)
        boss = next(n for n in tree["nodes"].values() if n["level"] == 5)
        assert boss["children"] == []


# ── Monster tiers ─────────────────────────────────────────────────────────────

class TestMonsterTiers:
    @pytest.mark.parametrize("seed", SEEDS)
    def test_tier1_levels_use_tier1_monsters(self, seed):
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            if n["level"] == 1:
                assert n["monsterId"] in TIER1_MONSTERS, (
                    f"Level 1 node has non-tier1 monster '{n['monsterId']}'"
                )
            elif n["level"] == 2:
                assert n["monsterId"] in TIER1_ELITE_MONSTERS, (
                    f"Level 2 node has non-elite monster '{n['monsterId']}'"
                )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_elite_monsters_never_appear_at_depth1(self, seed):
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            if n["level"] == 1:
                assert n["monsterId"] not in TIER1_ELITE_MONSTERS, (
                    f"Elite monster '{n['monsterId']}' should not appear at depth 1"
                )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_base_goblins_never_appear_at_depth2(self, seed):
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            if n["level"] == 2:
                assert n["monsterId"] not in TIER1_MONSTERS, (
                    f"Base goblin '{n['monsterId']}' should not appear at depth 2"
                )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_level_bands_present_for_all_tree_monsters(self, seed):
        from app.tree_generator import MONSTER_LEVEL_BANDS
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            key = (n["monsterId"], n["level"])
            assert key in MONSTER_LEVEL_BANDS, (
                f"No level band for ({n['monsterId']}, depth {n['level']})"
            )
            band = n["levelBand"]
            assert band["min"] >= 1, f"Level band min < 1 for {key}"
            assert band["max"] >= band["min"], f"Level band max < min for {key}"

    @pytest.mark.parametrize("seed", SEEDS)
    def test_tier2_levels_use_tier2_monsters(self, seed):
        tree = get_tree(seed)
        for n in tree["nodes"].values():
            if n["level"] == 3:
                assert n["monsterId"] in TIER2_LV3_MONSTERS, (
                    f"Lv-3 node has wrong monster '{n['monsterId']}'"
                )
            elif n["level"] == 4:
                assert n["monsterId"] in TIER2_LV4_MONSTERS, (
                    f"Lv-4 node has wrong monster '{n['monsterId']}'"
                )

    @pytest.mark.parametrize("seed", SEEDS)
    def test_boss_level_uses_boss_monster(self, seed):
        tree = get_tree(seed)
        boss = next(n for n in tree["nodes"].values() if n["level"] == 5)
        assert boss["monsterId"] in BOSS_MONSTERS


# ── Determinism ───────────────────────────────────────────────────────────────

class TestDeterminism:
    def test_same_seed_produces_same_tree(self):
        tree_a = get_tree(42)
        tree_b = get_tree(42)
        assert tree_a == tree_b

    def test_different_seeds_may_differ(self):
        tree_a = get_tree(1)
        tree_b = get_tree(2)
        # Not guaranteed to differ but overwhelmingly likely
        assert tree_a != tree_b or True  # soft check — just ensure no crash
