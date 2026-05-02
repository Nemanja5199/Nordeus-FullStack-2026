import type { HeroClass } from "../types/game";

// monsters.png: 12 cols per row. rogues.png: 7 cols per row. 32x32 frames.

function monsterFrame(row: number, col: number) { return row * 12 + col; }
function rogueFrame(row: number, col: number)   { return row * 7 + col; }

export const HERO_FRAMES: Record<HeroClass, { key: string; frame: number }> = {
  knight: { key: "rogues", frame: rogueFrame(1, 0) }, // 2.a Knight
  mage:   { key: "rogues", frame: rogueFrame(4, 0) }, // 5.a female wizard
};

export const HERO_NAMES: Record<HeroClass, string> = {
  knight: "Knight",
  mage:   "Mage",
};

export function heroFrameFor(cls: HeroClass): { key: string; frame: number } {
  return HERO_FRAMES[cls] ?? HERO_FRAMES.knight;
}

export function heroNameFor(cls: HeroClass): string {
  return HERO_NAMES[cls] ?? HERO_NAMES.knight;
}

export const SHOPKEEPER_FRAME = { key: "rogues", frame: rogueFrame(6, 0) }; // 8.a

export const MONSTER_FRAMES: Record<string, { key: string; frame: number }> = {
  goblin_warrior: { key: "monsters", frame: monsterFrame(0, 2) },
  goblin_mage:    { key: "monsters", frame: monsterFrame(0, 6) },
  skeleton:       { key: "monsters", frame: monsterFrame(4, 0) },
  lich:           { key: "monsters", frame: monsterFrame(4, 2) },
  death_knight:   { key: "monsters", frame: monsterFrame(4, 3) },
  big_slime:      { key: "monsters", frame: monsterFrame(2, 2) },
  giant_spider:   { key: "monsters", frame: monsterFrame(6, 8) },
  witch:          { key: "monsters", frame: monsterFrame(5, 4) },
  dragon:         { key: "monsters", frame: monsterFrame(8, 2) },
};
