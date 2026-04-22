import copy
import math
import random
from fastapi import APIRouter
from app.models import ActiveBuff, CharacterState, MonsterMoveRequest, MonsterMoveResponse
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


# ── Combat simulation (mirrors frontend combat.ts exactly) ───────────────────


def _get_effective_stat(state: CharacterState, stat: str) -> int:
    multiplier = 1.0
    for b in state.activeBuffs:
        if b.stat == stat:
            multiplier *= b.multiplier
    return max(1, int(getattr(state, stat) * multiplier))


def _apply_move_sim(
    move_id: str,
    attacker: CharacterState,
    defender: CharacterState,
) -> tuple[CharacterState, CharacterState]:
    """Non-mutating: returns deep-copied (attacker, defender) with the move applied."""
    atk = copy.deepcopy(attacker)
    dfn = copy.deepcopy(defender)
    move = MOVES[move_id]

    eff_atk = _get_effective_stat(atk, "attack")
    eff_mag = _get_effective_stat(atk, "magic")
    eff_def = _get_effective_stat(dfn, "defense")
    damage = 0

    if move["moveType"] == "physical" and move["baseValue"] > 0:
        damage = max(1, int((move["baseValue"] + eff_atk) * 0.75 - eff_def * 0.5))
        dfn.hp = max(0, dfn.hp - damage)
    elif move["moveType"] == "magic" and move["baseValue"] > 0:
        damage = max(1, int(move["baseValue"] + eff_mag * 1.1))
        dfn.hp = max(0, dfn.hp - damage)
    elif move["moveType"] == "heal":
        heal = max(5, int(move["baseValue"] + eff_mag))
        atk.hp = min(atk.maxHp, atk.hp + heal)

    for fx in move["effects"]:
        ftype = fx["type"]
        if ftype == "drain":
            atk.hp = min(atk.maxHp, atk.hp + damage)
        elif ftype in ("buff", "debuff"):
            tgt = atk if fx.get("target") == "self" else dfn
            existing = next(
                (b for b in tgt.activeBuffs if b.stat == fx["stat"] and b.multiplier == fx["multiplier"]),
                None,
            )
            if existing:
                existing.turnsRemaining = max(existing.turnsRemaining, fx["turns"])
            else:
                tgt.activeBuffs.append(
                    ActiveBuff(stat=fx["stat"], multiplier=fx["multiplier"], turnsRemaining=fx["turns"])
                )
        elif ftype == "hp_cost":
            atk.hp = max(1, atk.hp - fx["value"])

    return atk, dfn


def _tick_buffs_sim(state: CharacterState) -> CharacterState:
    """Non-mutating: returns a deep copy with all buff durations decremented and expired ones removed."""
    s = copy.deepcopy(state)
    s.activeBuffs = [
        ActiveBuff(stat=b.stat, multiplier=b.multiplier, turnsRemaining=b.turnsRemaining - 1)
        for b in s.activeBuffs
        if b.turnsRemaining - 1 > 0
    ]
    return s


def _buff_impact(stat: str, multiplier: float, turns: int, char: CharacterState) -> float:
    """Estimate the combat value of a buff/debuff in HP-equivalent units."""
    base = getattr(char, stat, 0)
    delta = abs(multiplier - 1.0)
    if stat == "attack":
        return base * delta * 0.75 * turns
    elif stat == "defense":
        return base * delta * 0.5 * turns
    elif stat == "magic":
        return base * delta * 1.1 * turns
    return delta * turns * 3.0


def _evaluate(monster: CharacterState, hero: CharacterState) -> float:
    """Heuristic score from the monster's perspective. Positive = monster is winning."""
    hp_score = ((monster.hp / monster.maxHp) - (hero.hp / hero.maxHp)) * 100.0

    buff_score = 0.0
    for b in monster.activeBuffs:
        if b.multiplier > 1.0:
            buff_score += _buff_impact(b.stat, b.multiplier, b.turnsRemaining, monster)
    for b in hero.activeBuffs:
        if b.multiplier > 1.0:
            buff_score -= _buff_impact(b.stat, b.multiplier, b.turnsRemaining, hero)
        elif b.multiplier < 1.0:
            buff_score += _buff_impact(b.stat, b.multiplier, b.turnsRemaining, hero)

    return hp_score + buff_score * 2.0


