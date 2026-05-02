import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetaProgress } from "./metaProgress";
import { Cloud } from "./cloudSync";
import { GameState } from "./gameState";
import type { MetaUpgrade, RunConfig } from "../types/game";

function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

// Mirrors backend/app/data/upgrades.py — keep in sync if defs drift.
const UPGRADES_FIXTURE: MetaUpgrade[] = [
  { id: "vitality_1", name: "Vitality I",   category: "maxHp",   cost: 15, bonus: 15, description: "" },
  { id: "vitality_2", name: "Vitality II",  category: "maxHp",   cost: 30, bonus: 30, requires: "vitality_1", description: "" },
  { id: "vitality_3", name: "Vitality III", category: "maxHp",   cost: 60, bonus: 70, requires: "vitality_2", description: "" },
  { id: "strength_1", name: "Strength I",   category: "attack",  cost: 15, bonus: 2,  description: "" },
  { id: "strength_2", name: "Strength II",  category: "attack",  cost: 30, bonus: 4,  requires: "strength_1", description: "" },
  { id: "guard_1",    name: "Guard I",      category: "defense", cost: 15, bonus: 2,  description: "" },
  { id: "scholar",    name: "Scholar",      category: "skillPoints", cost: 100, bonus: 1, description: "" },
  { id: "hoarder",    name: "Hoarder",      category: "gold",    cost: 40, bonus: 25, description: "" },
];

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
  // Stub the upgrades source — MetaProgress reads defs from runConfig.
  GameState.runConfig = { upgrades: UPGRADES_FIXTURE } as unknown as RunConfig;
  MetaProgress.resetAll();
});

describe("MetaProgress.addShards", () => {
  it("increments shards", () => {
    MetaProgress.addShards(10);
    expect(MetaProgress.shards).toBe(10);
  });

  it("accumulates across multiple calls", () => {
    MetaProgress.addShards(3);
    MetaProgress.addShards(6);
    expect(MetaProgress.shards).toBe(9);
  });

  it("persists to localStorage", () => {
    MetaProgress.addShards(5);
    MetaProgress.shards = 0;
    MetaProgress.load();
    expect(MetaProgress.shards).toBe(5);
  });
});

describe("MetaProgress.canBuy", () => {
  it("returns false when not enough shards", () => {
    MetaProgress.shards = 5;
    expect(MetaProgress.canBuy("vitality_1")).toBe(false);
  });

  it("returns true when shards are sufficient and no prerequisite", () => {
    MetaProgress.shards = 15;
    expect(MetaProgress.canBuy("vitality_1")).toBe(true);
  });

  it("returns false when already purchased", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("vitality_1");
    expect(MetaProgress.canBuy("vitality_1")).toBe(false);
  });

  it("returns false when prerequisite not yet purchased", () => {
    MetaProgress.shards = 100;
    expect(MetaProgress.canBuy("vitality_2")).toBe(false);
  });

  it("returns true once prerequisite is purchased", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("vitality_1");
    expect(MetaProgress.canBuy("vitality_2")).toBe(true);
  });

  it("returns false for unknown upgrade id", () => {
    MetaProgress.shards = 9999;
    expect(MetaProgress.canBuy("nonexistent")).toBe(false);
  });

  it("returns false when no runConfig is loaded (defs missing)", () => {
    GameState.runConfig = null;
    MetaProgress.shards = 9999;
    expect(MetaProgress.canBuy("vitality_1")).toBe(false);
  });
});

