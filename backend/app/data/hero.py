from typing import Any

# Starting stats for a fresh hero plus the level-up curve. levelUpStats is
# the per-stat gain awarded on level up; xpPerLevel feeds the XP curve in
# the frontend.
HERO_DEFAULTS: dict[str, Any] = {
    "maxHp": 100,
    "attack": 25,
    "defense": 10,
    "magic": 8,
    "defaultMoves": ["slash", "shield_up", "battle_cry", "second_wind"],
    "levelUpStats": {"maxHp": 8, "attack": 2, "defense": 2, "magic": 3},
    "xpPerLevel": 100,
}
