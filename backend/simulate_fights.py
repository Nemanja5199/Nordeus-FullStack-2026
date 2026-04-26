"""
Fight simulator — runs N trials of hero vs each monster using the real minimax AI.
Usage:  python3 simulate_fights.py [--trials 500] [--level 1] [--verbose]
"""
import argparse
import math
import random
import sys
from typing import NamedTuple

# ── Game data ─────────────────────────────────────────────────────────────────

MANA_MAX  = 60
MANA_REGEN = 6
HERO_MANA_COSTS = {"slash": 0, "shield_up": 30, "battle_cry": 20, "second_wind": 40}

MOVES = {
    "slash":         {"moveType": "physical", "baseValue": 20, "effects": [],                                                                                                                                        "repeatPenalty": 0.3},
    "shield_up":     {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"defense","multiplier":1.5,"turns":2}],                                                    "repeatPenalty": 0.6},
    "battle_cry":    {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"attack", "multiplier":1.5,"turns":2}],                                                    "repeatPenalty": 0.6},
    "second_wind":   {"moveType": "heal",     "baseValue": 25, "effects": [],                                                                                                                                        "repeatPenalty": 0.5},
    "shadow_bolt":   {"moveType": "magic",    "baseValue": 22, "effects": [],                                                                                                                                        "repeatPenalty": 0.15},
    "drain_life":    {"moveType": "magic",    "baseValue": 4,  "effects": [{"type":"drain",  "target":"self"}],                                                                                                      "repeatPenalty": 0.4},
    "curse":         {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"debuff", "target":"opponent","stat":"attack", "multiplier":0.7,"turns":2}],                                                     "repeatPenalty": 0.6},
    "dark_pact":     {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"magic",  "multiplier":1.6,"turns":2},{"type":"hp_cost","value":15}],                      "repeatPenalty": 0.3},
    "bite":          {"moveType": "physical", "baseValue": 22, "effects": [],                                                                                                                                        "repeatPenalty": 0.25},
    "web_throw":     {"moveType": "physical", "baseValue": 10, "effects": [{"type":"debuff", "target":"opponent","stat":"defense","multiplier":0.7,"turns":2}],                                                     "repeatPenalty": 0.5},
    "pounce":        {"moveType": "physical", "baseValue": 30, "effects": [],                                                                                                                                        "repeatPenalty": 0.15},
    "skitter":       {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"defense","multiplier":1.25,"turns":2}],                                                    "repeatPenalty": 0.4},
    "flame_breath":  {"moveType": "magic",    "baseValue": 22, "effects": [],                                                                                                                                        "repeatPenalty": 0.15},
    "claw_swipe":    {"moveType": "physical", "baseValue": 22, "effects": [],                                                                                                                                        "repeatPenalty": 0.2},
    "intimidate":    {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"debuff", "target":"opponent","stat":"attack", "multiplier":0.7,"turns":2}],                                                     "repeatPenalty": 0.6},
    "dragon_scales": {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"defense","multiplier":1.5,"turns":2}],                                                    "repeatPenalty": 0.6},
    "rusty_blade":   {"moveType": "physical", "baseValue": 16, "effects": [],                                                                                                                                        "repeatPenalty": 0.25},
    "dirty_kick":    {"moveType": "physical", "baseValue": 8,  "effects": [{"type":"debuff", "target":"opponent","stat":"defense","multiplier":0.7,"turns":2}],                                                     "repeatPenalty": 0.5},
    "frenzy":        {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"attack", "multiplier":1.5,"turns":2}],                                                    "repeatPenalty": 0.6},
    "headbutt":      {"moveType": "physical", "baseValue": 28, "effects": [],                                                                                                                                        "repeatPenalty": 0.2},
    "firebolt":      {"moveType": "magic",    "baseValue": 12, "effects": [],                                                                                                                                        "repeatPenalty": 0.25},
    "arcane_surge":  {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"magic",  "multiplier":1.6,"turns":2}],                                                    "repeatPenalty": 0.6},
    "mana_drain":    {"moveType": "magic",    "baseValue": 10, "effects": [{"type":"debuff", "target":"opponent","stat":"magic",  "multiplier":0.7,"turns":2}],                                                     "repeatPenalty": 0.5},
    "hex_shield":    {"moveType": "none",     "baseValue": 0,  "effects": [{"type":"buff",   "target":"self",     "stat":"defense","multiplier":1.5,"turns":2}],                                                    "repeatPenalty": 0.6},
}

