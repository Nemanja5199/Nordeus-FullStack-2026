import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameState } from "./gameState";
import { MetaProgress } from "./metaProgress";
import type { RunConfig } from "../types/game";

// ── Minimal RunConfig stub ────────────────────────────────────────────────────

const MOCK_CONFIG: RunConfig = {
  monsters: [],
  moves: {},
  items: {},
  seed: 1,
  mapTree: { nodes: {}, roots: [] },
  heroDefaults: {
    maxHp: 100,
    attack: 15,
    defense: 10,
    magic: 8,
    defaultMoves: ["slash", "shield_up", "battle_cry", "second_wind"],
    levelUpStats: { maxHp: 8, attack: 2, defense: 2, magic: 3 },
    xpPerLevel: 100,
  },
};

// ── Setup: reset state and mock localStorage before each test ─────────────────

function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
  MetaProgress.resetAll();
  GameState.runConfig = MOCK_CONFIG;
  GameState.resetHero(MOCK_CONFIG);
  GameState.clearRun();
});

// ── addXp ─────────────────────────────────────────────────────────────────────

describe("GameState.addXp", () => {
  it("accumulates XP without leveling up", () => {
    const leveled = GameState.addXp(50);
    expect(GameState.hero.xp).toBe(50);
    expect(GameState.hero.level).toBe(1);
    expect(leveled).toBe(false);
  });

  it("levels up when XP reaches threshold", () => {
    const leveled = GameState.addXp(100);
    expect(leveled).toBe(true);
    expect(GameState.hero.level).toBe(2);
    expect(GameState.hero.xp).toBe(0);
  });

  it("awards 1 skill point on level up", () => {
    GameState.addXp(100);
    expect(GameState.hero.skillPoints).toBe(1);
  });

  it("level up threshold scales with level", () => {
    // Level 1 needs 100 XP, level 2 needs 200 XP
    GameState.addXp(100); // reaches level 2
    expect(GameState.hero.level).toBe(2);
    const leveled = GameState.addXp(100); // 100 < 200, no level up
    expect(leveled).toBe(false);
    expect(GameState.hero.level).toBe(2);
  });
});

// ── spendSkillPoint ───────────────────────────────────────────────────────────

describe("GameState.spendSkillPoint", () => {
  beforeEach(() => {
    GameState.hero.skillPoints = 3;
  });

  it("returns false and does nothing with no skill points", () => {
    GameState.hero.skillPoints = 0;
    const result = GameState.spendSkillPoint("attack");
    expect(result).toBe(false);
    expect(GameState.hero.attack).toBe(15);
  });

  it("increases attack by levelUpStats gain", () => {
    GameState.spendSkillPoint("attack");
    expect(GameState.hero.attack).toBe(15 + 2);
    expect(GameState.hero.skillPoints).toBe(2);
  });

  it("increases defense by levelUpStats gain", () => {
    GameState.spendSkillPoint("defense");
    expect(GameState.hero.defense).toBe(10 + 2);
  });

  it("increases magic by levelUpStats gain", () => {
    GameState.spendSkillPoint("magic");
    expect(GameState.hero.magic).toBe(8 + 3);
  });

  it("increases maxHp and current HP together", () => {
    const hpBefore = GameState.hero.currentHp!;
    GameState.spendSkillPoint("maxHp");
    expect(GameState.hero.maxHp).toBe(100 + 8);
    expect(GameState.hero.currentHp).toBe(hpBefore + 8);
  });

  it("currentHp does not exceed new maxHp after HP spend", () => {
    GameState.hero.currentHp = 100;
    GameState.hero.maxHp = 100;
    GameState.spendSkillPoint("maxHp");
    expect(GameState.hero.currentHp).toBeLessThanOrEqual(GameState.hero.maxHp);
  });

  it("decrements skill points on each spend", () => {
    GameState.spendSkillPoint("attack");
    GameState.spendSkillPoint("defense");
    expect(GameState.hero.skillPoints).toBe(1);
  });
});

// ── learnMove / equipMove ─────────────────────────────────────────────────────

describe("GameState.learnMove", () => {
  it("adds a new move to learnedMoves", () => {
    GameState.learnMove("fireball");
    expect(GameState.hero.learnedMoves).toContain("fireball");
  });

  it("does not duplicate an already learned move", () => {
    GameState.learnMove("slash");
    const count = GameState.hero.learnedMoves.filter((m) => m === "slash").length;
    expect(count).toBe(1);
  });
});

describe("GameState.equipMove", () => {
  beforeEach(() => {
    GameState.learnMove("fireball");
  });

  it("equips a learned move into a valid slot", () => {
    GameState.equipMove(0, "fireball");
    expect(GameState.hero.equippedMoves[0]).toBe("fireball");
  });

  it("does not equip a move that has not been learned", () => {
    GameState.equipMove(0, "unknown_move");
    expect(GameState.hero.equippedMoves[0]).not.toBe("unknown_move");
  });

  it("ignores out-of-range slots", () => {
    const before = [...GameState.hero.equippedMoves];
    GameState.equipMove(5, "fireball");
    expect(GameState.hero.equippedMoves).toEqual(before);
  });
});

