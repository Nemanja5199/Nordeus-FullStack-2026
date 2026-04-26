from typing import Any

# Each move: moveType in {"physical","magic","heal","none"}
# effects: list of side-effects beyond the primary damage/heal
MOVES: dict[str, dict[str, Any]] = {
    # ── Knight defaults ──────────────────────────────────────────────────
    "slash": {
        "id": "slash", "name": "Slash", "moveType": "physical", "baseValue": 20,
        "effects": [], "repeatPenalty": 0.3, "dropChance": 1.0, "manaCost": 0,
        "description": "A powerful slash dealing moderate physical damage.",
    },
    "shield_up": {
        "id": "shield_up", "name": "Shield Up", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "defense", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 1.0, "manaCost": 30,
        "description": "Raises own Defense by 50% for 2 turns.",
    },
    "battle_cry": {
        "id": "battle_cry", "name": "Battle Cry", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "attack", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 1.0, "manaCost": 20,
        "description": "Raises own Attack by 50% for 2 turns.",
    },
    "second_wind": {
        "id": "second_wind", "name": "Second Wind", "moveType": "heal", "baseValue": 25,
        "effects": [], "repeatPenalty": 0.5, "dropChance": 1.0, "manaCost": 40,
        "description": "Heals for a moderate amount. Scales off Magic.",
    },
    # ── Witch ────────────────────────────────────────────────────────────
    "shadow_bolt": {
        "id": "shadow_bolt", "name": "Shadow Bolt", "moveType": "magic", "baseValue": 22,
        "effects": [], "repeatPenalty": 0.15, "dropChance": 0.25, "manaCost": 15,
        "description": "Deals heavy magic damage.",
    },
    "drain_life": {
        "id": "drain_life", "name": "Drain Life", "moveType": "magic", "baseValue": 4,
        "effects": [{"type": "drain", "target": "self"}],
        "repeatPenalty": 0.4, "dropChance": 0.30, "manaCost": 20,
        "description": "Deals light magic damage and heals self for the same amount.",
    },
    "curse": {
        "id": "curse", "name": "Curse", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "attack", "multiplier": 0.7, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.45, "manaCost": 15,
        "description": "Lowers target's Attack by 30% for 2 turns.",
    },
    "dark_pact": {
        "id": "dark_pact", "name": "Dark Pact", "moveType": "none", "baseValue": 0,
        "effects": [
            {"type": "buff", "target": "self", "stat": "magic", "multiplier": 1.6, "turns": 2},
            {"type": "hp_cost", "value": 15},
        ],
        "repeatPenalty": 0.3, "dropChance": 0.20, "manaCost": 25,
        "description": "Raises own Magic by 60% for 2 turns at the cost of 15 HP.",
    },
    # ── Giant Spider ─────────────────────────────────────────────────────
    "bite": {
        "id": "bite", "name": "Bite", "moveType": "physical", "baseValue": 22,
        "effects": [], "repeatPenalty": 0.25, "dropChance": 0.60, "manaCost": 0,
        "description": "Deals moderate physical damage.",
    },
    "web_throw": {
        "id": "web_throw", "name": "Web Throw", "moveType": "physical", "baseValue": 10,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "defense", "multiplier": 0.7, "turns": 2}],
        "repeatPenalty": 0.5, "dropChance": 0.45, "manaCost": 10,
        "description": "Deals light physical damage and lowers target's Defense for 2 turns.",
    },
    "pounce": {
        "id": "pounce", "name": "Pounce", "moveType": "physical", "baseValue": 30,
        "effects": [], "repeatPenalty": 0.15, "dropChance": 0.20, "manaCost": 0,
        "description": "Deals heavy physical damage.",
    },
    "skitter": {
        "id": "skitter", "name": "Skitter", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "defense", "multiplier": 1.25, "turns": 2}],
        "repeatPenalty": 0.4, "dropChance": 0.60, "manaCost": 15,
        "description": "Raises own Defense by 25% for 2 turns.",
    },
    # ── Dragon (boss — heavy moves have strong cooldown feel) ─────────────
    "flame_breath": {
        "id": "flame_breath", "name": "Flame Breath", "moveType": "magic", "baseValue": 22,
        "effects": [], "repeatPenalty": 0.15, "dropChance": 0.15, "manaCost": 15,
        "description": "Deals heavy magic damage that ignores Defense.",
    },
    "claw_swipe": {
        "id": "claw_swipe", "name": "Claw Swipe", "moveType": "physical", "baseValue": 22,
        "effects": [], "repeatPenalty": 0.2, "dropChance": 0.45, "manaCost": 0,
        "description": "Deals moderate physical damage.",
    },
    "intimidate": {
        "id": "intimidate", "name": "Intimidate", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "attack", "multiplier": 0.7, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.35, "manaCost": 15,
        "description": "Lowers target's Attack by 30% for 2 turns.",
    },
    "dragon_scales": {
        "id": "dragon_scales", "name": "Dragon Scales", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "defense", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.35, "manaCost": 15,
        "description": "Raises own Defense by 50% for 2 turns.",
    },
    # ── Goblin Warrior ───────────────────────────────────────────────────
    "rusty_blade": {
        "id": "rusty_blade", "name": "Rusty Blade", "moveType": "physical", "baseValue": 16,
        "effects": [], "repeatPenalty": 0.25, "dropChance": 0.65, "manaCost": 0,
        "description": "Deals moderate physical damage.",
    },
    "dirty_kick": {
        "id": "dirty_kick", "name": "Dirty Kick", "moveType": "physical", "baseValue": 8,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "defense", "multiplier": 0.7, "turns": 2}],
        "repeatPenalty": 0.5, "dropChance": 0.45, "manaCost": 10,
        "description": "Deals light damage and lowers target's Defense for 2 turns.",
    },
    "frenzy": {
        "id": "frenzy", "name": "Frenzy", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "attack", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.65, "manaCost": 15,
        "description": "Raises own Attack by 50% for 2 turns.",
    },
    "headbutt": {
        "id": "headbutt", "name": "Headbutt", "moveType": "physical", "baseValue": 28,
        "effects": [], "repeatPenalty": 0.2, "dropChance": 0.0, "manaCost": 0,
        "description": "Deals heavy physical damage.",
    },
    "headbutt_player": {
        "id": "headbutt_player", "name": "Headbutt", "moveType": "physical", "baseValue": 24,
        "effects": [], "repeatPenalty": 0.3, "dropChance": 0.20, "manaCost": 0,
        "description": "Deals heavy physical damage.",
    },
    # ── Goblin Mage ──────────────────────────────────────────────────────
    "firebolt": {
        "id": "firebolt", "name": "Firebolt", "moveType": "magic", "baseValue": 12,
        "effects": [], "repeatPenalty": 0.25, "dropChance": 0.60, "manaCost": 10,
        "description": "Deals moderate magic damage.",
    },
    "arcane_surge": {
        "id": "arcane_surge", "name": "Arcane Surge", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "magic", "multiplier": 1.6, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.60, "manaCost": 20,
        "description": "Raises own Magic by 60% for 2 turns.",
    },
    "mana_drain": {
        "id": "mana_drain", "name": "Mana Drain", "moveType": "magic", "baseValue": 10,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "magic", "multiplier": 0.7, "turns": 2}],
        "repeatPenalty": 0.5, "dropChance": 0.35, "manaCost": 25,
        "description": "Deals light magic damage and lowers target's Magic for 2 turns.",
    },
    "hex_shield": {
        "id": "hex_shield", "name": "Hex Shield", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "defense", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.60, "manaCost": 15,
        "description": "Raises own Defense by 50% for 2 turns.",
    },
}

