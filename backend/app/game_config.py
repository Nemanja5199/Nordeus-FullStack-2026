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
    # ── Skeleton ─────────────────────────────────────────────────────────
    "bone_strike": {
        "id": "bone_strike", "name": "Bone Strike", "moveType": "physical", "baseValue": 18,
        "effects": [], "repeatPenalty": 0.3, "dropChance": 0.55, "manaCost": 0,
        "description": "A swift bone-handed strike.",
    },
    "bone_armor": {
        "id": "bone_armor", "name": "Bone Armor", "moveType": "none", "baseValue": 0,
        "effects": [{"type": "buff", "target": "self", "stat": "defense", "multiplier": 1.5, "turns": 2}],
        "repeatPenalty": 0.6, "dropChance": 0.40, "manaCost": 20,
        "description": "Raises own Defense by 50% for 2 turns.",
    },
    "rise_again": {
        # Monster-only: lets the skeleton heal itself, justifying its elite slot.
        "id": "rise_again", "name": "Rise Again", "moveType": "heal", "baseValue": 25,
        "effects": [], "repeatPenalty": 0.2, "dropChance": 0.0, "manaCost": 0,
        "description": "Knits broken bones — heals 25 HP plus magic scaling.",
    },
    # ── Lich ─────────────────────────────────────────────────────────────
    "soul_drain": {
        "id": "soul_drain", "name": "Soul Drain", "moveType": "magic", "baseValue": 10,
        "effects": [{"type": "drain", "target": "self"}],
        "repeatPenalty": 0.4, "dropChance": 0.30, "manaCost": 20,
        "description": "Light magic damage; heals self for the same amount.",
    },
    "decay_curse": {
        # The new mechanic: light upfront magic damage, plus a DOT that ticks
        # 4 dmg/turn for 4 turns at end-of-turn.
        "id": "decay_curse", "name": "Decay Curse", "moveType": "magic", "baseValue": 6,
        "effects": [{"type": "dot", "target": "opponent", "value": 4, "turns": 4}],
        "repeatPenalty": 0.5, "dropChance": 0.35, "manaCost": 25,
        "description": "Inflicts a 4-turn decay: 4 dmg/turn after a small initial hit.",
    },
    "death_pulse": {
        "id": "death_pulse", "name": "Death Pulse", "moveType": "magic", "baseValue": 26,
        "effects": [], "repeatPenalty": 0.25, "dropChance": 0.20, "manaCost": 30,
        "description": "A burst of necrotic energy. Heavy magic damage.",
    },
    # ── Death Knight ─────────────────────────────────────────────────────
    # Hybrid lv-4 elite. Mixes physical and magic — hits hard with both, plus
    # the new mp_drain mechanic to lock the hero out of casting.
    "death_strike": {
        "id": "death_strike", "name": "Death Strike", "moveType": "physical", "baseValue": 26,
        "effects": [], "repeatPenalty": 0.2, "dropChance": 0.20, "manaCost": 0,
        "description": "A brutal sweeping strike. Heavy physical damage.",
    },
    "mind_freeze": {
        # The new mechanic: 'mp_drain' burns mana off the target instead of HP.
        # Forces the hero to choose between holding mana for big spells vs
        # spending it before the lich king burns it.
        "id": "mind_freeze", "name": "Mind Freeze", "moveType": "magic", "baseValue": 16,
        "effects": [{"type": "mp_drain", "target": "opponent", "value": 15}],
        "repeatPenalty": 0.4, "dropChance": 0.30, "manaCost": 20,
        "description": "Magic damage that also burns 15 MP from the target.",
    },
    "dread_curse": {
        "id": "dread_curse", "name": "Dread Curse", "moveType": "magic", "baseValue": 10,
        "effects": [
            {"type": "debuff", "target": "opponent", "stat": "attack", "multiplier": 0.7, "turns": 3},
            {"type": "debuff", "target": "opponent", "stat": "magic",  "multiplier": 0.7, "turns": 3},
        ],
        "repeatPenalty": 0.5, "dropChance": 0.40, "manaCost": 25,
        "description": "Magic damage. Lowers target's Attack and Magic by 30% for 3 turns.",
    },
    "unholy_might": {
        "id": "unholy_might", "name": "Unholy Might", "moveType": "none", "baseValue": 0,
        "effects": [
            {"type": "buff", "target": "self", "stat": "attack", "multiplier": 1.4, "turns": 3},
            {"type": "buff", "target": "self", "stat": "magic",  "multiplier": 1.4, "turns": 3},
        ],
        "repeatPenalty": 0.5, "dropChance": 0.40, "manaCost": 25,
        "description": "Empowers self with unholy energy. +40% Attack and Magic for 3 turns.",
    },
    # ── Big Slime ────────────────────────────────────────────────────────
    # Stat-erosion bruiser: stacks ATK+DEF debuffs and slams between them.
    # body_slam stays monster-only so the slime keeps a punishing finisher
    # the player can't poach (matches the headbutt pattern).
    "body_slam": {
        "id": "body_slam", "name": "Body Slam", "moveType": "physical", "baseValue": 28,
        "effects": [], "repeatPenalty": 0.2, "dropChance": 0.0, "manaCost": 0,
        "description": "Throws its bulk at the target. Heavy physical damage.",
    },
    "engulf": {
        "id": "engulf", "name": "Engulf", "moveType": "physical", "baseValue": 14,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "attack", "multiplier": 0.7, "turns": 3}],
        "repeatPenalty": 0.5, "dropChance": 0.40, "manaCost": 10,
        "description": "Smothers the target. Light damage and lowers Attack by 30% for 3 turns.",
    },
    "acid_coat": {
        "id": "acid_coat", "name": "Acid Coat", "moveType": "physical", "baseValue": 10,
        "effects": [{"type": "debuff", "target": "opponent", "stat": "defense", "multiplier": 0.7, "turns": 3}],
        "repeatPenalty": 0.5, "dropChance": 0.40, "manaCost": 8,
        "description": "Sprays corrosive ooze. Light damage and lowers Defense by 30% for 3 turns.",
    },
    "reform": {
        "id": "reform", "name": "Reform", "moveType": "heal", "baseValue": 25,
        "effects": [], "repeatPenalty": 0.4, "dropChance": 0.30, "manaCost": 15,
        "description": "Reconstitutes its body. Heals 25 HP plus magic scaling.",
    },
}

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

