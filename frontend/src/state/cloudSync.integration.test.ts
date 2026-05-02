// End-to-end round-trip tests for the cloud-sync layer. These complement
// cloudSync.test.ts (transport) and the per-module wiring tests
// (settings/metaProgress/gameState) by proving the *data* actually flows:
//
//   module write ──► localStorage ──► api.saveGame(payload)
//   api.loadGame() ──► localStorage ──► module read
//
// If these pass alongside the wiring tests, the sync is verified end-to-end
// at the unit-test level. The remaining gap is the network call itself,
// which is what scripts/test_supabase.py covers.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Cloud } from "./cloudSync";
import { Settings } from "./settings";
import { MetaProgress } from "./metaProgress";
import { GameState } from "./gameState";
import { api } from "../services/api";
import type { RunConfig } from "../types/game";

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

const MOCK_UPGRADES = [
  { id: "vitality_1", name: "Vitality I", category: "maxHp", cost: 15, bonus: 15, description: "" },
] as const;

const MOCK_CONFIG: RunConfig = {
  monsters: [],
  moves: {},
  items: {},
  seed: 1,
  mapTree: { nodes: {}, roots: [] },
  heroDefaults: KNIGHT_DEFAULTS,
  heroClasses: { knight: KNIGHT_DEFAULTS, mage: MAGE_DEFAULTS },
  upgrades: MOCK_UPGRADES as unknown as RunConfig["upgrades"],
};

function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("crypto", { randomUUID: () => "round-trip-session" });
  Cloud.resetForTests();
  Settings.resetCacheForTests();
  // MetaProgress reads upgrade defs from runConfig; tests that buy upgrades
  // need the fixture in place.
  GameState.runConfig = MOCK_CONFIG;
  MetaProgress.resetAll();
});

// ── Outbound: module write → cloud payload ──────────────────────────────────

describe("Round trip: module write reaches the cloud payload", () => {
  it("Settings.setMusicVolume(0.42) lands in payload.settings", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    Settings.setMusicVolume(0.42);
    await Cloud.pushNow();
    const payload = spy.mock.calls[0][0];
    expect((payload.settings as { musicVolume: number }).musicVolume).toBeCloseTo(0.42);
  });

  it("Settings.setFastAnimations(true) lands in payload.settings", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    Settings.setFastAnimations(true);
    await Cloud.pushNow();
    expect((spy.mock.calls[0][0].settings as { fastAnimations: boolean }).fastAnimations).toBe(true);
  });

  it("MetaProgress.addShards(7) lands in payload.meta", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    MetaProgress.addShards(7);
    await Cloud.pushNow();
    expect((spy.mock.calls[0][0].meta as { shards: number }).shards).toBe(7);
  });

  it("MetaProgress.buy lands purchasedUpgrades in payload.meta", async () => {
    MetaProgress.addShards(100);
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    MetaProgress.buy("vitality_1");
    await Cloud.pushNow();
    const meta = spy.mock.calls[0][0].meta as { purchasedUpgrades: string[] };
    expect(meta.purchasedUpgrades).toContain("vitality_1");
  });

  it("GameState.saveHero lands in payload.hero", async () => {
    GameState.runConfig = MOCK_CONFIG;
    GameState.initHero(MOCK_CONFIG);
    GameState.hero.level = 5;
    GameState.hero.gold = 123;
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    GameState.saveHero();
    await Cloud.pushNow();
    const hero = spy.mock.calls[0][0].hero as { level: number; gold: number };
    expect(hero.level).toBe(5);
    expect(hero.gold).toBe(123);
  });

  it("a flurry of changes coalesces into one push containing all of them", async () => {
    GameState.runConfig = MOCK_CONFIG;
    GameState.initHero(MOCK_CONFIG);
    GameState.hero.level = 4;
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();

    // Three independent state changes within the debounce window.
    Settings.setMusicVolume(0.5);
    MetaProgress.addShards(3);
    GameState.saveHero();

    await Cloud.pushNow();
    const p = spy.mock.calls[0][0];
    expect((p.settings as { musicVolume: number }).musicVolume).toBeCloseTo(0.5);
    expect((p.meta as { shards: number }).shards).toBe(3);
    expect((p.hero as { level: number }).level).toBe(4);
  });
});

// ── Inbound: cloud payload → module read ────────────────────────────────────

