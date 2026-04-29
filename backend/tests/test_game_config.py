"""Sanity checks on game_config — ensures data integrity before any game logic runs."""
import pytest
from app.game_config import MOVES, MONSTERS, HERO_DEFAULTS, ITEMS, POTION_PRICES

REQUIRED_MOVE_KEYS = {"id", "name", "moveType", "baseValue", "effects", "description"}
VALID_MOVE_TYPES = {"physical", "magic", "heal", "none"}
VALID_EFFECT_TYPES = {"buff", "debuff", "drain", "hp_cost", "dot", "mp_drain"}
VALID_EFFECT_TARGETS = {"self", "opponent"}


class TestMoves:
    def test_all_moves_have_required_keys(self):
        for move_id, move in MOVES.items():
            missing = REQUIRED_MOVE_KEYS - move.keys()
            assert not missing, f"Move '{move_id}' missing keys: {missing}"

    def test_move_ids_match_dict_keys(self):
        for key, move in MOVES.items():
            assert move["id"] == key, f"Move key '{key}' doesn't match move id '{move['id']}'"

    def test_move_types_are_valid(self):
        for move_id, move in MOVES.items():
            assert move["moveType"] in VALID_MOVE_TYPES, (
                f"Move '{move_id}' has invalid moveType '{move['moveType']}'"
            )

    def test_base_value_non_negative(self):
        for move_id, move in MOVES.items():
            assert move["baseValue"] >= 0, f"Move '{move_id}' has negative baseValue"

    def test_none_type_moves_have_zero_base_value(self):
        for move_id, move in MOVES.items():
            if move["moveType"] == "none":
                assert move["baseValue"] == 0, (
                    f"'none' move '{move_id}' should have baseValue=0"
                )

    def test_effect_types_are_valid(self):
        for move_id, move in MOVES.items():
            for fx in move["effects"]:
                assert fx["type"] in VALID_EFFECT_TYPES, (
                    f"Move '{move_id}' has invalid effect type '{fx['type']}'"
                )

    def test_buff_debuff_effects_have_required_fields(self):
        for move_id, move in MOVES.items():
            for fx in move["effects"]:
                if fx["type"] in ("buff", "debuff"):
                    assert "stat" in fx, f"Move '{move_id}' buff/debuff missing 'stat'"
                    assert "multiplier" in fx, f"Move '{move_id}' buff/debuff missing 'multiplier'"
                    assert "turns" in fx, f"Move '{move_id}' buff/debuff missing 'turns'"
                    assert "target" in fx, f"Move '{move_id}' buff/debuff missing 'target'"
                    assert fx["target"] in VALID_EFFECT_TARGETS, (
                        f"Move '{move_id}' has invalid target '{fx['target']}'"
                    )

    def test_buff_multipliers_greater_than_one(self):
        for move_id, move in MOVES.items():
            for fx in move["effects"]:
                if fx["type"] == "buff":
                    assert fx["multiplier"] > 1.0, (
                        f"Move '{move_id}' buff multiplier should be >1, got {fx['multiplier']}"
                    )

    def test_debuff_multipliers_less_than_one(self):
        for move_id, move in MOVES.items():
            for fx in move["effects"]:
                if fx["type"] == "debuff":
                    assert fx["multiplier"] < 1.0, (
                        f"Move '{move_id}' debuff multiplier should be <1, got {fx['multiplier']}"
                    )

    def test_hp_cost_has_value(self):
        for move_id, move in MOVES.items():
            for fx in move["effects"]:
                if fx["type"] == "hp_cost":
                    assert "value" in fx and fx["value"] > 0, (
                        f"Move '{move_id}' hp_cost missing positive 'value'"
                    )


class TestManaCosts:
    """Mana cost invariants — see BattleScene.MANA_MAX (60)."""

    MANA_MAX = 60

    def test_all_moves_declare_mana_cost(self):
        for move_id, move in MOVES.items():
            assert "manaCost" in move, f"Move '{move_id}' missing 'manaCost'"

    def test_mana_costs_non_negative(self):
        for move_id, move in MOVES.items():
            assert move["manaCost"] >= 0, (
                f"Move '{move_id}' has negative manaCost {move['manaCost']}"
            )

    def test_mana_costs_castable_at_full_mana(self):
        # Any move whose cost exceeds MANA_MAX is permanently uncastable.
        for move_id, move in MOVES.items():
            assert move["manaCost"] <= self.MANA_MAX, (
                f"Move '{move_id}' costs {move['manaCost']} but MANA_MAX is {self.MANA_MAX}"
            )

    def test_basic_attack_is_free(self):
        # Slash must be free so the hero is never mana-locked into doing nothing.
        assert MOVES["slash"]["manaCost"] == 0


