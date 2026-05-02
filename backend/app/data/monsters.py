from enum import StrEnum
from typing import Any


class MonsterId(StrEnum):
    """Canonical monster IDs. StrEnum so members compare/serialize as plain
    strings — `MonsterId.GOBLIN_WARRIOR == "goblin_warrior"` is True, JSON
    output stays unchanged. Use this everywhere a monster id is referenced
    (level bands, tier pools, tests) instead of magic strings."""
    GOBLIN_WARRIOR = "goblin_warrior"
    GOBLIN_MAGE    = "goblin_mage"
    SKELETON       = "skeleton"
    LICH           = "lich"
    BIG_SLIME      = "big_slime"
    GIANT_SPIDER   = "giant_spider"
    WITCH          = "witch"
    DEATH_KNIGHT   = "death_knight"
    DRAGON         = "dragon"


# Encounter pool. dropMoves (if present) gates what the player can learn
# on victory; otherwise falls back to `moves`.
MONSTERS: list[dict[str, Any]] = [
    {
        "id": "goblin_warrior", "name": "Goblin Warrior",
        "stats": {"hp": 127, "attack": 19, "defense": 6, "magic": 2},
        "moves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt"],
        "dropMoves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt_player"],
        "xpReward": 80,
        "goldMin": 0, "goldMax": 10,
        "shardMin": 0, "shardMax": 2,
    },
    {
        "id": "goblin_mage", "name": "Goblin Mage",
        "stats": {"hp": 115, "attack": 8, "defense": 6, "magic": 15},
        "moves": ["firebolt", "arcane_surge", "mana_drain", "hex_shield"],
        "xpReward": 120,
        "goldMin": 0, "goldMax": 10,
        "shardMin": 0, "shardMax": 2,
    },
    {
        # Physical undead w/ self-heal — out-pace regen or get worn down.
        "id": "skeleton", "name": "Skeleton",
        "stats": {"hp": 175, "attack": 22, "defense": 11, "magic": 2},
        "moves": ["bone_strike", "headbutt", "bone_armor", "rise_again"],
        "dropMoves": ["bone_strike", "bone_armor", "headbutt_player"],
        "xpReward": 110,
        "goldMin": 5, "goldMax": 20,
        "shardMin": 1, "shardMax": 3,
    },
    {
        # Lv-2 elite — magic undead, DOT-pressure specialist.
        "id": "lich", "name": "Lich",
        "stats": {"hp": 138, "attack": 6, "defense": 9, "magic": 22},
        "moves": ["soul_drain", "decay_curse", "bone_armor", "death_pulse"],
        "dropMoves": ["soul_drain", "decay_curse", "bone_armor"],
        "xpReward": 150,
        "goldMin": 5, "goldMax": 20,
        "shardMin": 1, "shardMax": 3,
    },
    {
        "id": "giant_spider", "name": "Giant Spider",
        "stats": {"hp": 189, "attack": 25, "defense": 10, "magic": 3},
        "moves": ["bite", "web_throw", "pounce", "skitter"],
        "xpReward": 180,
        "goldMin": 10, "goldMax": 25,
        "shardMin": 2, "shardMax": 4,
    },
    {
        "id": "witch", "name": "Witch",
        "stats": {"hp": 144, "attack": 11, "defense": 8, "magic": 25},
        "moves": ["shadow_bolt", "drain_life", "curse", "dark_pact"],
        "xpReward": 280,
        "goldMin": 15, "goldMax": 30,
        "shardMin": 3, "shardMax": 5,
    },
    {
        # Lv-4 hybrid — physical + magic + mp_drain pressure.
        "id": "death_knight", "name": "Death Knight",
        "stats": {"hp": 200, "attack": 18, "defense": 14, "magic": 22},
        "moves": ["death_strike", "mind_freeze", "dread_curse", "unholy_might"],
        "dropMoves": ["death_strike", "mind_freeze", "dread_curse", "unholy_might"],
        "xpReward": 320,
        "goldMin": 15, "goldMax": 30,
        "shardMin": 3, "shardMax": 5,
    },
    {
        # Tier-2 bruiser — engulf+acid_coat erode hero stats, body_slam punishes,
        # reform when low.
        "id": "big_slime", "name": "Big Slime",
        "stats": {"hp": 180, "attack": 16, "defense": 14, "magic": 8},
        "moves": ["body_slam", "engulf", "acid_coat", "reform"],
        "dropMoves": ["engulf", "acid_coat", "reform"],
        "xpReward": 200,
        "goldMin": 10, "goldMax": 25,
        "shardMin": 2, "shardMax": 4,
    },
    {
        "id": "dragon", "name": "Dragon",
        "stats": {"hp": 280, "attack": 31, "defense": 11, "magic": 23},
        "moves": ["flame_breath", "claw_swipe", "intimidate", "dragon_scales"],
        "xpReward": 500,
        "goldMin": 20, "goldMax": 30,
        "shardMin": 4, "shardMax": 5,
    },
]


def _validate() -> None:
    """Fail loudly at import-time if any monster is misshapen or its id is
    not declared in MonsterId."""
    from app.models import Monster
    valid_ids = {m.value for m in MonsterId}
    for raw in MONSTERS:
        Monster.model_validate(raw)
        assert raw["id"] in valid_ids, (
            f"MONSTERS contains id {raw['id']!r} not declared in MonsterId enum"
        )
    # Reverse: every enum member must have an entry in MONSTERS.
    declared = {m["id"] for m in MONSTERS}
    missing = valid_ids - declared
    assert not missing, f"MonsterId members without MONSTERS entry: {missing}"


_validate()
