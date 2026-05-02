"""Mage vs Knight balance simulation. Reuses the helpers from
tests/test_balance.py to play N random fights for each class against every
monster at level-appropriate hero/monster levels. Prints a side-by-side
win-rate comparison so we can see whether the Mage needs a buff/nerf.

Run from backend/:
    python3 -m scripts.sim_mage

Note: the live AI uses depth-3 expectiminimax which would take hours over
a full sweep. We monkey-patch _MINIMAX_DEPTH=1 for the run — relative class
comparisons still hold, the AI just plays slightly worse for both heroes.
"""
import random
import sys
from typing import Any

# Reuse the same helpers and matchup table from the test file rather than
# duplicating them — keeps this in sync if balance tests are tweaked.
sys.path.insert(0, ".")  # so 'tests' is importable when run as -m scripts.sim_mage

import app.routers.battle as battle_module
from app.game_config import HERO_CLASSES, MOVES, MONSTERS
from app.models import CharacterState
from tests.test_balance import simulate_fight, monster_state, _by_id

# Match the live MANA_MAX / MANA_REGEN constants in test_balance.py.
MANA_MAX = 60

# Drop AI search depth so the sim finishes in a reasonable time.
battle_module._MINIMAX_DEPTH = 1

N_TRIALS = 80  # higher than the unit-test default for tighter estimates

# (monster_id, hero_level, monster_level)
MATCHUPS = [
    ("goblin_warrior",  2,  1),
    ("goblin_mage",     2,  1),
    ("skeleton",        5,  4),
    ("lich",            5,  4),
    ("giant_spider",    8, 13),
    ("big_slime",       8, 10),
    ("witch",          12, 12),
    ("death_knight",   12, 13),
    ("dragon",         28, 28),
]


def hero_at_level_for_class(level: int, cls_id: str) -> tuple[CharacterState, list[str]]:
    base: dict[str, Any] = HERO_CLASSES[cls_id]
    gains = base["levelUpStats"]
    n = max(0, level - 1)
    state = CharacterState(
        hp=base["maxHp"] + gains["maxHp"] * n,
        maxHp=base["maxHp"] + gains["maxHp"] * n,
        attack=base["attack"] + gains["attack"] * n,
        defense=base["defense"] + gains["defense"] * n,
        magic=base["magic"] + gains["magic"] * n,
        activeBuffs=[], activeDots=[],
    )
    return state, base["defaultMoves"]


def run_class(cls_id: str) -> dict[str, dict[str, float]]:
    by = _by_id()
    results: dict[str, dict[str, float]] = {}
    for mid, hero_lv, monster_lv in MATCHUPS:
        monster = by[mid]
        rng = random.Random(42)  # same seed for both classes for fair comparison
        wins = 0
        timeouts = 0
        total_turns = 0
        total_hp_left = 0
        for _ in range(N_TRIALS):
            h, hero_moves = hero_at_level_for_class(hero_lv, cls_id)
            m = monster_state(monster, monster_lv)
            won, turns, hp_left = simulate_fight(h, m, hero_moves, monster["moves"], mid, rng)
            total_turns += turns
            total_hp_left += hp_left
            if won is True:
                wins += 1
            elif won is None:
                timeouts += 1
        results[mid] = {
            "winrate": wins / N_TRIALS,
            "avg_turns": total_turns / N_TRIALS,
            "timeouts": timeouts,
            "hp_left_pct": (total_hp_left / N_TRIALS)
                / (HERO_CLASSES[cls_id]["maxHp"] + HERO_CLASSES[cls_id]["levelUpStats"]["maxHp"] * (hero_lv - 1)),
        }
    return results


def main() -> int:
    print(f"\nRunning {N_TRIALS} fights per matchup, depth-1 AI, seed=42\n")

    print(f"Knight: HP {HERO_CLASSES['knight']['maxHp']}  ATK {HERO_CLASSES['knight']['attack']}  "
          f"DEF {HERO_CLASSES['knight']['defense']}  MAG {HERO_CLASSES['knight']['magic']}")
    print(f"Mage:   HP {HERO_CLASSES['mage']['maxHp']}  ATK {HERO_CLASSES['mage']['attack']}  "
          f"DEF {HERO_CLASSES['mage']['defense']}  MAG {HERO_CLASSES['mage']['magic']}")
    print()

    knight = run_class("knight")
    mage = run_class("mage")

    header = f"{'Monster':<16} {'HeroLv':>6} {'MonLv':>6}   {'Knight WR':>10} {'Mage WR':>10}   {'Δ':>6}   {'K turns':>8} {'M turns':>8}"
    print(header)
    print("─" * len(header))
    for mid, hero_lv, monster_lv in MATCHUPS:
        k = knight[mid]
        m = mage[mid]
        delta = m["winrate"] - k["winrate"]
        delta_marker = "+" if delta >= 0 else ""
        print(
            f"{mid:<16} {hero_lv:>6} {monster_lv:>6}   "
            f"{k['winrate']*100:>9.0f}% {m['winrate']*100:>9.0f}%   "
            f"{delta_marker}{delta*100:>5.0f}%   "
            f"{k['avg_turns']:>8.1f} {m['avg_turns']:>8.1f}"
        )

    # Overall summary
    k_avg = sum(knight[mid]["winrate"] for mid, _, _ in MATCHUPS) / len(MATCHUPS)
    m_avg = sum(mage[mid]["winrate"] for mid, _, _ in MATCHUPS) / len(MATCHUPS)
    print()
    print(f"Average winrate — Knight: {k_avg*100:.0f}%   Mage: {m_avg*100:.0f}%   Δ {(m_avg - k_avg)*100:+.0f}%")

    # Heuristic verdict
    print()
    if m_avg < k_avg - 0.10:
        print("Verdict: Mage trails Knight by >10% on average → likely needs a buff.")
    elif m_avg > k_avg + 0.10:
        print("Verdict: Mage exceeds Knight by >10% on average → likely overtuned.")
    else:
        print("Verdict: Within ±10% of Knight on average → balance looks reasonable.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