describe("Round trip: cloud load hydrates module reads", () => {
  it("Settings.musicVolume reads what the cloud loaded", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null,
      meta: null,
      settings: { musicVolume: 0.13, sfxVolume: 0.6, fastAnimations: true, screenShake: false },
      run: null,
    });
    await Cloud.loadFromCloud();
    Settings.resetCacheForTests();
    expect(Settings.musicVolume()).toBeCloseTo(0.13);
    expect(Settings.fastAnimations()).toBe(true);
    expect(Settings.screenShake()).toBe(false);
  });

  it("MetaProgress reads what the cloud loaded", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null,
      meta: { shards: 99, purchasedUpgrades: ["scholar", "hoarder"] },
      settings: null,
      run: null,
    });
    await Cloud.loadFromCloud();
    MetaProgress.load();
    expect(MetaProgress.shards).toBe(99);
    expect(MetaProgress.purchased.has("scholar")).toBe(true);
    expect(MetaProgress.purchased.has("hoarder")).toBe(true);
  });

  it("GameState.initHero loads the hero hydrated by the cloud", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: {
        level: 7, xp: 30, maxHp: 180, attack: 35, defense: 15, magic: 22,
        skillPoints: 2, gold: 88, hpPotions: 3, manaPotions: 1,
        learnedMoves: ["slash", "shadow_bolt"], equippedMoves: ["slash"],
        inventory: ["iron_sword"], equipment: { weapon: "iron_sword" },
      },
      meta: null, settings: null, run: null,
    });
    await Cloud.loadFromCloud();

    GameState.runConfig = MOCK_CONFIG;
    GameState.initHero(MOCK_CONFIG);

    expect(GameState.hero.level).toBe(7);
    expect(GameState.hero.gold).toBe(88);
    expect(GameState.hero.equipment.weapon).toBe("iron_sword");
    expect(GameState.hero.learnedMoves).toContain("shadow_bolt");
  });

  it("hydrate then read then write produces the right cloud payload", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null,
      meta: { shards: 50, purchasedUpgrades: [] },
      settings: { musicVolume: 0.3, sfxVolume: 0.5, fastAnimations: false, screenShake: true },
      run: null,
    });
    await Cloud.loadFromCloud();

    // Hydrated state is now visible to the modules.
    Settings.resetCacheForTests();
    MetaProgress.load();
    expect(Settings.musicVolume()).toBeCloseTo(0.3);
    expect(MetaProgress.shards).toBe(50);

    // A subsequent local change pushes the merged state back to cloud.
    const saveSpy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Settings.setMusicVolume(0.9);
    await Cloud.pushNow();

    const p = saveSpy.mock.calls[0][0];
    expect((p.settings as { musicVolume: number }).musicVolume).toBeCloseTo(0.9);
    // Meta wasn't touched, but it's still sent (push reads everything fresh
    // from localStorage). Important: shards stays 50, not reset to 0.
    expect((p.meta as { shards: number }).shards).toBe(50);
  });
});

// ── Edge cases that cost real bugs ─────────────────────────────────────────

describe("Round trip: edge cases", () => {
  it("offline boot still allows future pushes (booted gate flips on error)", async () => {
    vi.spyOn(api, "loadGame").mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await Cloud.loadFromCloud();

    // Network came back. A new push should now succeed.
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Settings.setMusicVolume(0.5);
    await Cloud.pushNow();
    expect(spy).toHaveBeenCalled();
  });

  it("session_id is reused across loads and pushes", async () => {
    const loadSpy = vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null, meta: null, settings: null, run: null,
    });
    const saveSpy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });

    await Cloud.loadFromCloud();
    Settings.setMusicVolume(0.5);
    await Cloud.pushNow();

    expect(loadSpy.mock.calls[0][0]).toBe("round-trip-session");
    expect(saveSpy.mock.calls[0][0].sessionId).toBe("round-trip-session");
  });

  it("cloud null response leaves localStorage untouched (preserves local-only state)", async () => {
    // User had local progress before cloud-sync was wired. Boot with empty
    // cloud row should NOT wipe their local hero.
    localStorage.setItem("rpg_hero", JSON.stringify({ level: 9, saveVersion: 1 }));
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null, meta: null, settings: null, run: null,
    });
    await Cloud.loadFromCloud();
    const persisted = JSON.parse(localStorage.getItem("rpg_hero")!);
    expect(persisted.level).toBe(9);
  });
});
