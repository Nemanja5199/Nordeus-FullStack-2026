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
        "id": "body_slam", "name": "Body Slam", "moveType": "physical", "baseValue": 30,
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
