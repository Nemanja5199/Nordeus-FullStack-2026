import { describe, it, expect, beforeEach, vi } from "vitest";
import { Settings } from "./settings";
import { Cloud } from "./cloudSync";

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
  Settings.resetCacheForTests();
});

describe("Settings defaults", () => {
  it("fastAnimations defaults to false", () => {
    expect(Settings.fastAnimations()).toBe(false);
  });

  it("screenShake defaults to true", () => {
    expect(Settings.screenShake()).toBe(true);
  });

  it("animSpeedMultiplier is 1 when fastAnimations off", () => {
    expect(Settings.animSpeedMultiplier()).toBe(1);
  });

  it("animSpeedMultiplier is 0.5 when fastAnimations on", () => {
    Settings.setFastAnimations(true);
    expect(Settings.animSpeedMultiplier()).toBe(0.5);
  });
});

describe("Settings persistence", () => {
  it("setFastAnimations writes to localStorage", () => {
    Settings.setFastAnimations(true);
    const raw = localStorage.getItem("rpg_settings");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).fastAnimations).toBe(true);
  });

  it("setScreenShake writes to localStorage", () => {
    Settings.setScreenShake(false);
    const raw = localStorage.getItem("rpg_settings");
    expect(JSON.parse(raw!).screenShake).toBe(false);
  });

  it("reads persisted state across cache resets", () => {
    Settings.setFastAnimations(true);
    Settings.setScreenShake(false);
    Settings.resetCacheForTests();
    expect(Settings.fastAnimations()).toBe(true);
    expect(Settings.screenShake()).toBe(false);
  });

  it("falls back to defaults when localStorage holds garbage", () => {
    localStorage.setItem("rpg_settings", "{not valid json");
    Settings.resetCacheForTests();
    expect(Settings.fastAnimations()).toBe(false);
    expect(Settings.screenShake()).toBe(true);
  });
});

describe("Settings volume", () => {
  it("musicVolume defaults to 0.7", () => {
    expect(Settings.musicVolume()).toBe(0.7);
  });

  it("sfxVolume defaults to 0.8", () => {
    expect(Settings.sfxVolume()).toBe(0.8);
  });

  it("setMusicVolume clamps to [0, 1]", () => {
    Settings.setMusicVolume(2);
    expect(Settings.musicVolume()).toBe(1);
    Settings.setMusicVolume(-0.3);
    expect(Settings.musicVolume()).toBe(0);
  });

  it("setMusicVolume persists across cache resets", () => {
    Settings.setMusicVolume(0.42);
    Settings.resetCacheForTests();
    expect(Settings.musicVolume()).toBeCloseTo(0.42);
  });

  it("setSfxVolume persists and clamps", () => {
    Settings.setSfxVolume(0.55);
    Settings.resetCacheForTests();
    expect(Settings.sfxVolume()).toBeCloseTo(0.55);
    Settings.setSfxVolume(99);
    expect(Settings.sfxVolume()).toBe(1);
  });

  it("NaN volume is coerced to 0", () => {
    Settings.setMusicVolume(Number.NaN);
    expect(Settings.musicVolume()).toBe(0);
  });
});

describe("Settings toggles", () => {
  it("toggleFastAnimations flips and returns new state", () => {
    expect(Settings.toggleFastAnimations()).toBe(true);
    expect(Settings.fastAnimations()).toBe(true);
    expect(Settings.toggleFastAnimations()).toBe(false);
    expect(Settings.fastAnimations()).toBe(false);
  });

  it("toggleScreenShake flips and returns new state", () => {
    expect(Settings.toggleScreenShake()).toBe(false);
    expect(Settings.screenShake()).toBe(false);
    expect(Settings.toggleScreenShake()).toBe(true);
    expect(Settings.screenShake()).toBe(true);
  });
});

describe("Settings cloud sync wiring", () => {
  it("setMusicVolume triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    Settings.setMusicVolume(0.5);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("setSfxVolume triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    Settings.setSfxVolume(0.4);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("setFastAnimations triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    Settings.setFastAnimations(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("setScreenShake triggers Cloud.pushDebounced", () => {
    const spy = vi.spyOn(Cloud, "pushDebounced").mockImplementation(() => {});
    Settings.setScreenShake(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