class TestHeadbuttSplit:
    """Headbutt is monster-only; players get the weaker `headbutt_player` from drops."""

    def test_both_variants_exist(self):
        assert "headbutt" in MOVES
        assert "headbutt_player" in MOVES

    def test_monster_headbutt_does_not_drop(self):
        assert MOVES["headbutt"]["dropChance"] == 0.0

    def test_player_headbutt_drops(self):
        assert MOVES["headbutt_player"]["dropChance"] > 0.0

    def test_player_variant_weaker_than_monster_variant(self):
        assert MOVES["headbutt_player"]["baseValue"] < MOVES["headbutt"]["baseValue"]


class TestMonsters:
    def test_monster_count(self):
        # 5 base + 2 tier-1 elites + big_slime + death_knight
        assert len(MONSTERS) == 9

    def test_all_monsters_have_required_fields(self):
        for m in MONSTERS:
            for field in ("id", "name", "stats", "moves", "xpReward"):
                assert field in m, f"Monster '{m.get('id')}' missing field '{field}'"

    def test_monster_stats_positive(self):
        for m in MONSTERS:
            for stat in ("hp", "attack", "defense", "magic"):
                assert m["stats"][stat] > 0, (
                    f"Monster '{m['id']}' stat '{stat}' must be positive"
                )

    def test_monster_moves_exist_in_moves_dict(self):
        for m in MONSTERS:
            for move_id in m["moves"]:
                assert move_id in MOVES, (
                    f"Monster '{m['id']}' references unknown move '{move_id}'"
                )

    def test_xp_reward_increases_across_tiers(self):
        # Tier 1 (base + elite) should give less XP than tier 2, which gives less than the boss
        tier1_ids = {"goblin_warrior", "goblin_mage", "skeleton", "lich"}
        tier2_ids = {"giant_spider", "witch", "big_slime", "death_knight"}
        boss_ids  = {"dragon"}
        by_id = {m["id"]: m["xpReward"] for m in MONSTERS}
        max_tier1 = max(by_id[mid] for mid in tier1_ids)
        min_tier2 = min(by_id[mid] for mid in tier2_ids)
        max_tier2 = max(by_id[mid] for mid in tier2_ids)
        min_boss  = min(by_id[mid] for mid in boss_ids)
        assert max_tier1 < min_tier2, "Tier-1 XP should be less than tier-2"
        assert max_tier2 < min_boss,  "Tier-2 XP should be less than boss"

    def test_exactly_four_moves_per_monster(self):
        for m in MONSTERS:
            assert len(m["moves"]) == 4, (
                f"Monster '{m['id']}' should have exactly 4 moves, has {len(m['moves'])}"
            )


class TestEliteMonsters:
    """The lv-2 elites (skeleton physical / lich caster) must be strictly harder
    than the base tier-1 goblins AND have a distinct move pool — the whole
    point of the rework was to give elites their own combat identity."""

    def _by_id(self):
        return {m["id"]: m for m in MONSTERS}

    def test_skeleton_stronger_than_goblin_warrior(self):
        by_id = self._by_id()
        base = by_id["goblin_warrior"]["stats"]
        elite = by_id["skeleton"]["stats"]
        assert elite["hp"] > base["hp"], "Skeleton HP should exceed Warrior HP"
        assert elite["attack"] > base["attack"], "Skeleton ATK should exceed Warrior ATK"

    def test_lich_stronger_than_goblin_mage(self):
        by_id = self._by_id()
        base = by_id["goblin_mage"]["stats"]
        elite = by_id["lich"]["stats"]
        assert elite["hp"] > base["hp"], "Lich HP should exceed Mage HP"
        assert elite["magic"] > base["magic"], "Lich MAG should exceed Mage MAG"

    def test_elite_xp_exceeds_base_counterpart(self):
        by_id = self._by_id()
        assert by_id["skeleton"]["xpReward"] > by_id["goblin_warrior"]["xpReward"]
        assert by_id["lich"]["xpReward"] > by_id["goblin_mage"]["xpReward"]

    def test_elites_have_distinct_move_pools_from_base(self):
        # Base goblins reuse a melee/caster set; elites should NOT share movesets,
        # otherwise they're just stat-bumped clones (the original bug).
        by_id = self._by_id()
        assert set(by_id["skeleton"]["moves"]) != set(by_id["goblin_warrior"]["moves"])
        assert set(by_id["lich"]["moves"]) != set(by_id["goblin_mage"]["moves"])

    def test_lich_uses_dot(self):
        # Lich is the DOT specialist — its move set must include at least one
        # move whose effects contain a 'dot' entry.
        by_id = self._by_id()
        lich_moves = by_id["lich"]["moves"]
        has_dot = any(
            any(fx["type"] == "dot" for fx in MOVES[m]["effects"])
            for m in lich_moves
        )
        assert has_dot, "Lich's move pool should contain at least one DOT move"


