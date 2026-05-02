import { describe, it, expect, beforeEach, vi } from "vitest";
import { SfxPlayer, Sfx, SfxAsset } from "./sfx";
import { Settings } from "../state/settings";

interface FakeSound {
  isPlaying: boolean;
  playArg: { rate?: number } | null;
  volumeArg: number;
}

interface FakeScene {
  added: FakeSound[];
  cache: { audio: { exists: (k: string) => boolean } };
  sound: {
    locked: boolean;
    add: (key: string, opts: { volume: number }) => FakeSound;
    once: (event: unknown, fn: () => void) => void;
  };
}

function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

function makeScene(opts: { missingKeys?: string[]; locked?: boolean } = {}): FakeScene {
  const added: FakeSound[] = [];
  const missing = new Set(opts.missingKeys ?? []);
  return {
    added,
    cache: {
      audio: { exists: (k: string) => !missing.has(k) },
    },
    sound: {
      locked: opts.locked ?? false,
      add: (_key, optsAdd) => {
        const s: FakeSound = {
          isPlaying: false,
          playArg: null,
          volumeArg: optsAdd.volume,
        };
        const sound = s as unknown as {
          play: (a: { rate?: number }) => void;
          once: (e: string, fn: () => void) => void;
        } & FakeSound;
        sound.play = (a) => {
          s.isPlaying = true;
          s.playArg = a;
        };
        sound.once = () => {};
        added.push(s);
        return sound;
      },
      once: (_event, _fn) => {},
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeStorage());
  Settings.resetCacheForTests();
  vi.spyOn(Math, "random").mockReturnValue(0); // pick variant 0, jitter = -slot.jitter
});

describe("SfxManager", () => {
  it("plays a single-variant slot", () => {
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.Heal);
    expect(s.added.length).toBe(1);
    expect(s.added[0].isPlaying).toBe(true);
  });

  it("picks one variant from multi-variant slots", () => {
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.PhysicalHit);
    expect(s.added.length).toBe(1); // exactly one, not three
  });

  it("applies pitch jitter inside the configured range", () => {
    // Math.random mocked to 0 → rate = 1 + (-1) * 0.08 = 0.92
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.PhysicalHit);
    expect(s.added[0].playArg?.rate).toBeCloseTo(0.92);
  });

  it("multiplies slot volume by Settings.sfxVolume()", () => {
    Settings.setSfxVolume(0.5);
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.Heal);
    // Heal slot volume 0.7, multiplier 0.5 → 0.35
    expect(s.added[0].volumeArg).toBeCloseTo(0.35);
  });

  it("does nothing when sfxVolume is 0", () => {
    Settings.setSfxVolume(0);
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.Heal);
    expect(s.added.length).toBe(0);
  });

  it("silently no-ops when the asset key is missing from cache", () => {
    const s = makeScene({ missingKeys: [SfxAsset.Heal] });
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.Heal);
    expect(s.added.length).toBe(0);
  });

  it("respects an explicit rate override", () => {
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.PhysicalHit, { rate: 0.5 });
    expect(s.added[0].playArg?.rate).toBe(0.5);
  });

  it("scales volume by volumeScale when provided", () => {
    Settings.setSfxVolume(1);
    const s = makeScene();
    SfxPlayer.play(s as unknown as Phaser.Scene, Sfx.Heal, { volumeScale: 0.5 });
    // Heal volume 0.7 × 0.5 × 1 = 0.35
    expect(s.added[0].volumeArg).toBeCloseTo(0.35);
  });
});
