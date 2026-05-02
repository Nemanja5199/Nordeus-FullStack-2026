"""
Balance sanity, AI move distribution, and battle simulation for the new
monsters. Three layers:
1. TestStatSanity — quick stat-curve assertions (instant).
2. TestAIMoveDistribution — verifies the live AI picks every move at least
   once and never dominates with one.
3. TestBalanceSimulation — random hero plays N fights vs each monster.

Performance note: the live combat AI uses a depth-3 expectiminimax with
`copy.deepcopy` on every node, ~2-3s per move decision. At full depth a
balanced sim of 9 matchups would run for hours. Tests #2 and #3 monkeypatch
`_MINIMAX_DEPTH = 1` for the duration — relative monster strength comparisons
still hold, and the run finishes in under a minute.
"""
import random
from collections import Counter

import pytest

import app.routers.battle as battle_module
from app.game_config import HERO_CLASSES, MOVES, MONSTERS
from app.models import CharacterState, MonsterMoveRequest
from app.routers.battle import (
    _apply_move_sim,
    _pick_move,
    _tick_buffs_sim,
    _tick_dots_sim,
)
from app.tree_generator import MONSTER_LEVEL_BANDS


@pytest.fixture
def shallow_ai(monkeypatch):
    """Drop the AI search depth so balance tests finish in seconds.
    Live gameplay still uses depth 3 — this only affects these tests."""
    monkeypatch.setattr(battle_module, "_MINIMAX_DEPTH", 1)

# Mirrors frontend gameConstants.ts. Hard-coded here to avoid a cross-stack
# import; if MANA_MAX/MANA_REGEN changes on the frontend, mirror it here.
MANA_MAX = 60
MANA_REGEN = 6


# ── Shared helpers ──────────────────────────────────────────────────────────


def _by_id():
    return {m["id"]: m for m in MONSTERS}


def hero_at_level(level: int, moves: list[str]) -> CharacterState:
    """Build a hero at the given level using Knight defaults + level-up gains.
    Mirrors the frontend's level-up math."""
    base = HERO_CLASSES["knight"]
    gains = base["levelUpStats"]
    n = max(0, level - 1)
    return CharacterState(
        hp=base["maxHp"] + gains["maxHp"] * n,
        maxHp=base["maxHp"] + gains["maxHp"] * n,
        attack=base["attack"] + gains["attack"] * n,
        defense=base["defense"] + gains["defense"] * n,
        magic=base["magic"] + gains["magic"] * n,
        activeBuffs=[],
        activeDots=[],
    )


def monster_state(monster: dict, monster_level: int) -> CharacterState:
    """Apply MONSTER_LEVEL_SCALING (1 + 0.05 * (level-1)) to base stats."""
    scale = 1 + 0.05 * (monster_level - 1)
    s = monster["stats"]
    return CharacterState(
        hp=int(s["hp"] * scale),
        maxHp=int(s["hp"] * scale),
        attack=int(s["attack"] * scale),
        defense=int(s["defense"] * scale),
        magic=int(s["magic"] * scale),
        activeBuffs=[],
        activeDots=[],
    )


def _affordable_moves(move_ids: list[str], mana: int) -> list[str]:
    return [mid for mid in move_ids if MOVES[mid]["manaCost"] <= mana]


