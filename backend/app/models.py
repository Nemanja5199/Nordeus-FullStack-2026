from pydantic import BaseModel
from typing import Any


class ActiveBuff(BaseModel):
    stat: str
    multiplier: float
    turnsRemaining: int


class CharacterState(BaseModel):
    hp: int
    maxHp: int
    attack: int
    defense: int
    magic: int
    activeBuffs: list[ActiveBuff] = []


class MonsterMoveRequest(BaseModel):
    monsterId: str
    monsterMoves: list[str]
    monsterState: CharacterState
    heroState: CharacterState
    turnNumber: int
    heroMoves: list[str] = []
    lastMonsterMoves: list[str] = []  # last 3 moves played, most recent first


class MonsterMoveResponse(BaseModel):
    moveId: str
    moveName: str


class SaveStateRequest(BaseModel):
    sessionId: str
    hero: dict[str, Any]
    run: dict[str, Any] | None = None


class SaveStateResponse(BaseModel):
    ok: bool


class LoadGameResponse(BaseModel):
    hero: dict[str, Any] | None
    run: dict[str, Any] | None


class GameMetaResponse(BaseModel):
    """Static config — same on every request. Cache on the client."""
    monsters: list[dict[str, Any]]
    moves: dict[str, dict[str, Any]]
    items: dict[str, dict[str, Any]]
    heroDefaults: dict[str, Any]


class RunStartResponse(BaseModel):
    """Run-specific data — generated per call, depends on seed."""
    mapTree: dict[str, Any]
    seed: int