def _minimax(
    monster: CharacterState,
    hero: CharacterState,
    depth: int,
    is_monster_turn: bool,
    alpha: float,
    beta: float,
    monster_moves: list[str],
    hero_moves: list[str],
) -> float:
    """
    Expectiminimax from the monster's perspective.
    Monster turn = maximiser with alpha-beta pruning.
    Hero turn = expectation (uniform average over all hero moves) — models a
    non-perfect opponent so the monster isn't discouraged from using buffs.
    depth counts full turns; buffs tick after each full turn.
    """
    if monster.hp <= 0:
        return -1000.0
    if hero.hp <= 0:
        return 1000.0
    if depth == 0:
        return _evaluate(monster, hero)

    if is_monster_turn:
        # Maximiser — alpha-beta still valid on max nodes
        best = -float("inf")
        for move_id in monster_moves:
            m2, h2 = _apply_move_sim(move_id, monster, hero)
            score = _minimax(m2, h2, depth, False, alpha, beta, monster_moves, hero_moves)
            best = max(best, score)
            alpha = max(alpha, score)
            if beta <= alpha:
                break
        return best
    else:
        # Expectation node — average over all hero moves, no pruning
        total = 0.0
        for move_id in hero_moves:
            h2, m2 = _apply_move_sim(move_id, hero, monster)
            # Buffs tick at the end of each full turn (after both sides have acted)
            m3 = _tick_buffs_sim(m2)
            h3 = _tick_buffs_sim(h2)
            total += _minimax(m3, h3, depth - 1, True, alpha, beta, monster_moves, hero_moves)
        return total / len(hero_moves)


# ── Move selection ────────────────────────────────────────────────────────────

_MINIMAX_DEPTH = 3  # expectation nodes can't be pruned; depth 3 keeps tree at ~4^5 = 1024 leaves

_HISTORY_SIZE = 3  # number of past moves tracked for penalty decay


def _repeat_penalty(move_id: str, history: list[str]) -> float:
    """
    Returns a weight multiplier based on how recently the move was played.
    history[0] = last turn, history[1] = 2 turns ago, history[2] = 3 turns ago.
    Penalty decays linearly back to 1.0 as the move recedes into history.
    """
    if move_id not in history:
        return 1.0
    position = history.index(move_id)
    base = MOVES[move_id].get("repeatPenalty", 0.4)
    return base + (1.0 - base) * (position / _HISTORY_SIZE)


def _pick_move_heuristic(req: MonsterMoveRequest) -> str:
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


_ENDGAME_HP_PCT = 0.45  # below this, monster ignores utility and goes for maximum damage


def _pick_move(req: MonsterMoveRequest) -> str:
    # 1. Immediate kill: take it without further analysis
    for move_id in req.monsterMoves:
        m2, h2 = _apply_move_sim(move_id, req.monsterState, req.heroState)
        if h2.hp <= 0:
            return move_id

    # 2. Endgame: hero below 45% HP — minimax scores tie at 1000 across all moves, so
    #    skip variety logic and pick the move with the highest base damage value.
    if req.heroState.hp / req.heroState.maxHp < _ENDGAME_HP_PCT:
        return max(req.monsterMoves, key=lambda m: MOVES[m].get("baseValue", 0))

    if not req.heroMoves:
        return _pick_move_heuristic(req)

    # 3. Normal fight: score every move with expectiminimax
    raw_scores: dict[str, float] = {}
    for move_id in req.monsterMoves:
        m2, h2 = _apply_move_sim(move_id, req.monsterState, req.heroState)
        raw_scores[move_id] = _minimax(
            m2, h2, _MINIMAX_DEPTH, False,
            -float("inf"), float("inf"),
            req.monsterMoves, req.heroMoves,
        )

    # sqrt-compress shifted scores so utility moves aren't crowded out by heavy damage moves
    min_score = min(raw_scores.values())
    weights: dict[str, float] = {
        move_id: math.sqrt(score - min_score + 1.0) * _repeat_penalty(move_id, req.lastMonsterMoves)
        for move_id, score in raw_scores.items()
    }

    total = sum(weights.values())
    roll = random.random() * total
    cumul = 0.0
    for move_id, weight in weights.items():
        cumul += weight
        if roll <= cumul:
            return move_id

    return req.monsterMoves[-1]


@router.post("/battle/monster-move", response_model=MonsterMoveResponse)
def get_monster_move(req: MonsterMoveRequest):
    """Called each turn after the player acts. Returns the monster's chosen move."""
    move_id = _pick_move(req)
    return MonsterMoveResponse(moveId=move_id, moveName=MOVES[move_id]["name"])
