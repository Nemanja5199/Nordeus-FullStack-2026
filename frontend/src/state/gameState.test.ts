import { describe, it, expect, beforeEach, vi } from "vitest";
import { GameState, getGearBonuses } from "./gameState";
import { MetaProgress } from "./metaProgress";
import { Cloud } from "./cloudSync";
import type { GearItem, RunConfig } from "../types/game";

// ── Minimal RunConfig stub ────────────────────────────────────────────────────

const KNIGHT_DEFAULTS = {
  maxHp: 100,
  attack: 15,
  defense: 10,
  magic: 8,
  defaultMoves: ["slash", "shield_up", "battle_cry", "second_wind"],
  levelUpStats: { maxHp: 8, attack: 2, defense: 2, magic: 3 },
  xpPerLevel: 100,
};
const MAGE_DEFAULTS = {
  maxHp: 80,
  attack: 8,
  defense: 6,
  magic: 25,
  defaultMoves: ["arc_lash", "mana_ward", "focus", "mend"],
  levelUpStats: { maxHp: 6, attack: 1, defense: 1, magic: 4 },
  xpPerLevel: 100,
};

// Trimmed fixture — covers categories the tests exercise.
const MOCK_UPGRADES = [
  { id: "vitality_1", name: "Vitality I",   category: "maxHp",   cost: 15, bonus: 15, description: "" },
  { id: "vitality_2", name: "Vitality II",  category: "maxHp",   cost: 30, bonus: 30, requires: "vitality_1", description: "" },
  { id: "strength_1", name: "Strength I",   category: "attack",  cost: 15, bonus: 2,  description: "" },
  { id: "guard_1",    name: "Guard I",      category: "defense", cost: 15, bonus: 2,  description: "" },
  { id: "scholar",    name: "Scholar",      category: "skillPoints", cost: 100, bonus: 1, description: "" },
  { id: "hoarder",    name: "Hoarder",      category: "gold",    cost: 40, bonus: 25, description: "" },
] as const;

