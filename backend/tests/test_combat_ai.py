"""Tests for monster AI move selection — _score_move, _pick_move, and minimax."""
import pytest
from app.models import MonsterMoveRequest, CharacterState, ActiveBuff
from app.routers.battle import (
    _score_move, _pick_move, _pick_move_heuristic,
    _minimax, _evaluate, _buff_impact, _apply_move_sim, _tick_buffs_sim, _get_effective_stat,
    _repeat_penalty, AI_PROFILES,
)
from app.game_config import MOVES


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_state(hp=100, max_hp=100, attack=15, defense=10, magic=8, buffs=None):
    return CharacterState(
        hp=hp, maxHp=max_hp,
        attack=attack, defense=defense, magic=magic,
        activeBuffs=buffs or [],
    )


HERO_MOVES = ["slash", "shield_up", "battle_cry", "second_wind"]


def make_request(monster_id, moves, monster_state=None, hero_state=None, turn=1,
                 hero_moves=None, last_monster_moves=None):
    return MonsterMoveRequest(
        monsterId=monster_id,
        monsterMoves=moves,
        monsterState=monster_state or make_state(),
        heroState=hero_state or make_state(),
        turnNumber=turn,
        heroMoves=hero_moves if hero_moves is not None else [],
        lastMonsterMoves=last_monster_moves or [],
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


# ── Minimax ───────────────────────────────────────────────────────────────────

class TestMinimax:
    MONSTER_MOVES = ["shadow_bolt", "drain_life", "curse", "dark_pact"]
    DRAGON_MOVES  = ["flame_breath", "claw_swipe", "intimidate", "dragon_scales"]

    def test_drain_chosen_when_low_hp(self):
        # Witch at 15/75 HP — drain_life should be the most likely move (best survival score)
        req = make_request(
            "witch", self.MONSTER_MOVES,
            monster_state=make_state(hp=15, max_hp=75),
            hero_moves=HERO_MOVES,
        )
        results = [_pick_move(req) for _ in range(100)]
        drain_count = results.count("drain_life")
        assert drain_count > 30, f"Expected drain_life most frequent at low HP, got {drain_count}/100"

    def test_no_rebuff_when_already_buffed(self):
        # goblin_mage with magic buff active — arcane_surge wastes a turn vs dealing damage
        magic_buff = ActiveBuff(stat="magic", multiplier=1.6, turnsRemaining=2)
        req = make_request(
            "goblin_mage", ["firebolt", "arcane_surge", "mana_drain", "hex_shield"],
            monster_state=make_state(attack=10, defense=8, magic=14, buffs=[magic_buff]),
            hero_moves=HERO_MOVES,
        )
        results = [_pick_move(req) for _ in range(50)]
        arcane_count = results.count("arcane_surge")
        assert arcane_count < 20, f"arcane_surge should rarely re-cast when already buffed, got {arcane_count}/50"

    def test_kill_shot_over_buff_when_hero_near_dead(self):
        # Hero at 5 HP — any damage move kills; minimax should take the kill, not buff
        req = make_request(
            "dragon", self.DRAGON_MOVES,
            monster_state=make_state(attack=18, defense=14, magic=10),
            hero_state=make_state(hp=5, max_hp=100),
            hero_moves=HERO_MOVES,
        )
        result = _pick_move(req)
        assert result in ("flame_breath", "claw_swipe")

    def test_avoids_hp_cost_move_when_near_dead(self):
        # Witch at 16 HP — dark_pact costs 15 HP, leaving 1 HP; drain_life is clearly safer
        req = make_request(
            "witch", self.MONSTER_MOVES,
            monster_state=make_state(hp=16, max_hp=75),
            hero_moves=HERO_MOVES,
        )
        result = _pick_move(req)
        assert result != "dark_pact"

    def test_pounce_repeated_when_kill_is_near(self):
        # Spider can nearly kill hero in one pounce; repeat penalty should be ignored
        req = make_request(
            "giant_spider",
            ["bite", "web_throw", "pounce", "skitter"],
            monster_state=make_state(hp=85, max_hp=85, attack=20, defense=10, magic=3),
            hero_state=make_state(hp=28, max_hp=100),
            hero_moves=HERO_MOVES,
            last_monster_moves=["pounce"],  # pounce just played, heavy penalty normally
        )
        results = [_pick_move(req) for _ in range(30)]
        pounce_count = results.count("pounce")
        assert pounce_count > 20, f"pounce should dominate when hero is near-dead, got {pounce_count}/30"

    def test_fallback_to_heuristic_when_no_hero_moves(self):
        # heroMoves=[] means minimax can't run — must fall back gracefully
        moves = ["rusty_blade", "dirty_kick", "frenzy", "headbutt"]
        req = make_request("goblin_warrior", moves, hero_moves=[])
        for _ in range(20):
            assert _pick_move(req) in moves

    def test_terminal_hero_dead_returns_max_score(self):
        # Hero already at 0 HP — minimax should immediately return +1000
        score = _minimax(
            monster=make_state(hp=80, max_hp=100),
            hero=make_state(hp=0, max_hp=100),
            depth=6,
            is_monster_turn=True,
            alpha=-float("inf"),
            beta=float("inf"),
            monster_moves=["rusty_blade"],
            hero_moves=HERO_MOVES,
        )
        assert score == 1000.0

    def test_terminal_monster_dead_returns_min_score(self):
        # Monster already at 0 HP — minimax should immediately return -1000
        score = _minimax(
            monster=make_state(hp=0, max_hp=100),
            hero=make_state(hp=80, max_hp=100),
            depth=6,
            is_monster_turn=True,
            alpha=-float("inf"),
            beta=float("inf"),
            monster_moves=["rusty_blade"],
            hero_moves=HERO_MOVES,
        )
        assert score == -1000.0


# ── _evaluate / _buff_impact ──────────────────────────────────────────────────

class TestEvaluate:
    def test_equal_state_near_zero(self):
        m = make_state(hp=100, max_hp=100)
        h = make_state(hp=100, max_hp=100)
        assert _evaluate(m, h) == pytest.approx(0.0)

    def test_monster_hp_advantage_positive(self):
        m = make_state(hp=80, max_hp=100)
        h = make_state(hp=40, max_hp=100)
        assert _evaluate(m, h) > 0

    def test_hero_hp_advantage_negative(self):
        m = make_state(hp=30, max_hp=100)
        h = make_state(hp=90, max_hp=100)
        assert _evaluate(m, h) < 0

    def test_monster_attack_buff_increases_score(self):
        buff = ActiveBuff(stat="attack", multiplier=1.5, turnsRemaining=2)
        m_buffed = make_state(attack=25, buffs=[buff])
        m_clean  = make_state(attack=25)
        h = make_state()
        assert _evaluate(m_buffed, h) > _evaluate(m_clean, h)

    def test_hero_attack_buff_decreases_score(self):
        buff = ActiveBuff(stat="attack", multiplier=1.5, turnsRemaining=2)
        h_buffed = make_state(attack=15, buffs=[buff])
        h_clean  = make_state(attack=15)
        m = make_state()
        assert _evaluate(m, h_buffed) < _evaluate(m, h_clean)

    def test_hero_debuff_increases_score(self):
        debuff = ActiveBuff(stat="attack", multiplier=0.7, turnsRemaining=2)
        h_debuffed = make_state(attack=15, buffs=[debuff])
        h_clean    = make_state(attack=15)
        m = make_state()
        assert _evaluate(m, h_debuffed) > _evaluate(m, h_clean)

    def test_attack_buff_worth_more_than_defense_buff_for_same_stat_value(self):
        # attack base=20 delta=0.5 turns=2: 20*0.5*0.75*2 = 15
        # defense base=20 delta=0.5 turns=2: 20*0.5*0.5*2 = 10
        atk_buff = ActiveBuff(stat="attack", multiplier=1.5, turnsRemaining=2)
        def_buff = ActiveBuff(stat="defense", multiplier=1.5, turnsRemaining=2)
        score_atk = _buff_impact("attack", 1.5, 2, make_state(attack=20))
        score_def = _buff_impact("defense", 1.5, 2, make_state(defense=20))
        assert score_atk > score_def

    def test_longer_buff_worth_more(self):
        s1 = _buff_impact("attack", 1.5, 1, make_state(attack=15))
        s2 = _buff_impact("attack", 1.5, 2, make_state(attack=15))
        assert s2 > s1


# ── Repeat penalty ────────────────────────────────────────────────────────────

class TestRepeatPenalty:
    def test_no_history_returns_full_weight(self):
        assert _repeat_penalty("headbutt", []) == 1.0

    def test_just_played_returns_base_penalty(self):
        # headbutt has repeatPenalty=0.2 in game_config
        result = _repeat_penalty("headbutt", ["headbutt"])
        assert result == pytest.approx(0.2)

    def test_two_turns_ago_partially_recovered(self):
        # position=1 → base + (1-base) * (1/3)
        base = 0.2
        expected = base + (1.0 - base) * (1 / 3)
        assert _repeat_penalty("headbutt", ["rusty_blade", "headbutt"]) == pytest.approx(expected)

    def test_three_turns_ago_mostly_recovered(self):
        # position=2 → base + (1-base) * (2/3)
        base = 0.2
        expected = base + (1.0 - base) * (2 / 3)
        assert _repeat_penalty("headbutt", ["rusty_blade", "frenzy", "headbutt"]) == pytest.approx(expected)

    def test_flame_breath_penalty_matches_config(self):
        from app.game_config import MOVES
        expected = MOVES["flame_breath"]["repeatPenalty"]
        assert _repeat_penalty("flame_breath", ["flame_breath"]) == pytest.approx(expected)

    def test_buff_move_has_mild_penalty(self):
        # frenzy has repeatPenalty=0.6 — mild nudge, almost free to repeat
        assert _repeat_penalty("frenzy", ["frenzy"]) == pytest.approx(0.6)

    def test_penalty_only_applies_to_matching_move(self):
        # headbutt in history should not affect rusty_blade
        assert _repeat_penalty("rusty_blade", ["headbutt"]) == 1.0

    def test_headbutt_less_likely_after_being_played(self):
        # Run _pick_move 200 times with headbutt as last move
        # It should appear significantly less than 50% (without penalty it dominates)
        moves = ["rusty_blade", "dirty_kick", "frenzy", "headbutt"]
        req_fresh = make_request("goblin_warrior", moves, hero_moves=HERO_MOVES, last_monster_moves=[])
        req_after = make_request("goblin_warrior", moves, hero_moves=HERO_MOVES,
                                 last_monster_moves=["headbutt"])
        n = 200
        fresh_count = sum(1 for _ in range(n) if _pick_move(req_fresh) == "headbutt")
        after_count = sum(1 for _ in range(n) if _pick_move(req_after) == "headbutt")
        assert after_count < fresh_count, (
            f"headbutt should be less frequent after being played: {after_count} vs {fresh_count}"
        )
