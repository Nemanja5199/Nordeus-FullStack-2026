export type GearSlot = "weapon" | "helmet" | "chestplate" | "gloves" | "ring";
export type GearRarity = "common" | "rare" | "epic";

export interface GearStatBonuses {
  attack?: number;
  defense?: number;
  magic?: number;
  maxHp?: number;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: GearRarity;
  statBonuses: GearStatBonuses;
  description: string;
}

export interface Stats {
  attack: number;
  defense: number;
  magic: number;
}

export interface ActiveBuff {
  stat: "attack" | "defense" | "magic";
  multiplier: number;
  turnsRemaining: number;
}

export interface MoveEffect {
  type: "buff" | "debuff" | "heal" | "drain" | "hp_cost";
  target?: "self" | "opponent";
  stat?: "attack" | "defense" | "magic";
  multiplier?: number;
  turns?: number;
  value?: number;
}

export interface MoveConfig {
  id: string;
  name: string;
  moveType: "physical" | "magic" | "heal" | "none";
  baseValue: number;
  effects: MoveEffect[];
  description: string;
  dropChance: number;
}

export interface MonsterConfig {
  id: string;
  name: string;
  stats: { hp: number; attack: number; defense: number; magic: number };
  moves: string[];
  xpReward: number;
  goldReward: number;
  itemDropChance: number;
  itemDropPool: { itemId: string; weight: number }[];
}

export interface HeroDefaults {
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  defaultMoves: string[];
  levelUpStats: { maxHp: number; attack: number; defense: number; magic: number };
  xpPerLevel: number;
}

export interface RunConfig {
  monsters: MonsterConfig[];
  moves: Record<string, MoveConfig>;
  items: Record<string, GearItem>;
  heroDefaults: HeroDefaults;
  mapTree: import("../utils/mockMapTree").MapTree;
  seed: number;
}

export interface HeroState {
  level: number;
  xp: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  skillPoints: number;
  gold: number;
  equipment: Partial<Record<GearSlot, string>>;
  inventory: string[];
  learnedMoves: string[];
  equippedMoves: string[];
}

export interface CombatCharacter {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  baseStats: Stats;
  activeBuffs: ActiveBuff[];
  moves: string[];
}

export interface MoveResult {
  damage: number;
  heal: number;
  hpCost: number;
  logMessage: string;
}

export interface RunSave {
  currentMonsterIndex: number;
  defeatedMonsterIds: string[];
  runConfig: RunConfig;
}