const MOCK_CONFIG: RunConfig = {
  monsters: [],
  moves: {},
  items: {},
  seed: 1,
  mapTree: { nodes: {}, roots: [] },
  heroClasses: { knight: KNIGHT_DEFAULTS, mage: MAGE_DEFAULTS },
  upgrades: MOCK_UPGRADES as unknown as RunConfig["upgrades"],
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
  // Curve is level² × 60: lv1→60, lv2→240, lv3→540, lv4→960
  it("accumulates XP without leveling up", () => {
    const leveled = GameState.addXp(50);
    expect(GameState.hero.xp).toBe(50);
    expect(GameState.hero.level).toBe(1);
    expect(leveled).toBe(false);
  });

  it("levels up when XP reaches threshold and preserves overflow", () => {
    const leveled = GameState.addXp(100); // 60 needed, 40 overflow
    expect(leveled).toBe(true);
    expect(GameState.hero.level).toBe(2);
    expect(GameState.hero.xp).toBe(40);
  });

  it("awards 1 skill point per level gained", () => {
    GameState.addXp(100);
    expect(GameState.hero.skillPoints).toBe(1);
  });

  it("processes multiple level-ups in a single call", () => {
    // 60 (lv1→2) + 240 (lv2→3) = 300; pass 350 → expect lv3, 50 overflow, 2 SP
    const leveled = GameState.addXp(350);
    expect(leveled).toBe(true);
    expect(GameState.hero.level).toBe(3);
    expect(GameState.hero.xp).toBe(50);
    expect(GameState.hero.skillPoints).toBe(2);
  });

  it("level up threshold scales with level", () => {
    GameState.addXp(60); // reaches level 2 exactly
    expect(GameState.hero.level).toBe(2);
    expect(GameState.hero.xp).toBe(0);
    const leveled = GameState.addXp(100); // 100 < 240, no level up
    expect(leveled).toBe(false);
    expect(GameState.hero.level).toBe(2);
    expect(GameState.hero.xp).toBe(100);
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

  it("replay does not regress currentNode frontier", () => {
    // Advance to n2b, then replay n1a — frontier must remain at n2b
    // (the bug was: replay overwrote currentNode, locking n3 nodes).
    GameState.completeNode("n1a");
    GameState.completeNode("n2b");
    expect(GameState.currentNode).toBe("n2b");
    GameState.completeNode("n1a");
    expect(GameState.currentNode).toBe("n2b");
    expect(GameState.completedNodes.filter((n) => n === "n1a").length).toBe(1);
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

  it("Scholar does NOT add starting skill points (bonus is per level-up)", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("scholar");
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.skillPoints).toBe(0);
  });

  it("Scholar grants +1 extra skill point per level up (so +2 total)", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("scholar");
    GameState.resetHero(MOCK_CONFIG);
    GameState.addXp(60); // lv 1→2
    expect(GameState.hero.skillPoints).toBe(2);
    GameState.addXp(240); // lv 2→3
    expect(GameState.hero.skillPoints).toBe(4);
  });

  it("without Scholar, level up grants only +1 skill point", () => {
    GameState.resetHero(MOCK_CONFIG);
    GameState.addXp(60);
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

  it("buyHpPotion deducts 18 gold and increments hpPotions", () => {
    GameState.hero.gold = 50;
    expect(GameState.buyHpPotion()).toBe(true);
    expect(GameState.hero.gold).toBe(32);
    expect(GameState.hero.hpPotions).toBe(1);
  });

  it("buyHpPotion returns false when gold below 18", () => {
    GameState.hero.gold = 17;
    expect(GameState.buyHpPotion()).toBe(false);
    expect(GameState.hero.gold).toBe(17);
    expect(GameState.hero.hpPotions).toBe(0);
  });

  it("buyManaPotion deducts 21 gold and increments manaPotions", () => {
    GameState.hero.gold = 60;
    expect(GameState.buyManaPotion()).toBe(true);
    expect(GameState.hero.gold).toBe(39);
    expect(GameState.hero.manaPotions).toBe(1);
  });

  it("buyManaPotion returns false when gold below 21", () => {
    GameState.hero.gold = 20;
    expect(GameState.buyManaPotion()).toBe(false);
    expect(GameState.hero.gold).toBe(20);
    expect(GameState.hero.manaPotions).toBe(0);
  });
});

// ── safe lookups ──────────────────────────────────────────────────────────────

describe("GameState.getMove / getItem", () => {
  const ITEM: GearItem = {
    id: "iron_sword", name: "Iron Sword", slot: "weapon", rarity: "common",
    tier: 1, cost: 30,
    statBonuses: { attack: 4 }, description: "",
  };
  const CONFIG: RunConfig = {
    ...MOCK_CONFIG,
    items: { iron_sword: ITEM },
    moves: {
      slash: { id: "slash", name: "Slash", moveType: "physical", baseValue: 10, effects: [], description: "", dropChance: 0, manaCost: 0 },
    },
  };

  beforeEach(() => {
    GameState.runConfig = CONFIG;
  });

  it("getMove returns the move for a known id", () => {
    expect(GameState.getMove("slash")?.name).toBe("Slash");
  });

  it("getMove returns undefined and warns on unknown id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(GameState.getMove("nonexistent")).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("nonexistent"));
    warn.mockRestore();
  });

  it("getItem returns the item for a known id", () => {
    expect(GameState.getItem("iron_sword")?.name).toBe("Iron Sword");
  });

  it("getItem returns undefined and warns on unknown id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(GameState.getItem("ghost_item")).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ghost_item"));
    warn.mockRestore();
  });

  it("getMove returns undefined when runConfig is null", () => {
    GameState.runConfig = null;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(GameState.getMove("slash")).toBeUndefined();
    warn.mockRestore();
  });
});