MONSTERS = [
    {"id":"goblin_warrior", "name":"Goblin Warrior", "hp":127,"attack":19,"defense":6, "magic":2,  "moves":["rusty_blade","dirty_kick","frenzy","headbutt"]},
    {"id":"goblin_mage",    "name":"Goblin Mage",    "hp":115,"attack":8, "defense":6, "magic":15, "moves":["firebolt","arcane_surge","mana_drain","hex_shield"]},
    {"id":"goblin_veteran", "name":"Goblin Veteran", "hp":167,"attack":23,"defense":9, "magic":2,  "moves":["rusty_blade","dirty_kick","frenzy","headbutt"]},
    {"id":"goblin_warlock", "name":"Goblin Warlock", "hp":144,"attack":8, "defense":8, "magic":21, "moves":["firebolt","arcane_surge","mana_drain","hex_shield"]},
    {"id":"giant_spider",   "name":"Giant Spider",   "hp":189,"attack":25,"defense":10,"magic":3,  "moves":["bite","web_throw","pounce","skitter"]},
    {"id":"witch",          "name":"Witch",          "hp":144,"attack":11,"defense":8, "magic":25, "moves":["shadow_bolt","drain_life","curse","dark_pact"]},
    {"id":"dragon",         "name":"Dragon",         "hp":198,"attack":31,"defense":11,"magic":23, "moves":["flame_breath","claw_swipe","intimidate","dragon_scales"]},
]

HERO_BASE  = {"maxHp":100,"attack":25,"defense":10,"magic":8}
HERO_MOVES = ["slash","shield_up","battle_cry","second_wind"]
LEVEL_UP   = {"maxHp":8,"attack":2,"defense":2,"magic":3}
XP_REWARDS = [80, 120, 180, 280, 500]

# ── Lightweight immutable state ───────────────────────────────────────────────
# Buffs stored as tuple of (stat, multiplier, turns_left)

State = tuple  # (hp, maxHp, attack, defense, magic, buffs_tuple)

def make_state(hp, maxHp, attack, defense, magic):
    return (hp, maxHp, attack, defense, magic, ())

def eff(state: State, stat: str) -> int:
    idx = {"attack":2,"defense":3,"magic":4}[stat]
    m = 1.0
    for b in state[5]:
        if b[0] == stat:
            m *= b[1]
    return max(1, int(state[idx] * m))

def with_hp(state: State, hp: int) -> State:
    return (max(0, min(state[1], hp)),) + state[1:]

def add_buff(state: State, stat: str, multiplier: float, turns: int) -> State:
    buffs = list(state[5])
    for i, b in enumerate(buffs):
        if b[0] == stat and b[1] == multiplier:
            buffs[i] = (stat, multiplier, max(b[2], turns))
            return state[:5] + (tuple(buffs),)
    buffs.append((stat, multiplier, turns))
    return state[:5] + (tuple(buffs),)

def tick(state: State) -> State:
    buffs = tuple(b for b in state[5] if b[2] - 1 > 0)
    buffs = tuple((b[0], b[1], b[2]-1) for b in state[5] if b[2]-1 > 0)
    return state[:5] + (buffs,)

def apply_move(move_id: str, atk: State, dfn: State):
    move = MOVES[move_id]
    dmg = 0
    atk_hp, dfn_hp = atk[0], dfn[0]

    if move["moveType"] == "physical" and move["baseValue"] > 0:
        dmg = max(1, int((move["baseValue"] + eff(atk,"attack")) * 0.75 - eff(dfn,"defense") * 0.5))
        dfn_hp = max(0, dfn_hp - dmg)
    elif move["moveType"] == "magic" and move["baseValue"] > 0:
        dmg = max(1, int(move["baseValue"] + eff(atk,"magic") * 1.1))
        dfn_hp = max(0, dfn_hp - dmg)
    elif move["moveType"] == "heal":
        heal = max(5, int(move["baseValue"] + eff(atk,"magic")))
        atk_hp = min(atk[1], atk_hp + heal)

    atk = (atk_hp,) + atk[1:]
    dfn = (dfn_hp,) + dfn[1:]

    for fx in move["effects"]:
        t = fx["type"]
        if t == "drain":
            atk = (min(atk[1], atk[0] + dmg),) + atk[1:]
        elif t in ("buff","debuff"):
            tgt_is_atk = fx.get("target") == "self"
            tgt = atk if tgt_is_atk else dfn
            tgt = add_buff(tgt, fx["stat"], fx["multiplier"], fx["turns"] + 1)
            if tgt_is_atk: atk = tgt
            else:           dfn = tgt
        elif t == "hp_cost":
            atk = (max(1, atk[0] - fx["value"]),) + atk[1:]

    return atk, dfn

