import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Cloud } from "./cloudSync";
import { api } from "../services/api";

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
  vi.stubGlobal("crypto", { randomUUID: () => "test-session-id" });
  Cloud.resetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CloudSync session id", () => {
  it("generates and persists a session id on first call", () => {
    const id = Cloud.getSessionId();
    expect(id).toBe("test-session-id");
    expect(localStorage.getItem("rpg_session_id")).toBe("test-session-id");
  });

  it("reuses the persisted session id on subsequent calls", () => {
    localStorage.setItem("rpg_session_id", "existing-id");
    expect(Cloud.getSessionId()).toBe("existing-id");
  });
});

describe("CloudSync loadFromCloud", () => {
  it("hydrates localStorage from a populated cloud row", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: { level: 5, xp: 200, maxHp: 150, attack: 30, defense: 12, magic: 18 },
      meta: { shards: 42, purchasedUpgrades: ["vitality_1", "strength_1"] },
      settings: { musicVolume: 0.3, fastAnimations: true },
      run: null,
    });

    await Cloud.loadFromCloud();

    const hero = JSON.parse(localStorage.getItem("rpg_hero")!);
    expect(hero.level).toBe(5);
    expect(hero.saveVersion).toBe(1); // stamped on hydrate

    expect(localStorage.getItem("rpg_meta_shards")).toBe("42");
    const ups = JSON.parse(localStorage.getItem("rpg_meta_upgrades")!);
    expect(ups).toEqual(["vitality_1", "strength_1"]);

    const settings = JSON.parse(localStorage.getItem("rpg_settings")!);
    expect(settings.musicVolume).toBe(0.3);
  });

  it("does nothing when cloud returns nulls", async () => {
    vi.spyOn(api, "loadGame").mockResolvedValue({
      hero: null, meta: null, settings: null, run: null,
    });
    await Cloud.loadFromCloud();
    expect(localStorage.getItem("rpg_hero")).toBeNull();
  });

  it("falls back to offline mode on network error", async () => {
    vi.spyOn(api, "loadGame").mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await Cloud.loadFromCloud();
    // No throw; booted flag should still flip so pushes can flush.
    Cloud.pushDebounced();
    // Push uses a timer — no assertion needed beyond "didn't throw".
  });
});

describe("CloudSync pushDebounced", () => {
  it("does not push before loadFromCloud has completed", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    vi.useFakeTimers();
    Cloud.pushDebounced();
    vi.advanceTimersByTime(1000);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("coalesces multiple calls within the debounce window", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    Cloud.markBootedForTests();
    localStorage.setItem("rpg_meta_shards", "10");
    vi.useFakeTimers();
    Cloud.pushDebounced();
    Cloud.pushDebounced();
    Cloud.pushDebounced();
    vi.advanceTimersByTime(600);
    await Promise.resolve(); // let the queued microtask resolve
    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe("CloudSync pushNow payload shape", () => {
  beforeEach(() => {
    Cloud.markBootedForTests();
  });

  it("strips runtime-only fields from hero payload", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    const hero = {
      level: 3, xp: 50, currentHp: 80, maxHp: 100,
      attack: 20, defense: 8, magic: 12, skillPoints: 1, gold: 25,
      hpPotions: 2, manaPotions: 1,
      learnedMoves: ["slash"], equippedMoves: ["slash"],
      inventory: [], equipment: {},
      saveVersion: 1,
    };
    localStorage.setItem("rpg_hero", JSON.stringify(hero));
    await Cloud.pushNow();
    const payload = spy.mock.calls[0][0];
    expect(payload.hero).toBeDefined();
    // currentHp and saveVersion are runtime-only; cloud payload skips them.
    expect((payload.hero as Record<string, unknown>).currentHp).toBeUndefined();
    expect((payload.hero as Record<string, unknown>).saveVersion).toBeUndefined();
    expect((payload.hero as Record<string, unknown>).level).toBe(3);
  });

  it("sends meta when shards or upgrades exist", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    localStorage.setItem("rpg_meta_shards", "12");
    localStorage.setItem("rpg_meta_upgrades", JSON.stringify(["scholar"]));
    await Cloud.pushNow();
    const payload = spy.mock.calls[0][0];
    expect(payload.meta).toEqual({ shards: 12, purchasedUpgrades: ["scholar"] });
  });

  it("sends settings JSONB as-is", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    const s = { musicVolume: 0.4, sfxVolume: 0.7, fastAnimations: true, screenShake: false };
    localStorage.setItem("rpg_settings", JSON.stringify(s));
    await Cloud.pushNow();
    expect(spy.mock.calls[0][0].settings).toEqual(s);
  });

  it("skips the network call when nothing is in localStorage", async () => {
    const spy = vi.spyOn(api, "saveGame").mockResolvedValue({ ok: true });
    await Cloud.pushNow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs but does not throw on push failure", async () => {
    vi.spyOn(api, "saveGame").mockRejectedValue(new Error("503"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("rpg_meta_shards", "5");
    await expect(Cloud.pushNow()).resolves.toBeUndefined();
  });
});
