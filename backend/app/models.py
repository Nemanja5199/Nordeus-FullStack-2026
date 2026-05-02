from pydantic import BaseModel, Field
from typing import Annotated, Any, Literal, Union


# ── Combat-state models (used by /battle/monster_move) ──────────────────


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


# ── Save/load models (Supabase persistence) ─────────────────────────────


class SaveStateRequest(BaseModel):
    # All sections optional — PostgREST upsert only updates sent columns.
    # hero/meta/run shapes are governed by the field-maps in routers/save.py
    # (the maps act as the canonical schema + allowlist).
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


# ── Static design-data models (used by /run/meta) ───────────────────────
# These mirror the frontend's TS types in src/types/game.ts. Adding a new
# field here means adding it on the frontend too.


class BuffEffect(BaseModel):
    type: Literal["buff"]
    target: Literal["self", "opponent"]
    stat: Literal["attack", "defense", "magic"]
    multiplier: float
    turns: int


class DebuffEffect(BaseModel):
    type: Literal["debuff"]
    target: Literal["self", "opponent"]
    stat: Literal["attack", "defense", "magic"]
    multiplier: float
    turns: int


class DrainEffect(BaseModel):
    type: Literal["drain"]
    target: Literal["self"]


class DotEffect(BaseModel):
    type: Literal["dot"]
    target: Literal["self", "opponent"]
    value: int  # damage per turn
    turns: int


class HpCostEffect(BaseModel):
    type: Literal["hp_cost"]
    value: int


class MpDrainEffect(BaseModel):
    type: Literal["mp_drain"]
    target: Literal["opponent"]
    value: int


MoveEffect = Annotated[
    Union[BuffEffect, DebuffEffect, DrainEffect, DotEffect, HpCostEffect, MpDrainEffect],
    Field(discriminator="type"),
]


class Move(BaseModel):
    id: str
    name: str
    moveType: Literal["physical", "magic", "heal", "none"]
    baseValue: int
    effects: list[MoveEffect]
    repeatPenalty: float
    dropChance: float
    manaCost: int
    description: str


class MonsterStats(BaseModel):
    hp: int
    attack: int
    defense: int
    magic: int


class Monster(BaseModel):
    id: str
    name: str
    stats: MonsterStats
    moves: list[str]
    dropMoves: list[str] | None = None
    xpReward: int
    goldMin: int
    goldMax: int
    shardMin: int
    shardMax: int


class GearStatBonuses(BaseModel):
    attack: int = 0
    defense: int = 0
    magic: int = 0
    maxHp: int = 0


class GearItem(BaseModel):
    id: str
    name: str
    slot: Literal["weapon", "helmet", "chestplate", "gloves", "ring"]
    rarity: Literal["common", "rare", "epic", "legendary"]
    tier: int
    cost: int
    statBonuses: GearStatBonuses
    description: str


class LevelUpStats(BaseModel):
    maxHp: int
    attack: int
    defense: int
    magic: int


class HeroDefaults(BaseModel):
    maxHp: int
    attack: int
    defense: int
    magic: int
    defaultMoves: list[str]
    levelUpStats: LevelUpStats
    xpPerLevel: int


class MetaUpgrade(BaseModel):
    id: str
    name: str
    category: Literal["maxHp", "attack", "defense", "magic", "skillPoints", "gold"]
    cost: int
    bonus: int
    requires: str | None = None
    description: str


class GameMetaResponse(BaseModel):
    """Static config — same on every request. Cached on the client."""
    monsters: list[Monster]
    moves: dict[str, Move]
    items: dict[str, GearItem]
    heroClasses: dict[str, HeroDefaults]
    upgrades: list[MetaUpgrade]


class RunStartResponse(BaseModel):
    """Run-specific data — generated per call, depends on seed."""
    mapTree: dict[str, Any]
    seed: int