ITEMS: dict[str, dict[str, Any]] = {
    # ── Weapons ──────────────────────────────────────────────────────────────
    "iron_sword": {
        "id": "iron_sword", "name": "Iron Sword", "slot": "weapon", "rarity": "common",
        "statBonuses": {"attack": 4},
        "description": "A reliable iron blade. +4 Attack.",
    },
    "steel_blade": {
        "id": "steel_blade", "name": "Steel Blade", "slot": "weapon", "rarity": "rare",
        "statBonuses": {"attack": 8},
        "description": "Sharp and well-balanced. +8 Attack.",
    },
    "arcane_staff": {
        "id": "arcane_staff", "name": "Arcane Staff", "slot": "weapon", "rarity": "rare",
        "statBonuses": {"magic": 8},
        "description": "Channels magical energy. +8 Magic.",
    },
    # ── Helmets ───────────────────────────────────────────────────────────────
    "leather_cap": {
        "id": "leather_cap", "name": "Leather Cap", "slot": "helmet", "rarity": "common",
        "statBonuses": {"defense": 3, "magic": 2},
        "description": "Light head protection. +3 Defense, +2 Magic.",
    },
    "iron_helm": {
        "id": "iron_helm", "name": "Iron Helm", "slot": "helmet", "rarity": "rare",
        "statBonuses": {"defense": 6, "magic": 4},
        "description": "Solid iron headgear. +6 Defense, +4 Magic.",
    },
    # ── Chestplates ───────────────────────────────────────────────────────────
    "leather_vest": {
        "id": "leather_vest", "name": "Leather Vest", "slot": "chestplate", "rarity": "common",
        "statBonuses": {"maxHp": 15, "defense": 3},
        "description": "Basic body armor. +15 Max HP, +3 Defense.",
    },
    "chain_mail": {
        "id": "chain_mail", "name": "Chain Mail", "slot": "chestplate", "rarity": "rare",
        "statBonuses": {"maxHp": 30, "defense": 6},
        "description": "Interlocked metal rings. +30 Max HP, +6 Defense.",
    },
    # ── Gloves ────────────────────────────────────────────────────────────────
    "gauntlets": {
        "id": "gauntlets", "name": "Gauntlets", "slot": "gloves", "rarity": "common",
        "statBonuses": {"attack": 4},
        "description": "Heavy fighting gloves. +4 Attack.",
    },
    "spell_gloves": {
        "id": "spell_gloves", "name": "Spell Gloves", "slot": "gloves", "rarity": "common",
        "statBonuses": {"magic": 4},
        "description": "Woven with arcane thread. +4 Magic.",
    },
    # ── Rings ─────────────────────────────────────────────────────────────────
    "ring_of_strength": {
        "id": "ring_of_strength", "name": "Ring of Strength", "slot": "ring", "rarity": "common",
        "statBonuses": {"attack": 4},
        "description": "Enhances physical power. +4 Attack.",
    },
    "ring_of_fortitude": {
        "id": "ring_of_fortitude", "name": "Ring of Fortitude", "slot": "ring", "rarity": "common",
        "statBonuses": {"defense": 4},
        "description": "Toughens the wearer. +4 Defense.",
    },
    "arcane_ring": {
        "id": "arcane_ring", "name": "Arcane Ring", "slot": "ring", "rarity": "rare",
        "statBonuses": {"magic": 8},
        "description": "Pulses with magical energy. +8 Magic.",
    },
}

