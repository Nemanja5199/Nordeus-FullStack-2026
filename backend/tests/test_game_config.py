"""Sanity checks on game_config — ensures data integrity before any game logic runs."""
import pytest
from app.game_config import MOVES, MONSTERS, HERO_DEFAULTS, ITEMS, POTION_PRICES

REQUIRED_MOVE_KEYS = {"id", "name", "moveType", "baseValue", "effects", "description"}
VALID_MOVE_TYPES = {"physical", "magic", "heal", "none"}
VALID_EFFECT_TYPES = {"buff", "debuff", "drain", "hp_cost"}
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
        # 5 base monsters + 2 elite tier-1 variants
        assert len(MONSTERS) == 7

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
        tier1_ids = {"goblin_warrior", "goblin_mage", "goblin_veteran", "goblin_warlock"}
        tier2_ids = {"giant_spider", "witch"}
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
    """Elite tier-1 variants must be strictly harder than their base counterparts."""

    def _by_id(self):
        return {m["id"]: m for m in MONSTERS}

    def test_goblin_veteran_stronger_than_goblin_warrior(self):
        by_id = self._by_id()
        base = by_id["goblin_warrior"]["stats"]
        elite = by_id["goblin_veteran"]["stats"]
        assert elite["hp"] > base["hp"], "Veteran HP should exceed Warrior HP"
        assert elite["attack"] > base["attack"], "Veteran ATK should exceed Warrior ATK"

    def test_goblin_warlock_stronger_than_goblin_mage(self):
        by_id = self._by_id()
        base = by_id["goblin_mage"]["stats"]
        elite = by_id["goblin_warlock"]["stats"]
        assert elite["hp"] > base["hp"], "Warlock HP should exceed Mage HP"
        assert elite["magic"] > base["magic"], "Warlock MAG should exceed Mage MAG"

    def test_elite_xp_exceeds_base_counterpart(self):
        by_id = self._by_id()
        assert by_id["goblin_veteran"]["xpReward"] > by_id["goblin_warrior"]["xpReward"]
        assert by_id["goblin_warlock"]["xpReward"] > by_id["goblin_mage"]["xpReward"]

    def test_elites_share_move_pools_with_base(self):
        by_id = self._by_id()
        assert by_id["goblin_veteran"]["moves"] == by_id["goblin_warrior"]["moves"]
        assert by_id["goblin_warlock"]["moves"] == by_id["goblin_mage"]["moves"]


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
