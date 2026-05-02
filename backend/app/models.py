from pydantic import BaseModel
from typing import Any


class ActiveBuff(BaseModel):
    stat: str
    multiplier: float
    turnsRemaining: int


class ActiveDot(BaseModel):
    damagePerTurn: int
    turnsRemaining: int


class CharacterState(BaseModel):
    hp: int
    maxHp: int
    attack: int
    defense: int
    magic: int
    activeBuffs: list[ActiveBuff] = []
    activeDots: list[ActiveDot] = []


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
    # All sections optional — PostgREST upsert only updates sent columns.
    sessionId: str
    hero: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None
    run: dict[str, Any] | None = None


class SaveStateResponse(BaseModel):
    ok: bool


class LoadGameResponse(BaseModel):
    hero: dict[str, Any] | None = None
    meta: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None
    run: dict[str, Any] | None = None


class GameMetaResponse(BaseModel):
    """Static config — same on every request. Cached on the client."""
    monsters: list[dict[str, Any]]
    moves: dict[str, dict[str, Any]]
    items: dict[str, dict[str, Any]]
    heroDefaults: dict[str, Any]  # Knight defaults; kept for back-compat
    heroClasses: dict[str, dict[str, Any]]


class RunStartResponse(BaseModel):
    """Run-specific data — generated per call, depends on seed."""
    mapTree: dict[str, Any]
    seed: int