class TestBigSlime:
    """The slime is a stat-erosion bruiser. Its identity rests on debuffing
    BOTH hero attack and hero defense plus a self-heal — that combo is what
    makes it distinct from the other tier-2 monsters."""

    def _slime(self):
        return next(m for m in MONSTERS if m["id"] == "big_slime")

    def test_slime_debuffs_attack_and_defense(self):
        slime = self._slime()
        debuffed_stats: set[str] = set()
        for move_id in slime["moves"]:
            for fx in MOVES[move_id]["effects"]:
                if fx["type"] == "debuff" and fx.get("target") == "opponent":
                    debuffed_stats.add(fx["stat"])
        assert {"attack", "defense"}.issubset(debuffed_stats), (
            f"Slime should debuff both attack and defense, got {debuffed_stats}"
        )

    def test_slime_has_self_heal(self):
        slime = self._slime()
        has_heal = any(MOVES[m]["moveType"] == "heal" for m in slime["moves"])
        assert has_heal, "Slime should have at least one heal move"

    def test_slime_body_slam_is_monster_only(self):
        # body_slam mirrors the headbutt pattern — heavy hitter held back
        # from the player's drop pool so the slime keeps a punishing finisher.
        assert MOVES["body_slam"]["dropChance"] == 0.0
        assert "body_slam" not in self._slime()["dropMoves"]


class TestDeathKnight:
    """Lv-4 elite. Mixes physical + magic damage and carries the new mp_drain
    mechanic. Combat identity rests on those three things — these tests pin
    the design so a future tweak can't accidentally homogenize it."""

    def _dk(self):
        return next(m for m in MONSTERS if m["id"] == "death_knight")

    def test_has_both_physical_and_magic_moves(self):
        dk = self._dk()
        types = {MOVES[m]["moveType"] for m in dk["moves"]}
        assert "physical" in types, "Death knight should have at least one physical move"
        assert "magic" in types, "Death knight should have at least one magic move"

    def test_kit_includes_mp_drain(self):
        # mind_freeze (or another) must carry an mp_drain effect — that's the
        # signature mechanic that distinguishes him from witch/lich.
        dk_moves = self._dk()["moves"]
        has_drain = any(
            any(fx["type"] == "mp_drain" for fx in MOVES[m]["effects"])
            for m in dk_moves
        )
        assert has_drain, "Death knight's move pool must include mp_drain"

    def test_stronger_than_lv2_lich(self):
        by_id = {m["id"]: m for m in MONSTERS}
        lich = by_id["lich"]["stats"]
        dk = by_id["death_knight"]["stats"]
        assert dk["hp"] > lich["hp"]
        assert dk["attack"] > lich["attack"], "DK should out-hit lv-2 lich physically"


class TestHeroDefaults:
    def test_required_fields_present(self):
        for field in ("maxHp", "attack", "defense", "magic", "defaultMoves", "levelUpStats", "xpPerLevel"):
            assert field in HERO_DEFAULTS, f"HERO_DEFAULTS missing '{field}'"

    def test_four_default_moves(self):
        assert len(HERO_DEFAULTS["defaultMoves"]) == 4

    def test_default_moves_exist(self):
        for move_id in HERO_DEFAULTS["defaultMoves"]:
            assert move_id in MOVES, f"Hero default move '{move_id}' not in MOVES"

    def test_level_up_stats_all_positive(self):
        for stat, gain in HERO_DEFAULTS["levelUpStats"].items():
            assert gain > 0, f"levelUpStats['{stat}'] should be positive"


class TestShopItems:
    """Every gear item must declare a tier (1/2/3) and a positive cost."""

    def test_every_item_has_valid_tier(self):
        for item_id, item in ITEMS.items():
            assert "tier" in item, f"Item '{item_id}' missing 'tier'"
            assert item["tier"] in (1, 2, 3), (
                f"Item '{item_id}' tier must be 1/2/3, got {item['tier']}"
            )

    def test_every_item_has_positive_cost(self):
        for item_id, item in ITEMS.items():
            assert "cost" in item, f"Item '{item_id}' missing 'cost'"
            assert item["cost"] > 0, f"Item '{item_id}' cost must be positive"

    def test_rare_items_are_at_least_tier_two(self):
        # Common items live in tier 1, rare in tier 2+. Catches accidental tier-1 pricing on rare gear.
        for item_id, item in ITEMS.items():
            if item["rarity"] == "rare":
                assert item["tier"] >= 2, (
                    f"Rare item '{item_id}' should be at least tier 2"
                )


class TestNoGearDrops:
    """Gear drops have been removed in favour of a shop. Monster configs must not declare drop fields."""

    def test_no_monster_has_item_drop_chance(self):
        for m in MONSTERS:
            assert "itemDropChance" not in m, (
                f"Monster '{m['id']}' still has 'itemDropChance' — gear drops were removed"
            )

    def test_no_monster_has_item_drop_pool(self):
        for m in MONSTERS:
            assert "itemDropPool" not in m, (
                f"Monster '{m['id']}' still has 'itemDropPool' — gear drops were removed"
            )


class TestPotionPrices:
    def test_potion_prices_positive(self):
        for key in ("hp", "mp"):
            assert key in POTION_PRICES, f"POTION_PRICES missing '{key}'"
            assert POTION_PRICES[key] > 0
