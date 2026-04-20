import random
from fastapi import APIRouter
from app.models import MonsterMoveRequest, MonsterMoveResponse
from app.game_config import MOVES

router = APIRouter()


def _effective(base: int, buffs: list, stat: str) -> int:
    multiplier = 1.0
    for b in buffs:
        if b.stat == stat:
            multiplier *= b.multiplier
    return max(1, int(base * multiplier))


def _pick_move(req: MonsterMoveRequest) -> str:
    moves = req.monsterMoves
    hp_pct = req.monsterState.hp / req.monsterState.maxHp

    heal_moves = [
        m for m in moves
        if any(e["type"] in ("heal", "drain") for e in MOVES[m]["effects"])
    ]
    buff_moves = [
        m for m in moves
        if any(e["type"] == "buff" and e["target"] == "self" for e in MOVES[m]["effects"])
    ]
    debuff_moves = [
        m for m in moves
        if any(e["type"] == "debuff" and e["target"] == "opponent" for e in MOVES[m]["effects"])
    ]
    damage_moves = [m for m in moves if MOVES[m]["baseValue"] > 0]

    # Prioritise healing when below 30 % HP
    if hp_pct < 0.30 and heal_moves:
        return random.choice(heal_moves)

    # Occasionally debuff the hero
    if debuff_moves and random.random() < 0.20:
        return random.choice(debuff_moves)

    # Occasionally buff self (more likely early in the fight)
    if buff_moves and hp_pct > 0.60 and random.random() < 0.25:
        return random.choice(buff_moves)

    # Weighted towards higher-damage moves
    if damage_moves:
        weights = [MOVES[m]["baseValue"] + 1 for m in damage_moves]
        return random.choices(damage_moves, weights=weights, k=1)[0]

    return random.choice(moves)


@router.post("/battle/monster-move", response_model=MonsterMoveResponse)
def get_monster_move(req: MonsterMoveRequest):
    """Called each turn after the player acts. Returns the monster's chosen move."""
    move_id = _pick_move(req)
    return MonsterMoveResponse(moveId=move_id, moveName=MOVES[move_id]["name"])
