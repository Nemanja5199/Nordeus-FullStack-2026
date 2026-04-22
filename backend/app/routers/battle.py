import random
from fastapi import APIRouter
from app.models import MonsterMoveRequest, MonsterMoveResponse
from app.game_config import MOVES

router = APIRouter()

# ── Per-monster AI profiles ───────────────────────────────────────────────────
# opener      : preferred first move (turn 0)
# aggression  : 0-1, weight multiplier for damage moves
# debuff_chance: base probability of using a debuff move when available
# defend_hp   : below this HP% the monster prioritises defensive/heal moves
# witch-specific logic is handled inline below

AI_PROFILES: dict[str, dict] = {
    "goblin_warrior": {
        # 70% frenzy (buff first), 20% dirty_kick (debuff opener), 10% normal scoring
        "openers":      {"frenzy": 0.70, "dirty_kick": 0.20},
        "aggression":   0.90,
        "debuff_chance": 0.35,
        "defend_hp":    0.25,
    },
    "goblin_mage": {
        # 75% arcane_surge, 15% mana_drain opener, 10% normal scoring
        "openers":      {"arcane_surge": 0.75, "mana_drain": 0.15},
        "aggression":   0.65,
        "debuff_chance": 0.30,
        "defend_hp":    0.35,
    },
    "giant_spider": {
        # 60% web_throw (debuff), 25% pounce (aggressive), 15% normal scoring
        "openers":      {"web_throw": 0.60, "pounce": 0.25},
        "aggression":   0.80,
        "debuff_chance": 0.45,
        "defend_hp":    0.28,
    },
    "dragon": {
        # 65% intimidate (debuff), 20% fire_breath (big opener), 15% normal scoring
        "openers":      {"intimidate": 0.65, "fire_breath": 0.20},
        "aggression":   0.75,
        "debuff_chance": 0.30,
        "defend_hp":    0.40,
    },
}


def _active_buff_stats(buffs) -> set[str]:
    return {b.stat for b in buffs}


def _active_debuff_stats(buffs) -> set[str]:
    return {b.stat for b in buffs if b.multiplier < 1}


def _score_move(move_id: str, req: MonsterMoveRequest, hp_pct: float, profile: dict) -> float:
    """Score a single move. Higher = more likely to be chosen."""
    move = MOVES[move_id]
    score = 1.0

    monster_buffed_stats  = _active_buff_stats(req.monsterState.activeBuffs)
    hero_debuffed_stats   = _active_debuff_stats(req.heroState.activeBuffs)

    # ── Damage component ────────────���───────────────────────────────────
    if move["baseValue"] > 0:
        score += move["baseValue"] * profile["aggression"]

    # ── Effects ───────────────────────────────��──────────────────────��──
    for fx in move["effects"]:
        ftype = fx["type"]

        if ftype == "buff" and fx.get("target") == "self":
            stat = fx.get("stat", "")
            if stat in monster_buffed_stats:
                score -= 80          # already buffed — strongly avoid re-casting
            else:
                # Buffs are more valuable when healthy (can capitalise on them)
                score += 25 * hp_pct

        elif ftype == "debuff" and fx.get("target") == "opponent":
            stat = fx.get("stat", "")
            if stat in hero_debuffed_stats:
                score -= 40          # debuff already applied
            else:
                score += 22 * profile["debuff_chance"] * 4

        elif ftype == "drain":
            # Drain is very attractive when hurt
            score += 50 * (1 - hp_pct)

        elif ftype == "hp_cost":
            # Costly moves are risky when already hurt
            score -= fx.get("value", 0) * (1 - hp_pct)

    # ── Heal moves ──────────────────────────────────────────────────────
    if move["moveType"] == "heal":
        score += 70 * (1 - hp_pct)

    # ── Defensive buff priority when below defend_hp ────────────────────
    defend_hp = profile.get("defend_hp", 0.30)
    if hp_pct < defend_hp:
        has_def_buff = any(
            fx["type"] == "buff" and fx.get("stat") == "defense"
            for fx in move["effects"]
        )
        def_stat = "defense"
        if has_def_buff and def_stat not in monster_buffed_stats:
            score += 60

    return max(score, 0.1)


def _pick_move(req: MonsterMoveRequest) -> str:
    moves   = req.monsterMoves
    hp_pct  = req.monsterState.hp / req.monsterState.maxHp
    turn    = req.turnNumber

    # ── Witch: unique drain-life sustain loop ────────────────────────────
    if req.monsterId == "witch":
        if hp_pct < 0.50 and "drain_life" in moves and random.random() < 0.70:
            return "drain_life"
        if hp_pct < 0.30 and any(
            m for m in moves
            if any(e["type"] in ("heal", "drain") for e in MOVES[m]["effects"])
        ):
            heal_moves = [m for m in moves if any(e["type"] in ("heal","drain") for e in MOVES[m]["effects"])]
            return random.choice(heal_moves)

    # ── Get profile (fall back to a neutral default) ─────────────────────
    profile = AI_PROFILES.get(req.monsterId, {
        "openers": {}, "aggression": 0.75, "debuff_chance": 0.25, "defend_hp": 0.30,
    })

    # ── Opener: probabilistic turn-0 move selection ───────────────────────
    if turn == 0:
        openers = profile.get("openers", {})
        buffed_stats = _active_buff_stats(req.monsterState.activeBuffs)
        roll = random.random()
        cumul = 0.0
        for opener_id, chance in openers.items():
            if opener_id not in moves:
                continue
            already_buffed = any(
                fx["type"] == "buff" and fx.get("stat") in buffed_stats
                for fx in MOVES[opener_id]["effects"]
            )
            if already_buffed:
                continue
            cumul += chance
            if roll < cumul:
                return opener_id
        # if roll >= cumul, fall through to normal scoring

    # ── Score all moves and pick with weighted random ─────────────────────
    scores = {m: _score_move(m, req, hp_pct, profile) for m in moves}
    total  = sum(scores.values())
    roll   = random.random() * total
    cumul  = 0.0
    for move_id, s in scores.items():
        cumul += s
        if roll <= cumul:
            return move_id

    return moves[-1]


@router.post("/battle/monster-move", response_model=MonsterMoveResponse)
def get_monster_move(req: MonsterMoveRequest):
    """Called each turn after the player acts. Returns the monster's chosen move."""
    move_id = _pick_move(req)
    return MonsterMoveResponse(moveId=move_id, moveName=MOVES[move_id]["name"])