describe("hero save versioning", () => {
  it("saveHero stamps SAVE_VERSION on the persisted record", async () => {
    const { SAVE_VERSION } = await import("./gameState");
    GameState.hero.gold = 42;
    GameState.saveHero();
    const raw = localStorage.getItem("rpg_hero");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.saveVersion).toBe(SAVE_VERSION);
    expect(parsed.gold).toBe(42);
  });

  it("initHero migrates an unversioned save by backfilling new fields", () => {
    const legacy = {
      level: 3, xp: 10, currentHp: 80, maxHp: 100,
      attack: 15, defense: 10, magic: 8,
      learnedMoves: ["slash"], equippedMoves: ["slash"],
      // skillPoints, gold, equipment, inventory, hpPotions, manaPotions all missing
    };
    localStorage.setItem("rpg_hero", JSON.stringify(legacy));
    GameState.initHero(MOCK_CONFIG);
    expect(GameState.hero.skillPoints).toBe(0);
    expect(GameState.hero.gold).toBe(0);
    expect(GameState.hero.equipment).toEqual({});
    expect(GameState.hero.inventory).toEqual([]);
    expect(GameState.hero.hpPotions).toBe(0);
    expect(GameState.hero.manaPotions).toBe(0);
    // Existing data is preserved.
    expect(GameState.hero.level).toBe(3);
    expect(GameState.hero.xp).toBe(10);
    expect(GameState.hero.currentHp).toBe(80);
  });

  it("initHero warns and migrates when save version is older than current", async () => {
    const { SAVE_VERSION } = await import("./gameState");
    const legacy = {
      saveVersion: SAVE_VERSION - 99,
      level: 1, xp: 0, currentHp: 100, maxHp: 100,
      attack: 15, defense: 10, magic: 8,
      learnedMoves: ["slash"], equippedMoves: ["slash"],
    };
    localStorage.setItem("rpg_hero", JSON.stringify(legacy));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    GameState.initHero(MOCK_CONFIG);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("migrating hero save"));
    warn.mockRestore();
  });

  it("initHero does not warn when save version matches", async () => {
    const { SAVE_VERSION } = await import("./gameState");
    GameState.saveHero(); // stamps current SAVE_VERSION
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    GameState.initHero(MOCK_CONFIG);
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("migrating"));
    warn.mockRestore();
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("getGearBonuses", () => {
  const SWORD: GearItem = {
    id: "iron_sword", name: "Iron Sword", slot: "weapon", rarity: "common",
    tier: 1, cost: 30,
    statBonuses: { attack: 4 }, description: "",
  };

  it("sums bonuses from equipped items", () => {
    const b = getGearBonuses({ weapon: "iron_sword" }, { iron_sword: SWORD });
    expect(b.attack).toBe(4);
  });

  it("warns and skips when an equipped id is missing from items dict", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const b = getGearBonuses({ weapon: "stale_id" }, { iron_sword: SWORD });
    expect(b.attack).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("stale_id"));
    warn.mockRestore();
  });
});

