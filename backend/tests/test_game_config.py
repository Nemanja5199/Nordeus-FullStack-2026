"""Sanity checks on game_config — ensures data integrity before any game logic runs."""
import pytest
from app.game_config import MOVES, MONSTERS, HERO_DEFAULTS

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


class TestMonsters:
    def test_five_monsters_in_order(self):
        assert len(MONSTERS) == 5

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

    def test_xp_reward_increases_with_difficulty(self):
        rewards = [m["xpReward"] for m in MONSTERS]
        assert rewards == sorted(rewards), "Monster XP rewards should increase with each monster"

    def test_exactly_four_moves_per_monster(self):
        for m in MONSTERS:
            assert len(m["moves"]) == 4, (
                f"Monster '{m['id']}' should have exactly 4 moves, has {len(m['moves'])}"
            )


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
