import { describe, it, expect, beforeEach, vi } from "vitest";
import { Audio, TrackGroup, MusicAsset } from "./audio";

interface FakeSound {
  isPlaying: boolean;
  playArg: { seek?: number } | null;
  stopped: boolean;
  destroyed: boolean;
}

interface FakeScene {
  added: FakeSound[];
  cacheKeys: Set<string>;
  locked: boolean;
  cache: { audio: { exists: (k: string) => boolean } };
  sound: {
    locked: boolean;
    add: (key: string, opts: { loop: boolean; volume: number }) => FakeSound;
    once: (event: unknown, fn: () => void) => void;
  };
}

function makeScene(opts: { locked?: boolean; missingKeys?: string[] } = {}): FakeScene {
  const added: FakeSound[] = [];
  const missing = new Set(opts.missingKeys ?? []);
  const scene: FakeScene = {
    added,
    cacheKeys: new Set(),
    locked: opts.locked ?? false,
    cache: {
      audio: { exists: (k: string) => !missing.has(k) },
    },
    sound: {
      locked: opts.locked ?? false,
      add: (_key, _opts) => {
        const s: FakeSound = {
          isPlaying: false,
          playArg: null,
          stopped: false,
          destroyed: false,
        };
        // Phaser BaseSound shape we use: play(), stop(), destroy(), .duration
        const sound = s as unknown as {
          play: (a: { seek?: number }) => void;
          stop: () => void;
          destroy: () => void;
          duration: number;
        } & FakeSound;
        sound.duration = 100;
        sound.play = (a) => {
          s.isPlaying = true;
          s.playArg = a;
        };
        sound.stop = () => {
          s.isPlaying = false;
          s.stopped = true;
        };
        sound.destroy = () => {
          s.destroyed = true;
        };
        // playStinger registers a "complete" listener; stub it as a no-op.
        (sound as unknown as { once: (e: string, fn: () => void) => void }).once = () => {};
        (sound as unknown as { setVolume: (v: number) => void }).setVolume = () => {};
        added.push(s);
        return sound;
      },
      once: (_event, _fn) => {
        // Not exercised when locked=false in these tests.
      },
    },
  };
  return scene;
}

beforeEach(() => {
  Audio.resetForTests();
  vi.spyOn(Math, "random").mockReturnValue(0); // pick variant 0 deterministically
});

describe("AudioManager state machine", () => {
  it("starts a track when none is playing", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Menu);
    expect(s.added.length).toBe(1);
    expect(s.added[0].isPlaying).toBe(true);
    expect(Audio.currentGroupKey()).toBe(TrackGroup.Menu);
  });

  it("does not restart when the same group is already playing", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Map);
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Map);
    expect(s.added.length).toBe(1);
  });

  it("swaps tracks when group changes", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Map);
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Battle);
    expect(s.added.length).toBe(2);
    expect(s.added[0].stopped).toBe(true);
    expect(s.added[0].destroyed).toBe(true);
    expect(s.added[1].isPlaying).toBe(true);
    expect(Audio.currentGroupKey()).toBe(TrackGroup.Battle);
  });

  it("seeks into the [min, max] range for battle group", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Battle);
    // duration 100, min 0.05, max 0.5 → seek = 100 * (0.05 + 0.4 * 0.45) = 23
    expect(s.added[0].playArg?.seek).toBeCloseTo(23);
  });

  it("seeks into the [min, max] range for menu group too", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // landing at min boundary
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Menu);
    // duration 100, min 0.05 → seek = 100 * 0.05 = 5
    expect(s.added[0].playArg?.seek).toBeCloseTo(5);
  });

  it("death group plays from the start with no random offset", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Death);
    expect(s.added[0].playArg?.seek).toBe(0);
  });

  it("playStinger fires a one-shot without touching currentGroup", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Battle);
    Audio.playStinger(s as unknown as Phaser.Scene, MusicAsset.Victory);
    expect(s.added.length).toBe(2);
    expect(s.added[1].isPlaying).toBe(true);
    // currentGroup unchanged so a future Audio.stop() still hits the bg track
    expect(Audio.currentGroupKey()).toBe(TrackGroup.Battle);
  });

  it("stops a lingering stinger when a new bg track starts", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Battle);
    Audio.playStinger(s as unknown as Phaser.Scene, MusicAsset.Victory);
    // Battle bg track + stinger now in s.added
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Map);
    // The stinger (added[1]) should be stopped & destroyed by the bg swap
    expect(s.added[1].stopped).toBe(true);
    expect(s.added[1].destroyed).toBe(true);
  });

  it("stops a lingering stinger on Audio.stop()", () => {
    const s = makeScene();
    Audio.playStinger(s as unknown as Phaser.Scene, MusicAsset.Victory);
    Audio.stop();
    expect(s.added[0].stopped).toBe(true);
    expect(s.added[0].destroyed).toBe(true);
  });

  it("playStinger silently no-ops when the asset key is missing", () => {
    const s = makeScene({ missingKeys: [MusicAsset.Victory] });
    Audio.playStinger(s as unknown as Phaser.Scene, MusicAsset.Victory);
    expect(s.added.length).toBe(0);
  });

  it("stop() clears state and stops the current track", () => {
    const s = makeScene();
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Menu);
    Audio.stop();
    expect(s.added[0].stopped).toBe(true);
    expect(Audio.currentGroupKey()).toBeNull();
  });

  it("skips silently when the asset key is missing from cache", () => {
    const s = makeScene({ missingKeys: [MusicAsset.Menu1, MusicAsset.Menu2] });
    Audio.play(s as unknown as Phaser.Scene, TrackGroup.Menu);
    expect(s.added.length).toBe(0);
    expect(Audio.currentGroupKey()).toBeNull();
  });
});
