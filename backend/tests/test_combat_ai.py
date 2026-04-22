"""Tests for monster AI move selection — _score_move and _pick_move."""
import pytest
from app.models import MonsterMoveRequest, CharacterState, ActiveBuff
from app.routers.battle import _score_move, _pick_move, AI_PROFILES
from app.game_config import MOVES


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_state(hp=100, max_hp=100, attack=15, defense=10, magic=8, buffs=None):
    return CharacterState(
        hp=hp, maxHp=max_hp,
        attack=attack, defense=defense, magic=magic,
        activeBuffs=buffs or [],
    )


def make_request(monster_id, moves, monster_state=None, hero_state=None, turn=1):
    return MonsterMoveRequest(
        monsterId=monster_id,
        monsterMoves=moves,
        monsterState=monster_state or make_state(),
        heroState=hero_state or make_state(),
        turnNumber=turn,
    )


# ── _score_move ───────────────────────────────────────────────────────────────

class TestScoreMove:
    def _profile(self, monster_id):
        return AI_PROFILES.get(monster_id, {
            "openers": {}, "aggression": 0.75, "debuff_chance": 0.25, "defend_hp": 0.30,
        })

    def test_heavy_damage_move_scores_higher_than_buff_at_low_hp(self):
        # At low HP the buff bonus (25 * hp_pct) shrinks, making big damage moves win
        req = make_request("goblin_warrior", ["headbutt", "frenzy"])
        p = self._profile("goblin_warrior")
        score_dmg = _score_move("headbutt", req, 0.15, p)
        score_buff = _score_move("frenzy", req, 0.15, p)
        assert score_dmg > score_buff

    def test_heal_move_scores_higher_when_hurt(self):
        req = make_request("witch", ["second_wind", "shadow_bolt"])
        p = self._profile("witch")
        score_hurt = _score_move("second_wind", req, 0.2, p)
        score_healthy = _score_move("second_wind", req, 0.9, p)
        assert score_hurt > score_healthy

    def test_drain_scores_higher_when_hurt(self):
        req = make_request("witch", ["drain_life", "shadow_bolt"])
        p = self._profile("witch")
        score_hurt = _score_move("drain_life", req, 0.2, p)
        score_healthy = _score_move("drain_life", req, 0.9, p)
        assert score_hurt > score_healthy

    def test_buff_penalised_if_stat_already_buffed(self):
        existing_buff = ActiveBuff(stat="attack", multiplier=1.5, turnsRemaining=1)
        req = make_request(
            "goblin_warrior", ["frenzy"],
            monster_state=make_state(buffs=[existing_buff]),
        )
        p = self._profile("goblin_warrior")
        score_buffed = _score_move("frenzy", req, 1.0, p)

        req_clean = make_request("goblin_warrior", ["frenzy"])
        score_clean = _score_move("frenzy", req_clean, 1.0, p)
        assert score_clean > score_buffed

    def test_debuff_penalised_if_already_applied(self):
        existing_debuff = ActiveBuff(stat="defense", multiplier=0.7, turnsRemaining=1)
        req = make_request(
            "goblin_warrior", ["dirty_kick"],
            hero_state=make_state(buffs=[existing_debuff]),
        )
        p = self._profile("goblin_warrior")
        score_debuffed = _score_move("dirty_kick", req, 1.0, p)

        req_clean = make_request("goblin_warrior", ["dirty_kick"])
        score_clean = _score_move("dirty_kick", req_clean, 1.0, p)
        assert score_clean > score_debuffed

    def test_defense_buff_prioritised_when_low_hp(self):
        req_low = make_request("goblin_warrior", ["frenzy", "rusty_blade"])
        p = self._profile("dragon")  # dragon has defend_hp=0.40
        # dragon_scales is a defense buff
        score_low = _score_move("dragon_scales", req_low, 0.15, p)
        score_high = _score_move("dragon_scales", req_low, 0.8, p)
        assert score_low > score_high

    def test_score_always_non_negative(self):
        req = make_request("goblin_mage", list(MOVES.keys())[:5])
        p = self._profile("goblin_mage")
        for move_id in list(MOVES.keys())[:5]:
            assert _score_move(move_id, req, 0.5, p) >= 0


# ── _pick_move ────────────────────────────────────────────────────────────────

class TestPickMove:
    def test_returns_valid_move_id(self):
        moves = ["rusty_blade", "dirty_kick", "frenzy", "headbutt"]
        req = make_request("goblin_warrior", moves)
        result = _pick_move(req)
        assert result in moves

    def test_returns_valid_move_on_turn_zero(self):
        moves = ["rusty_blade", "dirty_kick", "frenzy", "headbutt"]
        req = make_request("goblin_warrior", moves, turn=0)
        result = _pick_move(req)
        assert result in moves

    def test_witch_prefers_drain_when_low_hp(self):
        moves = ["shadow_bolt", "drain_life", "curse", "dark_pact"]
        # Run many times — at 25% HP drain_life should dominate (70% chance)
        req = make_request("witch", moves, monster_state=make_state(hp=25, max_hp=100))
        results = [_pick_move(req) for _ in range(100)]
        drain_count = results.count("drain_life")
        assert drain_count > 50, f"Expected drain_life >50/100 times at low HP, got {drain_count}"

    def test_unknown_monster_falls_back_gracefully(self):
        moves = ["slash", "shield_up"]
        req = make_request("unknown_monster", moves)
        result = _pick_move(req)
        assert result in moves

    def test_single_move_always_returned(self):
        req = make_request("goblin_warrior", ["rusty_blade"])
        for _ in range(20):
            assert _pick_move(req) == "rusty_blade"

    def test_opener_is_from_monster_moveset(self):
        moves = ["rusty_blade", "dirty_kick", "frenzy", "headbutt"]
        req = make_request("goblin_warrior", moves, turn=0)
        for _ in range(50):
            result = _pick_move(req)
            assert result in moves
