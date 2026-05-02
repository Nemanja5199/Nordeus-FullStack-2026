from typing import Any

# Per-class starting stats, level-up gains, and default moveset. Each entry
# matches the HeroDefaults shape on the frontend. CharacterSelectScene picks
# one of these by id (currently "knight" or "mage"); the chosen entry feeds
# defaultHero() in gameState.ts.
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
        # Glass cannon — frail body, devastating magic. Fewer raw HP/ATK
        # gains per level, heavier MAG growth, mirrors the playstyle.
        # Tuned after a balance sim: starting HP bumped 75→80 to soften the
        # early-Goblin matchup, MAG/level dropped 5→4 to cap late-game
        # scaling (Dragon winrate was 82% pre-nerf).
        "maxHp": 80,
        "attack": 8,
        "defense": 6,
        "magic": 25,
        "defaultMoves": ["arc_lash", "mana_ward", "focus", "mend"],
        "levelUpStats": {"maxHp": 6, "attack": 1, "defense": 1, "magic": 4},
        "xpPerLevel": 100,
    },
}

# Backwards-compat alias. Existing imports of HERO_DEFAULTS map to the
# Knight entry — the only class shipped before the Mage was added.
HERO_DEFAULTS: dict[str, Any] = HERO_CLASSES["knight"]
