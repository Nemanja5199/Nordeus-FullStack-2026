export type MetaUpgradeCategory = "maxHp" | "attack" | "defense" | "magic" | "skillPoints" | "gold";

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  bonus: number;
  category: MetaUpgradeCategory;
  requires?: string;
}

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
  tier: 1 | 2 | 3;
  cost: number;
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

export interface ActiveDot {
  damagePerTurn: number;
  turnsRemaining: number;
}

export interface MoveEffect {
  type: "buff" | "debuff" | "heal" | "drain" | "hp_cost" | "dot" | "mp_drain";
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
  manaCost: number;
}

export interface MonsterConfig {
  id: string;
  name: string;
  stats: { hp: number; attack: number; defense: number; magic: number };
  moves: string[];
  dropMoves?: string[];
  xpReward: number;
  goldMin: number;
  goldMax: number;
  shardMin: number;
  shardMax: number;
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

// New classes go here AND in HERO_CLASSES on the backend.
export type HeroClass = "knight" | "mage";

export interface RunConfig {
  monsters: MonsterConfig[];
  moves: Record<string, MoveConfig>;
  items: Record<string, GearItem>;
  heroDefaults: HeroDefaults; // back-compat; mirrors heroClasses.knight
  heroClasses: Record<HeroClass, HeroDefaults>;
  upgrades: MetaUpgrade[];
  mapTree: import("../map/mapTree").MapTree;
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
  hpPotions: number;
  manaPotions: number;
}

export interface CombatCharacter {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  baseStats: Stats;
  activeBuffs: ActiveBuff[];
  activeDots: ActiveDot[];
  moves: string[];
}

export interface MoveResult {
  damage: number;
  heal: number;
  hpCost: number;
  // Mana burned off the defender. Lives here because mana is owned by
  // BattleScene, not by CombatCharacter.
  mpDrain?: number;
  logMessage: string;
}

export interface RunSave {
  currentMonsterIndex: number;
  defeatedMonsterIds: string[];
  runConfig: RunConfig;
}