// ── completeNode ──────────────────────────────────────────────────────────────

describe("GameState.completeNode", () => {
  it("adds a node to completedNodes", () => {
    GameState.completeNode("n1a");
    expect(GameState.completedNodes).toContain("n1a");
  });

  it("does not duplicate node IDs", () => {
    GameState.completeNode("n1a");
    GameState.completeNode("n1a");
    const count = GameState.completedNodes.filter((n) => n === "n1a").length;
    expect(count).toBe(1);
  });

  it("sets currentNode to the completed node", () => {
    GameState.completeNode("n2b");
    expect(GameState.currentNode).toBe("n2b");
  });

  it("tracks multiple completed nodes in order", () => {
    GameState.completeNode("n1a");
    GameState.completeNode("n2b");
    GameState.completeNode("n3a");
    expect(GameState.completedNodes).toEqual(["n1a", "n2b", "n3a"]);
  });
});

// ── resetRunProgress ──────────────────────────────────────────────────────────

describe("GameState.resetRunProgress", () => {
  beforeEach(() => {
    GameState.runSeed = 42;
    GameState.completeNode("n1a");
    GameState.completeNode("n2b");
    GameState.currentNode = "n2b";
  });

  it("clears completedNodes", () => {
    GameState.resetRunProgress();
    expect(GameState.completedNodes).toEqual([]);
  });

  it("clears currentNode", () => {
    GameState.resetRunProgress();
    expect(GameState.currentNode).toBeNull();
  });

  it("preserves runSeed", () => {
    GameState.resetRunProgress();
    expect(GameState.runSeed).toBe(42);
  });

  it("saves fresh tree state to localStorage", () => {
    GameState.resetRunProgress();
    const raw = localStorage.getItem("rpg_tree_state");
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.completedNodes).toEqual([]);
    expect(saved.currentNode).toBeNull();
    expect(saved.runSeed).toBe(42);
  });

  it("does not remove runConfig", () => {
    GameState.resetRunProgress();
    expect(GameState.runConfig).toBe(MOCK_CONFIG);
  });
});

// ── defaultHero meta bonuses ──────────────────────────────────────────────────

describe("GameState.resetHero with MetaProgress bonuses", () => {
  it("applies maxHp bonus to starting hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("vitality_1"); // +15 HP
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.maxHp).toBe(100 + 15);
    expect(GameState.hero.currentHp).toBe(100 + 15);
  });

  it("applies attack bonus to starting hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("strength_1"); // +2 ATK
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.attack).toBe(15 + 2);
  });

  it("applies defense bonus to starting hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("guard_1"); // +2 DEF
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.defense).toBe(10 + 2);
  });

  it("applies skillPoints bonus to starting hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("scholar"); // +1 skill point
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.skillPoints).toBe(1);
  });

  it("applies gold bonus to starting hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("hoarder"); // +25 gold
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.gold).toBe(25);
  });

  it("stacks multiple bonuses", () => {
    MetaProgress.shards = 500;
    MetaProgress.buy("vitality_1"); // +15 HP
    MetaProgress.buy("strength_1"); // +2 ATK
    MetaProgress.buy("guard_1");    // +2 DEF
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.maxHp).toBe(100 + 15);
    expect(GameState.hero.attack).toBe(15 + 2);
    expect(GameState.hero.defense).toBe(10 + 2);
  });

  it("no bonuses when nothing purchased", () => {
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.maxHp).toBe(100);
    expect(GameState.hero.attack).toBe(15);
    expect(GameState.hero.defense).toBe(10);
    expect(GameState.hero.magic).toBe(8);
    expect(GameState.hero.skillPoints).toBe(0);
    expect(GameState.hero.gold).toBe(0);
  });
});

// ── potions ───────────────────────────────────────────────────────────────────

describe("GameState potions", () => {
  it("starts with zero of each potion type", () => {
    expect(GameState.hero.hpPotions).toBe(0);
    expect(GameState.hero.manaPotions).toBe(0);
  });

  it("addHpPotion increments and accumulates", () => {
    GameState.addHpPotion(3);
    expect(GameState.hero.hpPotions).toBe(3);
    GameState.addHpPotion(2);
    expect(GameState.hero.hpPotions).toBe(5);
  });

  it("addManaPotion increments and accumulates", () => {
    GameState.addManaPotion(1);
    GameState.addManaPotion(4);
    expect(GameState.hero.manaPotions).toBe(5);
  });

  it("useHpPotion decrements and returns true when count > 0", () => {
    GameState.addHpPotion(2);
    expect(GameState.useHpPotion()).toBe(true);
    expect(GameState.hero.hpPotions).toBe(1);
  });

  it("useHpPotion returns false and is a no-op when count is 0", () => {
    expect(GameState.hero.hpPotions).toBe(0);
    expect(GameState.useHpPotion()).toBe(false);
    expect(GameState.hero.hpPotions).toBe(0);
  });

  it("useManaPotion mirrors useHpPotion behaviour", () => {
    GameState.addManaPotion(1);
    expect(GameState.useManaPotion()).toBe(true);
    expect(GameState.hero.manaPotions).toBe(0);
    expect(GameState.useManaPotion()).toBe(false);
    expect(GameState.hero.manaPotions).toBe(0);
  });

  it("resetHero clears potion stash (lost on death)", () => {
    GameState.addHpPotion(5);
    GameState.addManaPotion(3);
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.hpPotions).toBe(0);
    expect(GameState.hero.manaPotions).toBe(0);
  });

  it("addHpPotion persists to localStorage", () => {
    GameState.addHpPotion(2);
    const raw = localStorage.getItem("rpg_hero");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).hpPotions).toBe(2);
  });
});

