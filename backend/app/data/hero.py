from typing import Any

# Per-class starting stats, level-up gains, and default moveset. Mirrors
# the HeroDefaults shape on the frontend.
HERO_CLASSES: dict[str, dict[str, Any]] = {
    "knight": {
        "maxHp": 100,
        "attack": 25,
        "defense": 10,
        "magic": 8,
        "defaultMoves": ["slash", "shield_up", "battle_cry", "second_wind"],
        "levelUpStats": {"maxHp": 8, "attack": 2, "defense": 2, "magic": 3},
        "xpPerLevel": 100,
    },
    "mage": {
        # Glass cannon — tuned via scripts/sim_mage.py.
        "maxHp": 80,
        "attack": 8,
        "defense": 6,
        "magic": 25,
        "defaultMoves": ["arc_lash", "mana_ward", "focus", "mend"],
        "levelUpStats": {"maxHp": 6, "attack": 1, "defense": 1, "magic": 4},
        "xpPerLevel": 100,
    },
}
