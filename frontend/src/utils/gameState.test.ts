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
    levelUpStats: { maxHp: 20, attack: 3, defense: 2, magic: 2 },
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

  it("awards 3 skill points on level up", () => {
    GameState.addXp(100);
    expect(GameState.hero.skillPoints).toBe(3);
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
    expect(GameState.hero.attack).toBe(15 + 3);
    expect(GameState.hero.skillPoints).toBe(2);
  });

  it("increases defense by levelUpStats gain", () => {
    GameState.spendSkillPoint("defense");
    expect(GameState.hero.defense).toBe(10 + 2);
  });

  it("increases magic by levelUpStats gain", () => {
    GameState.spendSkillPoint("magic");
    expect(GameState.hero.magic).toBe(8 + 2);
  });

  it("increases maxHp and current HP together", () => {
    const hpBefore = GameState.hero.currentHp!;
    GameState.spendSkillPoint("maxHp");
    expect(GameState.hero.maxHp).toBe(100 + 20);
    expect(GameState.hero.currentHp).toBe(hpBefore + 20);
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