# ── Minimax ───────────────────────────────────────────────────────────────────

MINIMAX_DEPTH = 3

def buff_impact(stat, multiplier, turns, state: State) -> float:
    base = state[{"attack":2,"defense":3,"magic":4}.get(stat,2)]
    delta = abs(multiplier - 1.0)
    if stat == "attack":  return base * delta * 0.75 * turns
    if stat == "defense": return base * delta * 0.5  * turns
    if stat == "magic":   return base * delta * 1.1  * turns
    return delta * turns * 3.0

def evaluate(monster: State, hero: State) -> float:
    hp_score = ((monster[0]/monster[1]) - (hero[0]/hero[1])) * 100.0
    buff_score = 0.0
    for b in monster[5]:
        if b[1] > 1.0: buff_score += buff_impact(b[0], b[1], b[2], monster)
    for b in hero[5]:
        if b[1] > 1.0: buff_score -= buff_impact(b[0], b[1], b[2], hero)
        elif b[1] < 1.0: buff_score += buff_impact(b[0], b[1], b[2], hero)
    return hp_score + buff_score * 3.0

def minimax(monster: State, hero: State, depth: int, is_monster_turn: bool,
            alpha: float, beta: float, monster_moves, hero_moves) -> float:
    if monster[0] <= 0: return -1000.0
    if hero[0]    <= 0: return  1000.0
    if depth == 0:      return evaluate(monster, hero)

    if is_monster_turn:
        best = -1e9
        for mid in monster_moves:
            m2, h2 = apply_move(mid, monster, hero)
            score = minimax(m2, h2, depth, False, alpha, beta, monster_moves, hero_moves)
            if score > best: best = score
            if best > alpha: alpha = best
            if beta <= alpha: break
        return best
    else:
        total = 0.0
        for mid in hero_moves:
            h2, m2 = apply_move(mid, hero, monster)
            total += minimax(tick(m2), tick(h2), depth-1, True, alpha, beta, monster_moves, hero_moves)
        return total / len(hero_moves)

def pick_monster_move(monster: State, hero: State, history: list, monster_moves, hero_moves) -> str:
    scores = {}
    for mid in monster_moves:
        m2, h2 = apply_move(mid, monster, hero)
        if h2[0] <= 0: return mid
        scores[mid] = minimax(m2, h2, MINIMAX_DEPTH, False, -1e9, 1e9, monster_moves, hero_moves)

    min_s = min(scores.values())

    def penalty(mid):
        if mid not in history: return 1.0
        pos = history.index(mid)
        base = MOVES[mid].get("repeatPenalty", 0.4)
        return base + (1.0 - base) * (pos / 3)

    weights = {mid: math.sqrt(s - min_s + 1.0) * penalty(mid) for mid, s in scores.items()}
    total = sum(weights.values())
    roll, cumul = random.random() * total, 0.0
    for mid, w in weights.items():
        cumul += w
        if roll <= cumul: return mid
    return monster_moves[-1]

# ── Hero strategy: greedy ─────────────────────────────────────────────────────

def pick_hero_move(hero: State, monster: State, history: list, mana: int) -> str:
    hp_pct = hero[0] / hero[1]
    affordable = [m for m in HERO_MOVES if mana >= HERO_MANA_COSTS.get(m, 0)]
    if not affordable:
        affordable = ["slash"]  # slash is always free

    # Always finish a killable monster immediately
    for mid in affordable:
        h2, m2 = apply_move(mid, hero, monster)
        if m2[0] <= 0:
            return mid

    # Use second_wind when below 35% HP and can afford
    if hp_pct < 0.35 and "second_wind" in affordable and "second_wind" not in history[:1]:
        return "second_wind"

    best_score, best_move = -1e9, affordable[0]
    for mid in affordable:
        h2, m2 = apply_move(mid, hero, monster)
        dmg    = monster[0] - m2[0]
        healed = h2[0] - hero[0]
        score  = dmg + healed * 0.5
        if mid in history: score *= 0.85
        if score > best_score: best_score, best_move = score, mid
    return best_move

# ── Single fight ──────────────────────────────────────────────────────────────

MAX_TURNS = 120