describe("GameState.startFreshRun", () => {
  it("installs the new config and seeds runSeed from it", () => {
    const fresh: RunConfig = { ...MOCK_CONFIG, seed: 9999 };
    GameState.startFreshRun(fresh);
    expect(GameState.runConfig).toBe(fresh);
    expect(GameState.runSeed).toBe(9999);
  });

  it("resets the hero to defaults (level 1, fresh stats)", () => {
    GameState.runConfig = MOCK_CONFIG;
    GameState.initHero(MOCK_CONFIG);
    GameState.hero.level = 8;
    GameState.hero.gold = 500;
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 7 });
    expect(GameState.hero.level).toBe(1);
    // gold goes back to MetaProgress.getStartingBonuses().gold, which is 0
    // here because no Hoarder was purchased.
    expect(GameState.hero.gold).toBe(0);
  });

  it("preserves MetaProgress (shards + purchased upgrades) across the call", () => {
    MetaProgress.shards = 75;
    MetaProgress.purchased.add("vitality_1");
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 1 });
    expect(MetaProgress.shards).toBe(75);
    expect(MetaProgress.purchased.has("vitality_1")).toBe(true);
  });

  it("applies meta starting bonuses to the new hero", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("vitality_1"); // +15 maxHp
    MetaProgress.buy("strength_1"); // +2 attack
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 1 });
    expect(GameState.hero.maxHp).toBe(MOCK_CONFIG.heroClasses.knight.maxHp + 15);
    expect(GameState.hero.attack).toBe(MOCK_CONFIG.heroClasses.knight.attack + 2);
  });

  it("clears prior tree state so old node ids don't bleed in", () => {
    GameState.runSeed = 1;
    GameState.completedNodes = ["n1", "n2"];
    GameState.currentNode = "n2";
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 42 });
    expect(GameState.completedNodes).toEqual([]);
    expect(GameState.currentNode).toBeNull();
    expect(GameState.runSeed).toBe(42);
  });

  it("clears any in-fight runSave from the old seed", () => {
    localStorage.setItem("rpg_run", JSON.stringify({ currentMonsterIndex: 2 }));
    GameState.runSave = { currentMonsterIndex: 2, defeatedMonsterIds: [], runConfig: MOCK_CONFIG };
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 1 });
    expect(GameState.runSave).toBeNull();
    expect(localStorage.getItem("rpg_run")).toBeNull();
  });

  it("persists tree state with the new seed so MainMenu shows CONTINUE on refresh", () => {
    // Regression: without the saveTreeState call inside startFreshRun, a
    // browser refresh right after Fight Again would find an empty
    // rpg_tree_state and the menu would hide the CONTINUE button.
    GameState.startFreshRun({ ...MOCK_CONFIG, seed: 12345 });
    const raw = localStorage.getItem("rpg_tree_state");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.runSeed).toBe(12345);
    expect(parsed.completedNodes).toEqual([]);
    expect(parsed.currentNode).toBeNull();
  });
});

describe("GameState selectedClass", () => {
  it("defaults to knight when no class persisted", () => {
    GameState.loadSelectedClass();
    expect(GameState.selectedClass).toBe("knight");
  });

  it("setSelectedClass persists to localStorage", () => {
    GameState.setSelectedClass("mage");
    expect(localStorage.getItem("rpg_selected_class")).toBe("mage");
    GameState.selectedClass = "knight" as const; // simulate page reload
    GameState.loadSelectedClass();
    expect(GameState.selectedClass).toBe("mage");
  });

  it("ignores garbage values in localStorage and falls back to knight", () => {
    localStorage.setItem("rpg_selected_class", "wizard"); // not a HeroClass
    GameState.loadSelectedClass();
    expect(GameState.selectedClass).toBe("knight");
  });

  it("resetHero with mage class uses Mage stats and moves", () => {
    GameState.setSelectedClass("mage");
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.maxHp).toBe(MAGE_DEFAULTS.maxHp);
    expect(GameState.hero.attack).toBe(MAGE_DEFAULTS.attack);
    expect(GameState.hero.magic).toBe(MAGE_DEFAULTS.magic);
    expect(GameState.hero.learnedMoves).toEqual(MAGE_DEFAULTS.defaultMoves);
    expect(GameState.hero.equippedMoves).toEqual(MAGE_DEFAULTS.defaultMoves);
  });

  it("resetHero with knight class uses Knight stats and moves", () => {
    GameState.setSelectedClass("knight");
    GameState.resetHero(MOCK_CONFIG);
    expect(GameState.hero.maxHp).toBe(KNIGHT_DEFAULTS.maxHp);
    expect(GameState.hero.attack).toBe(KNIGHT_DEFAULTS.attack);
    expect(GameState.hero.learnedMoves).toEqual(KNIGHT_DEFAULTS.defaultMoves);
  });
});

describe("GameState cloud sync wiring", () => {
  beforeEach(() => {
    GameState.runConfig = MOCK_CONFIG;
    GameState.initHero(MOCK_CONFIG);
  });

  it("saveHero triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    GameState.saveHero();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("addXp triggers Cloud.pushDebounced via saveHero", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    GameState.addXp(10);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("learnMove triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    GameState.learnMove("new_move");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