POTION_PRICES: dict[str, int] = {"hp": 18, "mp": 21}

# Fixed run order — difficulty scales monster 1 → 5
# Gold/shard rewards roll uniform in [min, max] per kill — no farming, push forward.
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
        # Replaces goblin_veteran. Physical undead with self-heal — the player
        # has to out-pace the regen or get worn down.
        "id": "skeleton", "name": "Skeleton",
        "stats": {"hp": 175, "attack": 22, "defense": 11, "magic": 2},
        "moves": ["bone_strike", "headbutt", "bone_armor", "rise_again"],
        "dropMoves": ["bone_strike", "bone_armor", "headbutt_player"],
        "xpReward": 110,
        "goldMin": 5, "goldMax": 20,
        "shardMin": 1, "shardMax": 3,
    },
    {
        # Lv-2 elite caster. Magic undead, DOT-pressure specialist.
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
        # Lv-4 hybrid elite: physical + magic + mana-burn pressure. Distinct
        # from the lv-2 lich (pure DOT caster) and witch (pure caster).
        "id": "death_knight", "name": "Death Knight",
        "stats": {"hp": 200, "attack": 18, "defense": 14, "magic": 22},
        "moves": ["death_strike", "mind_freeze", "dread_curse", "unholy_might"],
        "dropMoves": ["death_strike", "mind_freeze", "dread_curse", "unholy_might"],
        "xpReward": 320,
        "goldMin": 15, "goldMax": 30,
        "shardMin": 3, "shardMax": 5,
    },
    {
        # Tier-2 tanky bruiser: erodes the hero's stats with engulf+acid_coat,
        # punishes with body_slam, falls back to reform when low.
        "id": "big_slime", "name": "Big Slime",
        "stats": {"hp": 165, "attack": 16, "defense": 14, "magic": 8},
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

HERO_DEFAULTS: dict[str, Any] = {
    "maxHp": 100,
    "attack": 25,
    "defense": 10,
    "magic": 8,
    "defaultMoves": ["slash", "shield_up", "battle_cry", "second_wind"],
    "levelUpStats": {"maxHp": 8, "attack": 2, "defense": 2, "magic": 3},
    "xpPerLevel": 100,
}