def make_hero_state(level: int, gear: dict | None = None) -> State:
    lvls = level - 1
    hp = HERO_BASE["maxHp"] + lvls * LEVEL_UP["maxHp"]
    g = gear or {}
    return make_state(hp, hp,
                      HERO_BASE["attack"]  + lvls * LEVEL_UP["attack"]  + g.get("attack",  0),
                      HERO_BASE["defense"] + lvls * LEVEL_UP["defense"] + g.get("defense", 0),
                      HERO_BASE["magic"]   + lvls * LEVEL_UP["magic"]   + g.get("magic",   0))

def make_monster_state(m: dict, monster_level: int) -> State:
    scale = 1 + 0.05 * (monster_level - 1)
    hp = int(m["hp"] * scale)
    return make_state(hp, hp,
                      int(m["attack"]  * scale),
                      int(m["defense"] * scale),
                      int(m["magic"]   * scale))

def simulate_fight(monster_cfg: dict, hero_level: int, verbose: bool = False,
                   gear: dict | None = None, monster_level: int | None = None) -> dict:
    hero    = make_hero_state(hero_level, gear)
    monster = make_monster_state(monster_cfg, monster_level if monster_level is not None else hero_level)
    m_moves = monster_cfg["moves"]
    h_hist, m_hist = [], []
    hero_mana = MANA_MAX

    if verbose:
        print(f"\n  Hero   L{hero_level}: HP={hero[0]} ATK={hero[2]} DEF={hero[3]} MAG={hero[4]}")
        print(f"  {monster_cfg['name']}: HP={monster[0]} ATK={monster[2]} DEF={monster[3]} MAG={monster[4]}")
        print()

    for turn in range(1, MAX_TURNS + 1):
        hero_move = pick_hero_move(hero, monster, h_hist, hero_mana)
        hero_mana = max(0, hero_mana - HERO_MANA_COSTS.get(hero_move, 0))
        hero, monster = apply_move(hero_move, hero, monster)
        h_hist = ([hero_move] + h_hist)[:3]

        if verbose:
            print(f"  T{turn:2d}  Hero    → [{hero_move:12s}]  Monster HP {monster[0]:3d}  Hero HP {hero[0]:3d}")

        if monster[0] <= 0:
            return {"winner":"hero",    "turns":turn, "hero_hp_pct": hero[0]/hero[1]}

        monster_move = pick_monster_move(monster, hero, m_hist, m_moves, HERO_MOVES)
        monster, hero = apply_move(monster_move, monster, hero)
        m_hist = ([monster_move] + m_hist)[:3]

        if verbose:
            print(f"       Monster → [{monster_move:12s}]  Hero HP    {hero[0]:3d}  Monster HP {monster[0]:3d}")

        hero    = tick(hero)
        monster = tick(monster)
        hero_mana = min(MANA_MAX, hero_mana + MANA_REGEN)

        if hero[0] <= 0:
            return {"winner":"monster", "turns":turn, "hero_hp_pct": 0.0}

    return {"winner":"draw", "turns":MAX_TURNS, "hero_hp_pct": hero[0]/hero[1]}

# ── Depth scenarios ───────────────────────────────────────────────────────────
# Each scenario represents the expected player state when first arriving at that
# depth: hero level after farming the previous depth 2-3 times, plus realistic
# gear from drops along the way. Monster level = band.min (the minimum they'll
# face at that depth — the "just arrived" difficulty).

# Expected entry levels computed from scaled XP formula (base * monsterLevel):
#   Entering depth 2: L3  (3 depth-1 fights)
#   Entering depth 3: L4  (3 depth-2 fights)
#   Entering depth 4: L6  (3 depth-3 fights — depth 3 XP is huge)
#   Entering depth 5: L9  (3 depth-4 fights)
# Gear assumptions: ~25-30% drop chance per fight, 3 fights per depth
#   depth 1: ~0 drops entering      → no gear
#   depth 2: ~1 common drop         → +4 ATK (iron_sword or gauntlets)
#   depth 3: ~1-2 common drops      → +4 ATK +3 DEF
#   depth 4: ~2 common + 1 rare     → +4 ATK +6 DEF +4 MAG (witch drops iron_helm)
#   depth 5: ~2 common + 2 rare     → +8 ATK +6 DEF +8 MAG