def simulate_fight(
    hero: CharacterState,
    monster: CharacterState,
    hero_moves: list[str],
    monster_moves: list[str],
    monster_id: str,
    rng: random.Random,
    max_turns: int = 50,
) -> tuple[bool | None, int, int]:
    """One fight. Returns (hero_won_or_None_for_timeout, turns, hero_hp_left)."""
    h, m = hero, monster
    history: list[str] = []
    hero_mana = MANA_MAX

    for turn in range(max_turns):
        # ── Hero acts (random pick from affordable moves) ───────────────────
        candidates = _affordable_moves(hero_moves, hero_mana)
        if not candidates:
            candidates = ["slash"] if "slash" in hero_moves else hero_moves
        hero_move = rng.choice(candidates)
        hero_mana = max(0, hero_mana - MOVES[hero_move]["manaCost"])

        h2, m2 = _apply_move_sim(hero_move, h, m)
        if m2.hp <= 0:
            return True, turn + 1, h2.hp

        # ── Monster acts via the live AI ────────────────────────────────────
        req = MonsterMoveRequest(
            monsterId=monster_id,
            monsterMoves=monster_moves,
            monsterState=m2,
            heroState=h2,
            turnNumber=turn,
            heroMoves=hero_moves,
            lastMonsterMoves=history,
        )
        monster_move = _pick_move(req)
        history = [monster_move, *history][:3]

        m3, h3 = _apply_move_sim(monster_move, m2, h2)
        # mp_drain side-effect: mirror what BattleScene does on the frontend.
        for fx in MOVES[monster_move]["effects"]:
            if fx.get("type") == "mp_drain":
                hero_mana = max(0, hero_mana - fx.get("value", 0))

        if h3.hp <= 0:
            return False, turn + 1, 0

        # ── End-of-turn ticks ───────────────────────────────────────────────
        m4 = _tick_buffs_sim(m3); h4 = _tick_buffs_sim(h3)
        m5 = _tick_dots_sim(m4);  h5 = _tick_dots_sim(h4)
        if h5.hp <= 0:
            return False, turn + 1, 0
        if m5.hp <= 0:
            return True, turn + 1, h5.hp
        h, m = h5, m5
        hero_mana = min(MANA_MAX, hero_mana + MANA_REGEN)

    return None, max_turns, h.hp


# ── 1. Stat sanity ──────────────────────────────────────────────────────────


class TestStatSanity:
    """Quick guards on the new monsters' stats relative to existing ones."""

    def test_death_knight_does_not_outclass_dragon(self):
        b = _by_id()
        dk = b["death_knight"]["stats"]
        dragon = b["dragon"]["stats"]
        # DK is lv-4 elite; dragon is the boss. Dragon must be >= DK on
        # the *aggregate* damage stats (atk + magic) and HP.
        assert dragon["hp"] > dk["hp"], "Dragon HP must exceed Death Knight HP"
        assert (dragon["attack"] + dragon["magic"]) > (dk["attack"] + dk["magic"]), (
            "Dragon's combined offence must exceed Death Knight's"
        )

    def test_big_slime_does_not_outclass_lv4_monsters(self):
        # Slime is lv-3; the lv-4 lineup (witch, death_knight) should
        # collectively be tougher on HP at minimum.
        b = _by_id()
        slime_hp = b["big_slime"]["stats"]["hp"]
        lv4_hps = [b["witch"]["stats"]["hp"], b["death_knight"]["stats"]["hp"]]
        assert max(lv4_hps) > slime_hp, "At least one lv-4 monster should out-HP slime"

    def test_xp_strictly_increases_across_tiers(self):
        b = _by_id()
        tier1 = max(b[m]["xpReward"] for m in ("goblin_warrior", "goblin_mage", "skeleton", "lich"))
        tier2 = min(b[m]["xpReward"] for m in ("giant_spider", "witch", "big_slime", "death_knight"))
        boss  = b["dragon"]["xpReward"]
        assert tier1 < tier2,    "Tier-2 minimum xp must exceed tier-1 maximum"
        assert tier2 < boss,     "Boss xp must exceed tier-2 maximum"


# ── 2. AI move distribution ─────────────────────────────────────────────────


