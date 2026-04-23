import { describe, it, expect, beforeEach, vi } from "vitest";
import { MetaProgress, UPGRADE_DEFS } from "./metaProgress";

// ── localStorage mock ────────────────────────────────────────────────────────

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
});

// ── addShards ────────────────────────────────────────────────────────────────

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
    MetaProgress.shards = 0; // simulate reload
    MetaProgress.load();
    expect(MetaProgress.shards).toBe(5);
  });
});

// ── canBuy ───────────────────────────────────────────────────────────────────

describe("MetaProgress.canBuy", () => {
  it("returns false when not enough shards", () => {
    MetaProgress.shards = 5;
    expect(MetaProgress.canBuy("vitality_1")).toBe(false); // costs 15
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
    expect(MetaProgress.canBuy("vitality_2")).toBe(false); // requires vitality_1
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
});

// ── buy ──────────────────────────────────────────────────────────────────────

describe("MetaProgress.buy", () => {
  it("deducts shard cost", () => {
    MetaProgress.shards = 50;
    MetaProgress.buy("vitality_1"); // costs 15
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

// ── getStartingBonuses ────────────────────────────────────────────────────────

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
    MetaProgress.buy("vitality_1"); // +15
    MetaProgress.buy("vitality_2"); // +30
    expect(MetaProgress.getStartingBonuses().maxHp).toBe(45);
  });

  it("sums attack from strength upgrades", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("strength_1"); // +2
    MetaProgress.buy("strength_2"); // +4
    expect(MetaProgress.getStartingBonuses().attack).toBe(6);
  });

  it("tracks scholar skill point bonus", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("scholar"); // +1 skill point
    expect(MetaProgress.getStartingBonuses().skillPoints).toBe(1);
  });

  it("tracks hoarder gold bonus", () => {
    MetaProgress.shards = 100;
    MetaProgress.buy("hoarder"); // +25 gold
    expect(MetaProgress.getStartingBonuses().gold).toBe(25);
  });

  it("combines bonuses across different categories", () => {
    MetaProgress.shards = 200;
    MetaProgress.buy("vitality_1"); // +15 HP
    MetaProgress.buy("strength_1"); // +2 ATK
    MetaProgress.buy("guard_1");    // +2 DEF
    const b = MetaProgress.getStartingBonuses();
    expect(b.maxHp).toBe(15);
    expect(b.attack).toBe(2);
    expect(b.defense).toBe(2);
  });
});

// ── load / save ───────────────────────────────────────────────────────────────

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

// ── resetAll ──────────────────────────────────────────────────────────────────

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

// ── UPGRADE_DEFS integrity ────────────────────────────────────────────────────

describe("UPGRADE_DEFS", () => {
  it("all upgrade IDs are unique", () => {
    const ids = UPGRADE_DEFS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every requires field points to an existing upgrade", () => {
    const ids = new Set(UPGRADE_DEFS.map((u) => u.id));
    for (const u of UPGRADE_DEFS) {
      if (u.requires) expect(ids.has(u.requires)).toBe(true);
    }
  });

  it("all costs are positive", () => {
    expect(UPGRADE_DEFS.every((u) => u.cost > 0)).toBe(true);
  });
});
