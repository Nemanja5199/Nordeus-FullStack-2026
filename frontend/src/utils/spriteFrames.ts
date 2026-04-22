// monsters.png: 12 cols per row, 32x32 per frame
// rogues.png:    7 cols per row, 32x32 per frame

function monsterFrame(row: number, col: number) {
  return row * 12 + col;
}

function rogueFrame(row: number, col: number) {
  return row * 7 + col;
}

export const HERO_FRAME = {
  key: "rogues",
  frame: rogueFrame(1, 0), // 2.a Knight
};

export const SHOPKEEPER_FRAME = {
  key: "rogues",
  frame: rogueFrame(6, 0), // 8.a peasant / coalburner
};

export const MONSTER_FRAMES: Record<string, { key: string; frame: number }> = {
  goblin_warrior: { key: "monsters", frame: monsterFrame(0, 2) },
  goblin_mage: { key: "monsters", frame: monsterFrame(0, 6) },
  giant_spider: { key: "monsters", frame: monsterFrame(6, 8) },
  witch: { key: "monsters", frame: monsterFrame(5, 4) },
  dragon: { key: "monsters", frame: monsterFrame(8, 2) },
};