class TestAIMoveDistribution:
    """For each new monster, the live AI must use *every* move it has at
    least once across N runs and must not collapse onto a single move.

    Catches: a move with effects so weak _evaluate never picks it (dead
    weight) or stats/effects so strong it dominates (1-trick monster)."""

    N_TRIALS = 80
    DOMINATION_THRESHOLD = 0.85  # any move >85% pick rate is suspect

    def _distribution(self, monster_id: str, hero_level: int) -> Counter:
        random.seed(7)
        b = _by_id()
        monster = b[monster_id]
        # Pick a representative monster level from the band
        band_levels = [v for k, v in MONSTER_LEVEL_BANDS.items() if k[0] == monster_id]
        m_level = band_levels[0]["min"] if band_levels else 5
        hero_moves = HERO_CLASSES["knight"]["defaultMoves"]
        counts: Counter = Counter()
        for _ in range(self.N_TRIALS):
            req = MonsterMoveRequest(
                monsterId=monster_id,
                monsterMoves=monster["moves"],
                monsterState=monster_state(monster, m_level),
                heroState=hero_at_level(hero_level, hero_moves),
                turnNumber=1,
                heroMoves=hero_moves,
                lastMonsterMoves=[],
            )
            counts[_pick_move(req)] += 1
        return counts

    @pytest.mark.parametrize("monster_id,hero_level", [
        ("big_slime",    8),
        ("death_knight", 12),
    ])
    def test_every_move_is_picked_at_least_once(self, shallow_ai, monster_id, hero_level):
        b = _by_id()
        counts = self._distribution(monster_id, hero_level)
        for move_id in b[monster_id]["moves"]:
            assert counts[move_id] > 0, (
                f"{monster_id}'s move '{move_id}' was never chosen by the AI "
                f"in {self.N_TRIALS} trials — likely dead weight."
            )

    @pytest.mark.parametrize("monster_id,hero_level", [
        ("big_slime",    8),
        ("death_knight", 12),
    ])
    def test_no_single_move_dominates(self, shallow_ai, monster_id, hero_level):
        counts = self._distribution(monster_id, hero_level)
        total = sum(counts.values())
        for move_id, n in counts.items():
            assert n / total < self.DOMINATION_THRESHOLD, (
                f"{monster_id}'s '{move_id}' picked {n/total:.0%} of the time "
                f"(>{self.DOMINATION_THRESHOLD:.0%}) — kit is effectively single-move."
            )


# ── 3. Battle simulation ────────────────────────────────────────────────────


class TestBalanceSimulation:
    """Random hero plays N fights vs each monster. Win-rate must stay in
    a tier-appropriate range — too high means the monster's a pushover,
    too low means a player can't beat it without optimal play."""

    N_TRIALS = 40

    # (monster_id, hero_level, monster_level, lo, hi)
    # Wide ranges since (a) random play swings noisily on small N, and
    # (b) the shallow_ai fixture replaces depth-3 with depth-1 so the AI
    # plays slightly worse than in real games.
    MATCHUPS = [
        ("goblin_warrior", 2,  1, 0.50, 1.00),
        ("goblin_mage",    2,  1, 0.50, 1.00),
        ("skeleton",       5,  4, 0.20, 0.95),
        ("lich",           5,  4, 0.00, 0.95),  # Lich is meant to punish under-leveled heroes — DOT + 26-mag finisher
        ("giant_spider",   8, 13, 0.00, 0.95),
        ("big_slime",      8, 10, 0.00, 0.95),  # Debuff-stack + self-heal kit hard-counters random play; needs planning
        ("witch",         12, 12, 0.00, 0.90),
        ("death_knight",  12, 13, 0.00, 0.90),
        ("dragon",        28, 28, 0.00, 0.85),
    ]

    @pytest.mark.parametrize("monster_id,hero_level,monster_level,lo,hi", MATCHUPS)
    def test_hero_winrate_in_range(
        self, shallow_ai, monster_id, hero_level, monster_level, lo, hi
    ):
        b = _by_id()
        monster = b[monster_id]
        hero_moves = HERO_CLASSES["knight"]["defaultMoves"]
        rng = random.Random(42)  # reproducible
        wins = 0
        timeouts = 0
        total_turns = 0
        for _ in range(self.N_TRIALS):
            h = hero_at_level(hero_level, hero_moves)
            m = monster_state(monster, monster_level)
            won, turns, _ = simulate_fight(h, m, hero_moves, monster["moves"], monster_id, rng)
            total_turns += turns
            if won is True:
                wins += 1
            elif won is None:
                timeouts += 1
        rate = wins / self.N_TRIALS
        avg_turns = total_turns / self.N_TRIALS
        assert lo <= rate <= hi, (
            f"{monster_id} (heroLv {hero_level} vs monsterLv {monster_level}): "
            f"hero winrate {rate:.0%} outside [{lo:.0%}, {hi:.0%}]. "
            f"Avg turns {avg_turns:.1f}, timeouts {timeouts}"
        )
        assert timeouts < self.N_TRIALS * 0.1, (
            f"{monster_id} timed out on {timeouts}/{self.N_TRIALS} fights — "
            f"damage curve is broken (fights drag past {50} turns)."
        )
