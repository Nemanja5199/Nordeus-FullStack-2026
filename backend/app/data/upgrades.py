from typing import Any

# Meta-progression upgrades. Bought with shards on the UpgradesScene
# between runs; bonuses apply at the start of every new run via
# MetaProgress.getStartingBonuses() on the frontend.
#
# category drives where the bonus lands:
#   maxHp / attack / defense / magic / gold → starting stat bumps
#   skillPoints                              → +N per level-up (Scholar)
UPGRADE_DEFS: list[dict[str, Any]] = [
    # ── Vitality (Max HP) ──────────────────────────────────────────────
    {"id": "vitality_1", "name": "Vitality I",   "category": "maxHp",   "cost": 15, "bonus": 15, "description": "Start each run with +15 Max HP"},
    {"id": "vitality_2", "name": "Vitality II",  "category": "maxHp",   "cost": 30, "bonus": 30, "requires": "vitality_1", "description": "Start each run with +30 Max HP"},
    {"id": "vitality_3", "name": "Vitality III", "category": "maxHp",   "cost": 60, "bonus": 70, "requires": "vitality_2", "description": "Start each run with +70 Max HP"},
    # ── Strength (Attack) ─────────────────────────────────────────────
    {"id": "strength_1", "name": "Strength I",   "category": "attack",  "cost": 15, "bonus": 2,  "description": "Start each run with +2 Attack"},
    {"id": "strength_2", "name": "Strength II",  "category": "attack",  "cost": 30, "bonus": 4,  "requires": "strength_1", "description": "Start each run with +4 Attack"},
    {"id": "strength_3", "name": "Strength III", "category": "attack",  "cost": 60, "bonus": 9,  "requires": "strength_2", "description": "Start each run with +9 Attack"},
    # ── Arcane (Magic) ────────────────────────────────────────────────
    {"id": "arcane_1",   "name": "Arcane I",     "category": "magic",   "cost": 15, "bonus": 2,  "description": "Start each run with +2 Magic"},
    {"id": "arcane_2",   "name": "Arcane II",    "category": "magic",   "cost": 30, "bonus": 4,  "requires": "arcane_1",   "description": "Start each run with +4 Magic"},
    {"id": "arcane_3",   "name": "Arcane III",   "category": "magic",   "cost": 60, "bonus": 9,  "requires": "arcane_2",   "description": "Start each run with +9 Magic"},
    # ── Guard (Defense) ───────────────────────────────────────────────
    {"id": "guard_1",    "name": "Guard I",      "category": "defense", "cost": 15, "bonus": 2,  "description": "Start each run with +2 Defense"},
    {"id": "guard_2",    "name": "Guard II",     "category": "defense", "cost": 30, "bonus": 4,  "requires": "guard_1",    "description": "Start each run with +4 Defense"},
    {"id": "guard_3",    "name": "Guard III",    "category": "defense", "cost": 60, "bonus": 9,  "requires": "guard_2",    "description": "Start each run with +9 Defense"},
    # ── Special ───────────────────────────────────────────────────────
    {"id": "scholar",    "name": "Scholar",      "category": "skillPoints", "cost": 100, "bonus": 1, "description": "Gain +1 extra skill point on every level up"},
    {"id": "hoarder",    "name": "Hoarder",      "category": "gold",        "cost": 40,  "bonus": 25, "description": "Start each run with 25 gold"},
]


def _validate() -> None:
    """Fail loudly at import-time if any upgrade is misshapen."""
    from app.models import MetaUpgrade
    for raw in UPGRADE_DEFS:
        MetaUpgrade.model_validate(raw)


_validate()