SCENARIOS = [
    {
        "depth": 1, "label": "Depth 1  — fresh start, no gear",
        "monster_ids": ["goblin_warrior", "goblin_mage"],
        "hero_level": 1, "gear": {},
        "monster_level": 1,
        "target_warrior": (65, 90), "target_mage": (55, 70),
    },
    {
        "depth": 2, "label": "Depth 2  — hero L3, +4 ATK",
        "monster_ids": ["goblin_warrior", "goblin_mage"],
        "hero_level": 3, "gear": {"attack": 4},
        "monster_level_warrior": 13, "monster_level_mage": 8,
        "target_warrior": (70, 90), "target_mage": (55, 70),
    },
    {
        "depth": 3, "label": "Depth 3  — hero L4, +4 ATK +3 DEF",
        "monster_ids": ["giant_spider", "witch"],
        "hero_level": 4, "gear": {"attack": 4, "defense": 3},
        "monster_level_spider": 13, "monster_level_witch": 8,
        "target_spider": (65, 85), "target_witch": (45, 60),
    },
    {
        "depth": 4, "label": "Depth 4  — hero L6, +4 ATK +6 DEF +4 MAG",
        "monster_ids": ["giant_spider", "witch"],
        "hero_level": 6, "gear": {"attack": 4, "defense": 6, "magic": 4},
        "monster_level_spider": 22, "monster_level_witch": 13,
        "target_spider": (50, 70), "target_witch": (40, 55),
    },
    {
        "depth": 5, "label": "Depth 5  — boss, hero L9, +8 ATK +6 DEF +8 MAG",
        "monster_ids": ["dragon"],
        "hero_level": 9, "gear": {"attack": 8, "defense": 6, "magic": 8},
        "monster_level": 28,
        "target_dragon": (30, 45),
    },
]

MONSTERS_BY_ID = {m["id"]: m for m in MONSTERS}

TARGET_KEYS = {
    "goblin_warrior": "target_warrior", "goblin_mage": "target_mage",
    "giant_spider": "target_spider",    "witch": "target_witch",
    "dragon": "target_dragon",
}

def run_scenarios(trials: int):
    print(f"\n{'='*76}")
    print(f"  SCENARIO BALANCE CHECK  —  {trials} trials/monster, depth={MINIMAX_DEPTH}")
    print(f"{'='*76}\n")
    print(f"  {'Scenario':<44}  {'Monster':<14}  {'Win%':>5}  {'Target':>9}  Verdict")
    print(f"  {'-'*72}")

    LEVEL_KEY = {
        "goblin_warrior": "monster_level_warrior", "goblin_mage": "monster_level_mage",
        "giant_spider": "monster_level_spider",    "witch": "monster_level_witch",
        "dragon": "monster_level",
    }

    for sc in SCENARIOS:
        hero_l = sc["hero_level"]
        gear   = sc["gear"]

        for mid in sc["monster_ids"]:
            mon_l = sc.get(LEVEL_KEY.get(mid, "monster_level"), sc.get("monster_level", 1))
            cfg = MONSTERS_BY_ID[mid]
            wins = 0
            for _ in range(trials):
                r = simulate_fight(cfg, hero_l, gear=gear, monster_level=mon_l)
                if r["winner"] == "hero":
                    wins += 1
            win_pct = wins / trials * 100
            lo, hi  = sc[TARGET_KEYS[mid]]

            if win_pct < lo:   verdict = "✗  TOO HARD"
            elif win_pct > hi: verdict = "⚠  TOO EASY"
            else:              verdict = "✓  BALANCED"

            label = sc["label"] if mid == sc["monster_ids"][0] else ""
            print(f"  {label:<44}  {cfg['name']:<14}  {win_pct:5.1f}%  {lo}-{hi}%    {verdict}")

        print()

# ── Run suite ─────────────────────────────────────────────────────────────────