# Fixed run order — difficulty scales monster 1 → 5
MONSTERS: list[dict[str, Any]] = [
    {
        "id": "goblin_warrior", "name": "Goblin Warrior",
        "stats": {"hp": 127, "attack": 19, "defense": 6, "magic": 2},
        "moves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt"],
        "dropMoves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt_player"],
        "xpReward": 80,
        "goldReward": 15,
        "shardReward": 3,
        "itemDropChance": 0.25,
        "itemDropPool": [{"itemId": "iron_sword", "weight": 1}, {"itemId": "gauntlets", "weight": 1}],
    },
    {
        "id": "goblin_mage", "name": "Goblin Mage",
        "stats": {"hp": 115, "attack": 8, "defense": 6, "magic": 15},
        "moves": ["firebolt", "arcane_surge", "mana_drain", "hex_shield"],
        "xpReward": 120,
        "goldReward": 20,
        "shardReward": 4,
        "itemDropChance": 0.25,
        "itemDropPool": [{"itemId": "leather_cap", "weight": 1}, {"itemId": "arcane_ring", "weight": 1}],
    },
    {
        "id": "goblin_veteran", "name": "Goblin Veteran",
        "stats": {"hp": 167, "attack": 23, "defense": 9, "magic": 2},
        "moves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt"],
        "dropMoves": ["rusty_blade", "dirty_kick", "frenzy", "headbutt_player"],
        "xpReward": 110,
        "goldReward": 20,
        "shardReward": 4,
        "itemDropChance": 0.30,
        "itemDropPool": [{"itemId": "iron_sword", "weight": 1}, {"itemId": "gauntlets", "weight": 1}, {"itemId": "ring_of_strength", "weight": 1}],
    },
    {
        "id": "goblin_warlock", "name": "Goblin Warlock",
        "stats": {"hp": 144, "attack": 8, "defense": 8, "magic": 21},
        "moves": ["firebolt", "arcane_surge", "mana_drain", "hex_shield"],
        "xpReward": 150,
        "goldReward": 25,
        "shardReward": 5,
        "itemDropChance": 0.30,
        "itemDropPool": [{"itemId": "leather_cap", "weight": 1}, {"itemId": "arcane_ring", "weight": 1}, {"itemId": "spell_gloves", "weight": 1}],
    },
    {
        "id": "giant_spider", "name": "Giant Spider",
        "stats": {"hp": 189, "attack": 25, "defense": 10, "magic": 3},
        "moves": ["bite", "web_throw", "pounce", "skitter"],
        "xpReward": 180,
        "goldReward": 30,
        "shardReward": 6,
        "itemDropChance": 0.30,
        "itemDropPool": [{"itemId": "spell_gloves", "weight": 1}, {"itemId": "ring_of_fortitude", "weight": 1}],
    },
    {
        "id": "witch", "name": "Witch",
        "stats": {"hp": 144, "attack": 11, "defense": 8, "magic": 25},
        "moves": ["shadow_bolt", "drain_life", "curse", "dark_pact"],
        "xpReward": 280,
        "goldReward": 45,
        "shardReward": 9,
        "itemDropChance": 0.30,
        "itemDropPool": [{"itemId": "iron_helm", "weight": 1}, {"itemId": "arcane_staff", "weight": 1}],
    },
    {
        "id": "dragon", "name": "Dragon",
        "stats": {"hp": 198, "attack": 31, "defense": 11, "magic": 23},
        "moves": ["flame_breath", "claw_swipe", "intimidate", "dragon_scales"],
        "xpReward": 500,
        "goldReward": 80,
        "shardReward": 15,
        "itemDropChance": 0.50,
        "itemDropPool": [
            {"itemId": "steel_blade", "weight": 1}, {"itemId": "chain_mail", "weight": 1},
            {"itemId": "arcane_ring", "weight": 1}, {"itemId": "iron_helm", "weight": 1},
        ],
    },
]

HERO_DEFAULTS: dict[str, Any] = {
    "maxHp": 100,
    "attack": 25,
    "defense": 10,
    "magic": 8,
    "defaultMoves": ["slash", "shield_up", "battle_cry", "second_wind"],
    "levelUpStats": {"maxHp": 8, "attack": 2, "defense": 2, "magic": 3},
    "xpPerLevel": 100,
}
