from typing import Any

# Gear catalogue. Each item has a slot, a tier (1=common shop, 2=rare,
# 3=epic), a cost in gold, and a stat-bonus map applied on equip.
ITEMS: dict[str, dict[str, Any]] = {
    # ── Weapons ──────────────────────────────────────────────────────────────
    "iron_sword": {
        "id": "iron_sword", "name": "Iron Sword", "slot": "weapon", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"attack": 4},
        "description": "A reliable iron blade. +4 Attack.",
    },
    "steel_blade": {
        "id": "steel_blade", "name": "Steel Blade", "slot": "weapon", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"attack": 8},
        "description": "Sharp and well-balanced. +8 Attack.",
    },
    "arcane_staff": {
        "id": "arcane_staff", "name": "Arcane Staff", "slot": "weapon", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"magic": 8},
        "description": "Channels magical energy. +8 Magic.",
    },
    # ── Helmets ───────────────────────────────────────────────────────────────
    "leather_cap": {
        "id": "leather_cap", "name": "Leather Cap", "slot": "helmet", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"defense": 3, "magic": 2},
        "description": "Light head protection. +3 Defense, +2 Magic.",
    },
    "iron_helm": {
        "id": "iron_helm", "name": "Iron Helm", "slot": "helmet", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"defense": 6, "magic": 4},
        "description": "Solid iron headgear. +6 Defense, +4 Magic.",
    },
    # ── Chestplates ───────────────────────────────────────────────────────────
    "leather_vest": {
        "id": "leather_vest", "name": "Leather Vest", "slot": "chestplate", "rarity": "common",
        "tier": 1, "cost": 25,
        "statBonuses": {"maxHp": 15, "defense": 3},
        "description": "Basic body armor. +15 Max HP, +3 Defense.",
    },
    "chain_mail": {
        "id": "chain_mail", "name": "Chain Mail", "slot": "chestplate", "rarity": "rare",
        "tier": 2, "cost": 77,
        "statBonuses": {"maxHp": 30, "defense": 6},
        "description": "Interlocked metal rings. +30 Max HP, +6 Defense.",
    },
    # ── Gloves ────────────────────────────────────────────────────────────────
    "gauntlets": {
        "id": "gauntlets", "name": "Gauntlets", "slot": "gloves", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"attack": 4},
        "description": "Heavy fighting gloves. +4 Attack.",
    },
    "spell_gloves": {
        "id": "spell_gloves", "name": "Spell Gloves", "slot": "gloves", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"magic": 4},
        "description": "Woven with arcane thread. +4 Magic.",
    },
    # ── Rings ─────────────────────────────────────────────────────────────────
    "ring_of_strength": {
        "id": "ring_of_strength", "name": "Ring of Strength", "slot": "ring", "rarity": "common",
        "tier": 1, "cost": 25,
        "statBonuses": {"attack": 4},
        "description": "Enhances physical power. +4 Attack.",
    },
    "ring_of_fortitude": {
        "id": "ring_of_fortitude", "name": "Ring of Fortitude", "slot": "ring", "rarity": "common",
        "tier": 1, "cost": 25,
        "statBonuses": {"defense": 4},
        "description": "Toughens the wearer. +4 Defense.",
    },
    "arcane_ring": {
        "id": "arcane_ring", "name": "Arcane Ring", "slot": "ring", "rarity": "rare",
        "tier": 2, "cost": 77,
        "statBonuses": {"magic": 8},
        "description": "Pulses with magical energy. +8 Magic.",
    },
    # ── New weapons ──────────────────────────────────────────────────────────
    "wooden_wand": {
        "id": "wooden_wand", "name": "Wooden Wand", "slot": "weapon", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"magic": 4},
        "description": "A simple wand for novice casters. +4 Magic.",
    },
    "war_club": {
        "id": "war_club", "name": "War Club", "slot": "weapon", "rarity": "common",
        "tier": 1, "cost": 25,
        "statBonuses": {"attack": 5, "defense": -1},
        "description": "Heavy and crude. +5 Attack, -1 Defense.",
    },
    "battlemage_sword": {
        "id": "battlemage_sword", "name": "Battlemage Sword", "slot": "weapon", "rarity": "rare",
        "tier": 2, "cost": 77,
        "statBonuses": {"attack": 5, "magic": 4},
        "description": "Hybrid blade etched with runes. +5 Attack, +4 Magic.",
    },
    "dragonfang_blade": {
        "id": "dragonfang_blade", "name": "Dragonfang Blade", "slot": "weapon", "rarity": "epic",
        "tier": 3, "cost": 175,
        "statBonuses": {"attack": 14},
        "description": "Forged from a dragon's tooth. +14 Attack.",
    },
    "archmage_staff": {
        "id": "archmage_staff", "name": "Archmage Staff", "slot": "weapon", "rarity": "epic",
        "tier": 3, "cost": 175,
        "statBonuses": {"magic": 14},
        "description": "Saturated with raw arcane power. +14 Magic.",
    },
    # ── New helmets ──────────────────────────────────────────────────────────
    "iron_skullcap": {
        "id": "iron_skullcap", "name": "Iron Skullcap", "slot": "helmet", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"defense": 5},
        "description": "Plain iron protection. +5 Defense.",
    },
    "battle_helm": {
        "id": "battle_helm", "name": "Battle Helm", "slot": "helmet", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"defense": 5, "attack": 5},
        "description": "A warrior's full helm. +5 Defense, +5 Attack.",
    },
    "crown_of_embers": {
        "id": "crown_of_embers", "name": "Crown of Embers", "slot": "helmet", "rarity": "epic",
        "tier": 3, "cost": 170,
        "statBonuses": {"defense": 9, "magic": 6, "maxHp": 20},
        "description": "Smoldering with eternal flame. +9 Defense, +6 Magic, +20 Max HP.",
    },
    # ── New chestplates ──────────────────────────────────────────────────────
    "mage_robe": {
        "id": "mage_robe", "name": "Mage Robe", "slot": "chestplate", "rarity": "common",
        "tier": 1, "cost": 21,
        "statBonuses": {"maxHp": 10, "magic": 4},
        "description": "Loose-fitting arcane robes. +10 Max HP, +4 Magic.",
    },
    "battle_plate": {
        "id": "battle_plate", "name": "Battle Plate", "slot": "chestplate", "rarity": "rare",
        "tier": 2, "cost": 77,
        "statBonuses": {"maxHp": 25, "defense": 4, "attack": 4},
        "description": "Reinforced steel cuirass. +25 Max HP, +4 Defense, +4 Attack.",
    },
    "aegis_mantle": {
        "id": "aegis_mantle", "name": "Aegis Mantle", "slot": "chestplate", "rarity": "epic",
        "tier": 3, "cost": 170,
        "statBonuses": {"maxHp": 60, "defense": 10},
        "description": "Royal armor of legend. +60 Max HP, +10 Defense.",
    },
    # ── New gloves ───────────────────────────────────────────────────────────
    "iron_gauntlets": {
        "id": "iron_gauntlets", "name": "Iron Gauntlets", "slot": "gloves", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"attack": 8},
        "description": "Heavy plated grips. +8 Attack.",
    },
    "sorcerer_wraps": {
        "id": "sorcerer_wraps", "name": "Sorcerer's Wraps", "slot": "gloves", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"magic": 8},
        "description": "Cloth woven with sigils. +8 Magic.",
    },
    "crimson_gauntlets": {
        "id": "crimson_gauntlets", "name": "Crimson Gauntlets", "slot": "gloves", "rarity": "epic",
        "tier": 3, "cost": 160,
        "statBonuses": {"attack": 12, "defense": 5},
        "description": "Soaked red and battle-tested. +12 Attack, +5 Defense.",
    },
    # ── New rings ────────────────────────────────────────────────────────────
    "ring_of_insight": {
        "id": "ring_of_insight", "name": "Ring of Insight", "slot": "ring", "rarity": "common",
        "tier": 1, "cost": 25,
        "statBonuses": {"magic": 3, "maxHp": 10},
        "description": "Sharpens the mind. +3 Magic, +10 Max HP.",
    },
    "ring_of_vigor": {
        "id": "ring_of_vigor", "name": "Ring of Vigor", "slot": "ring", "rarity": "rare",
        "tier": 2, "cost": 70,
        "statBonuses": {"maxHp": 25, "defense": 3},
        "description": "Steadies the heart. +25 Max HP, +3 Defense.",
    },
    "ring_of_power": {
        "id": "ring_of_power", "name": "Ring of Power", "slot": "ring", "rarity": "epic",
        "tier": 3, "cost": 155,
        "statBonuses": {"attack": 6, "magic": 6, "defense": 6},
        "description": "A relic of ancient kings. +6 Attack, +6 Magic, +6 Defense.",
    },
}

# Fixed potion prices in the run shop. HP and MP potion costs live next to
# the gear catalogue because they share the same shop UI / gold sink.
POTION_PRICES: dict[str, int] = {"hp": 18, "mp": 21}


def _validate() -> None:
    """Fail loudly at import-time if any item is misshapen."""
    from app.models import GearItem
    for item_id, raw in ITEMS.items():
        GearItem.model_validate(raw)
        assert raw["id"] == item_id, f"ITEMS key {item_id!r} != id {raw['id']!r}"


_validate()