def run_trials(trials: int, start_level: int, verbose: bool, only: int | None = None):
    label = f"monster {only}" if only is not None else "all monsters"
    print(f"\n{'='*70}")
    print(f"  FIGHT SIMULATOR  —  {trials} trials/{label}, depth={MINIMAX_DEPTH}, hero L{start_level}")
    print(f"{'='*70}\n")
    print(f"  {'Monster':<18}  {'Hero'}  {'Win%':>5}  {'Loss%':>5}  {'Avg turns':>9}  {'HP left%':>8}  {'Close%':>6}  Verdict")
    print(f"  {'-'*66}")

    xp, current_level = 0, start_level

    for i, monster_cfg in enumerate(MONSTERS):
        # Advance hero level from XP gained by previous monsters
        if i > 0:
            xp += XP_REWARDS[i - 1]
            xp_needed = math.floor(current_level ** 2 * 60)
            while xp >= xp_needed:
                xp -= xp_needed
                current_level += 1
                xp_needed = math.floor(current_level ** 2 * 60)

        if only is not None and i + 1 != only:
            print(f"  [{i+1}] {monster_cfg['name']:<16}  L{current_level:<2}  (skipped)")
            continue

        wins = losses = draws = 0
        total_turns = 0
        hp_pcts = []

        for _ in range(trials):
            r = simulate_fight(monster_cfg, current_level)
            total_turns += r["turns"]
            hp_pcts.append(r["hero_hp_pct"])
            if r["winner"] == "hero":    wins   += 1
            elif r["winner"] == "monster": losses += 1
            else:                          draws  += 1

        win_pct   = wins   / trials * 100
        loss_pct  = losses / trials * 100
        draw_pct  = draws  / trials * 100
        avg_turns = total_turns / trials
        avg_hp    = sum(hp_pcts) / trials * 100
        close_pct = sum(1 for p in hp_pcts if 0 < p < 0.25) / trials * 100

        if win_pct >= 85:  verdict = "⚠  TOO EASY"
        elif loss_pct > 60: verdict = "✗  TOO HARD"
        elif draw_pct > 20: verdict = "↺  STALEMATE"
        else:               verdict = "✓  BALANCED"

        print(f"  [{i+1}] {monster_cfg['name']:<16}  L{current_level:<2}  "
              f"{win_pct:5.1f}%  {loss_pct:5.1f}%  {avg_turns:9.1f}  {avg_hp:8.1f}%  {close_pct:6.1f}%  {verdict}")

        if verbose:
            simulate_fight(monster_cfg, current_level, verbose=True)

    print()

def scan_monster_levels(trials: int):
    """Scan monster levels 1-18 for each depth scenario to find balanced points."""
    SCAN_CONFIGS = [
        {"depth": 2, "hero_level": 3, "gear": {"attack": 4},
         "monsters": [("goblin_warrior", "target_warrior", (65,80)), ("goblin_mage", "target_mage", (55,70))]},
        {"depth": 3, "hero_level": 4, "gear": {"attack": 4, "defense": 3},
         "monsters": [("giant_spider", "target_spider", (55,70)), ("witch", "target_witch", (45,60))]},
        {"depth": 4, "hero_level": 6, "gear": {"attack": 4, "defense": 6, "magic": 4},
         "monsters": [("giant_spider", "target_spider", (50,65)), ("witch", "target_witch", (40,55))]},
        {"depth": 5, "hero_level": 9, "gear": {"attack": 8, "defense": 6, "magic": 8},
         "monsters": [("dragon", "target_dragon", (30,45))]},
    ]
    print(f"\n{'='*72}")
    print(f"  MONSTER LEVEL SCAN  —  {trials} trials, depth={MINIMAX_DEPTH}")
    print(f"{'='*72}")
    for sc in SCAN_CONFIGS:
        print(f"\n  Depth {sc['depth']} — hero L{sc['hero_level']} gear={sc['gear']}")
        print(f"  {'Monster':<16}  " + "  ".join(f"L{l:>2}" for l in range(1, 19)))
        for mid, _, (lo, hi) in sc["monsters"]:
            cfg = MONSTERS_BY_ID[mid]
            row = [f"{cfg['name']:<16}"]
            for ml in range(1, 19):
                wins = sum(1 for _ in range(trials)
                           if simulate_fight(cfg, sc["hero_level"], gear=sc["gear"], monster_level=ml)["winner"] == "hero")
                pct = wins / trials * 100
                mark = "✓" if lo <= pct <= hi else ("▲" if pct > hi else "▼")
                row.append(f"{pct:4.0f}{mark}")
            print("  " + "  ".join(row))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials",  type=int,  default=200)
    parser.add_argument("--level",   type=int,  default=1)
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--depth",   type=int,  default=3)
    parser.add_argument("--monster",   type=int,  default=None, help="Run only monster N (1-indexed)")
    parser.add_argument("--scenarios", action="store_true",    help="Run depth scenario balance check")
    parser.add_argument("--scan",      action="store_true",    help="Scan monster levels 1-18 for each depth")
    args = parser.parse_args()
    MINIMAX_DEPTH = args.depth
    if args.scenarios:
        run_scenarios(args.trials)
    elif args.scan:
        scan_monster_levels(args.trials)
    else:
        run_trials(args.trials, args.level, args.verbose, args.monster)