describe("MetaProgress.buy", () => {
  it("deducts shard cost", () => {
    MetaProgress.shards = 50;
    MetaProgress.buy("vitality_1");
    expect(MetaProgress.shards).toBe(35);
  });

  it("marks upgrade as purchased", () => {
    MetaProgress.shards = 50;
    MetaProgress.buy("vitality_1");
    expect(MetaProgress.purchased.has("vitality_1")).toBe(true);
  });

  it("returns true on successful purchase", () => {
    MetaProgress.shards = 50;
    expect(MetaProgress.buy("vitality_1")).toBe(true);
  });

  it("returns false when purchase fails", () => {
    MetaProgress.shards = 0;
    expect(MetaProgress.buy("vitality_1")).toBe(false);
  });

  it("does not deduct shards on failed purchase", () => {
    MetaProgress.shards = 5;
    MetaProgress.buy("vitality_1");
    expect(MetaProgress.shards).toBe(5);
  });

  it("persists purchased set to localStorage", () => {
    MetaProgress.shards = 50;
    MetaProgress.buy("vitality_1");
    const saved = new Set<string>(JSON.parse(localStorage.getItem("rpg_meta_upgrades")!));
    expect(saved.has("vitality_1")).toBe(true);
  });
});

describe("MetaProgress.getStartingBonuses", () => {
  it("returns zero bonuses when nothing purchased", () => {
    const b = MetaProgress.getStartingBonuses();
    expect(b.maxHp).toBe(0);
    expect(b.attack).toBe(0);
    expect(b.defense).toBe(0);
    expect(b.magic).toBe(0);
    expect(b.skillPoints).toBe(0);
    expect(b.gold).toBe(0);
  });

  it("sums maxHp from vitality upgrades", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("vitality_1");
    MetaProgress.buy("vitality_2");
    expect(MetaProgress.getStartingBonuses().maxHp).toBe(45);
  });

  it("sums attack from strength upgrades", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("strength_1");
    MetaProgress.buy("strength_2");
    expect(MetaProgress.getStartingBonuses().attack).toBe(6);
  });

  it("Scholar exposes +1 per-level-up SP bonus, not a starting bonus", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("scholar");
    expect(MetaProgress.getStartingBonuses().skillPoints).toBe(0);
    expect(MetaProgress.getLevelUpSkillBonus()).toBe(1);
  });

  it("getLevelUpSkillBonus is 0 when Scholar is not purchased", () => {
    expect(MetaProgress.getLevelUpSkillBonus()).toBe(0);
  });

  it("tracks hoarder gold bonus", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("hoarder");
    expect(MetaProgress.getStartingBonuses().gold).toBe(25);
  });

  it("combines bonuses across different categories", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("vitality_1");
    MetaProgress.buy("strength_1");
    MetaProgress.buy("guard_1");
    const b = MetaProgress.getStartingBonuses();
    expect(b.maxHp).toBe(15);
    expect(b.attack).toBe(2);
    expect(b.defense).toBe(2);
  });
});

describe("MetaProgress load/save", () => {
  it("load restores shards from localStorage", () => {
    MetaProgress.shards = 42;
    MetaProgress.save();
    MetaProgress.shards = 0;
    MetaProgress.load();
    expect(MetaProgress.shards).toBe(42);
  });

  it("load restores purchased upgrades from localStorage", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("vitality_1");
    MetaProgress.purchased = new Set();
    MetaProgress.load();
    expect(MetaProgress.purchased.has("vitality_1")).toBe(true);
  });

  it("load with empty localStorage starts at zero", () => {
    MetaProgress.load();
    expect(MetaProgress.shards).toBe(0);
    expect(MetaProgress.purchased.size).toBe(0);
  });
});

describe("MetaProgress.resetAll", () => {
  it("clears shards and purchased", () => {
    MetaProgress.shards = 99;
    MetaProgress.purchased.add("vitality_1");
    MetaProgress.resetAll();
    expect(MetaProgress.shards).toBe(0);
    expect(MetaProgress.purchased.size).toBe(0);
  });

  it("removes keys from localStorage", () => {
    MetaProgress.shards = 10;
    MetaProgress.save();
    MetaProgress.resetAll();
    expect(localStorage.getItem("rpg_meta_shards")).toBeNull();
    expect(localStorage.getItem("rpg_meta_upgrades")).toBeNull();
  });
});

describe("MetaProgress cloud sync wiring", () => {
  it("addShards triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    MetaProgress.addShards(5);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("buy triggers Cloud.pushDebounced on success", () => {
    MetaProgress.addShards(100);
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    MetaProgress.buy("vitality_1");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("resetAll triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    MetaProgress.resetAll();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