// ── shop ──────────────────────────────────────────────────────────────────────

describe("GameState shop", () => {
  const SHOP_CONFIG: RunConfig = {
    ...MOCK_CONFIG,
    items: {
      iron_sword: {
        id: "iron_sword", name: "Iron Sword", slot: "weapon", rarity: "common",
        tier: 1, cost: 30,
        statBonuses: { attack: 4 }, description: "",
      },
      steel_blade: {
        id: "steel_blade", name: "Steel Blade", slot: "weapon", rarity: "rare",
        tier: 2, cost: 100,
        statBonuses: { attack: 8 }, description: "",
      },
      legendary_blade: {
        id: "legendary_blade", name: "Legendary", slot: "weapon", rarity: "epic",
        tier: 3, cost: 250,
        statBonuses: { attack: 16 }, description: "",
      },
    },
  };

  beforeEach(() => {
    GameState.runConfig = SHOP_CONFIG;
    GameState.resetHero(SHOP_CONFIG);
  });

  it("unlockedTier returns 1 at level 1, 2 at level 3, 3 at level 6", () => {
    GameState.hero.level = 1;
    expect(GameState.unlockedTier()).toBe(1);
    GameState.hero.level = 2;
    expect(GameState.unlockedTier()).toBe(1);
    GameState.hero.level = 3;
    expect(GameState.unlockedTier()).toBe(2);
    GameState.hero.level = 5;
    expect(GameState.unlockedTier()).toBe(2);
    GameState.hero.level = 6;
    expect(GameState.unlockedTier()).toBe(3);
    GameState.hero.level = 10;
    expect(GameState.unlockedTier()).toBe(3);
  });

  it("buyItem deducts cost and adds to inventory", () => {
    GameState.hero.gold = 100;
    expect(GameState.buyItem("iron_sword")).toBe(true);
    expect(GameState.hero.gold).toBe(70);
    expect(GameState.hero.inventory).toContain("iron_sword");
  });

  it("buyItem returns false and is a no-op when gold insufficient", () => {
    GameState.hero.gold = 10;
    expect(GameState.buyItem("iron_sword")).toBe(false);
    expect(GameState.hero.gold).toBe(10);
    expect(GameState.hero.inventory).not.toContain("iron_sword");
  });

  it("buyItem returns false when item already in inventory", () => {
    GameState.hero.gold = 100;
    GameState.hero.inventory.push("iron_sword");
    expect(GameState.buyItem("iron_sword")).toBe(false);
    expect(GameState.hero.gold).toBe(100);
  });

  it("buyItem returns false when item is currently equipped", () => {
    GameState.hero.gold = 100;
    GameState.hero.equipment = { weapon: "iron_sword" };
    expect(GameState.buyItem("iron_sword")).toBe(false);
    expect(GameState.hero.gold).toBe(100);
  });

  it("buyItem returns false when item tier exceeds unlockedTier", () => {
    GameState.hero.gold = 500;
    GameState.hero.level = 1;
    expect(GameState.buyItem("steel_blade")).toBe(false);
    expect(GameState.buyItem("legendary_blade")).toBe(false);
    expect(GameState.hero.gold).toBe(500);

    GameState.hero.level = 3;
    expect(GameState.buyItem("steel_blade")).toBe(true);
    expect(GameState.buyItem("legendary_blade")).toBe(false);
  });

  it("buyHpPotion deducts 25 gold and increments hpPotions", () => {
    GameState.hero.gold = 50;
    expect(GameState.buyHpPotion()).toBe(true);
    expect(GameState.hero.gold).toBe(25);
    expect(GameState.hero.hpPotions).toBe(1);
  });

  it("buyHpPotion returns false when gold below 25", () => {
    GameState.hero.gold = 24;
    expect(GameState.buyHpPotion()).toBe(false);
    expect(GameState.hero.gold).toBe(24);
    expect(GameState.hero.hpPotions).toBe(0);
  });

  it("buyManaPotion deducts 30 gold and increments manaPotions", () => {
    GameState.hero.gold = 60;
    expect(GameState.buyManaPotion()).toBe(true);
    expect(GameState.hero.gold).toBe(30);
    expect(GameState.hero.manaPotions).toBe(1);
  });

  it("buyManaPotion returns false when gold below 30", () => {
    GameState.hero.gold = 29;
    expect(GameState.buyManaPotion()).toBe(false);
    expect(GameState.hero.gold).toBe(29);
    expect(GameState.hero.manaPotions).toBe(0);
  });
});
