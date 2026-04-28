import copy
import math
import random
from fastapi import APIRouter
from app.models import ActiveBuff, ActiveDot, CharacterState, MonsterMoveRequest, MonsterMoveResponse
from app.game_config import MOVES

router = APIRouter()


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
                existing.turnsRemaining = max(existing.turnsRemaining, fx["turns"] + 1)
            else:
                tgt.activeBuffs.append(
                    ActiveBuff(stat=fx["stat"], multiplier=fx["multiplier"], turnsRemaining=fx["turns"] + 1)
                )
        elif ftype == "hp_cost":
            atk.hp = max(1, atk.hp - fx["value"])
        elif ftype == "dot":
            # turns stored directly (NOT turns + 1 like buffs); see combat.ts
            # for the rationale on the asymmetry with buff storage.
            tgt = atk if fx.get("target") == "self" else dfn
            tgt.activeDots.append(
                ActiveDot(damagePerTurn=fx["value"], turnsRemaining=fx["turns"])
            )

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


def _tick_dots_sim(state: CharacterState) -> CharacterState:
    """Non-mutating: deep-copies, applies one DOT tick of damage, decrements
    durations, and drops expired DOTs. Mirrors tickDots() on the frontend."""
    s = copy.deepcopy(state)
    if not s.activeDots:
        return s
    total = sum(d.damagePerTurn for d in s.activeDots)
    s.hp = max(0, s.hp - total)
    s.activeDots = [
        ActiveDot(damagePerTurn=d.damagePerTurn, turnsRemaining=d.turnsRemaining - 1)
        for d in s.activeDots
        if d.turnsRemaining - 1 > 0
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


def _dot_threat(state: CharacterState) -> float:
    """Total guaranteed-future damage from active DOTs. Used by _evaluate so
    the AI treats an applied DOT as nearly-equivalent to dealing that damage
    upfront (DOTs can't be cleansed in this game)."""
    return float(sum(d.damagePerTurn * d.turnsRemaining for d in state.activeDots))


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

    # DOT pending on the hero is good for the monster; on the monster, bad.
    # Scale into the same units as direct HP swing — pending damage is real
    # but slightly devalued vs. immediate HP because we might end the fight
    # before all ticks land.
    dot_score = (_dot_threat(hero) - _dot_threat(monster)) * 0.6

    return hp_score + buff_score * 3.0 + dot_score


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
            # End of full turn: tick buffs, then DOTs (mirror the live BattleScene
            # ordering so AI predictions match what actually happens).
            m3 = _tick_buffs_sim(m2)
            h3 = _tick_buffs_sim(h2)
            m4 = _tick_dots_sim(m3)
            h4 = _tick_dots_sim(h3)
            total += _minimax(m4, h4, depth - 1, True, alpha, beta, monster_moves, hero_moves)
        return total / len(hero_moves)


# ── Move selection ────────────────────────────────────────────────────────────

_MINIMAX_DEPTH = 3  # expectation nodes can't be pruned; depth 3 keeps tree at ~4^5 = 1024 leaves

_HISTORY_SIZE = 3  # number of past moves tracked for penalty decay


def _repeat_penalty(move_id: str, history: list[str]) -> float:
    if move_id not in history:
        return 1.0
    position = history.index(move_id)
    base = MOVES[move_id].get("repeatPenalty", 0.4)
    return base + (1.0 - base) * (position / _HISTORY_SIZE)


def _pick_move(req: MonsterMoveRequest) -> str:
    raw_scores: dict[str, float] = {}
    for move_id in req.monsterMoves:
        m2, h2 = _apply_move_sim(move_id, req.monsterState, req.heroState)
        if h2.hp <= 0:
            return move_id  # immediate kill — no need to search
        if req.heroMoves:
            raw_scores[move_id] = _minimax(
                m2, h2, _MINIMAX_DEPTH, False,
                -float("inf"), float("inf"),
                req.monsterMoves, req.heroMoves,
            )
        else:
            raw_scores[move_id] = _evaluate(m2, h2)

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
