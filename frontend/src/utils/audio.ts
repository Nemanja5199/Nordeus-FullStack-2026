import type Phaser from "phaser";
import { Settings } from "./settings";

// Background music orchestrator. Lives at game scope so tracks persist across
// scene transitions when the *group* doesn't change (e.g. map → equipment →
// map should not restart the map track).
//
// Per group we keep a list of variant asset keys and pick one randomly each
// time we (re)start that group. Battle additionally seeks to a random
// offset so back-to-back fights don't always open the same way.

// Phaser asset cache keys for every music file we load in PreloadScene.
// Imported by PreloadScene to register the load and by audio.ts to wire
// each key into a track group — keeping both in sync via a single source.
export const MusicAsset = {
  Menu1: "music_menu_1",
  Menu2: "music_menu_2",
  Map1: "music_map_1",
  Map2: "music_map_2",
  Battle1: "music_battle_1",
  Battle2: "music_battle_2",
  Death: "music_death",
  Victory: "music_victory",
} as const;
export type MusicAssetKey = typeof MusicAsset[keyof typeof MusicAsset];

// Looping-music groups. Callers pass one of these to Audio.play() instead
// of a magic string — gives autocomplete and "find usages" across scenes.
export const TrackGroup = {
  Menu: "menu",
  Map: "map",
  Battle: "battle",
  Death: "death",
} as const;
export type TrackGroupKey = typeof TrackGroup[keyof typeof TrackGroup];

interface TrackGroupConfig {
  variants: MusicAssetKey[];
  volume: number;
  randomOffset?: boolean;
  // Random offset is picked uniformly in [min, max] × duration.
  // Min skips past long quiet intros so scene entry doesn't feel dead;
  // max keeps us from cutting in near the end and looping immediately.
  offsetMinRatio?: number;
  offsetMaxRatio?: number;
}

const GROUPS: Record<TrackGroupKey, TrackGroupConfig> = {
  [TrackGroup.Menu]: {
    variants: [MusicAsset.Menu1, MusicAsset.Menu2],
    volume: 0.42,
    randomOffset: true,
    offsetMinRatio: 0.05,
    offsetMaxRatio: 0.25,
  },
  [TrackGroup.Map]: {
    variants: [MusicAsset.Map1, MusicAsset.Map2],
    volume: 0.38,
    randomOffset: true,
    offsetMinRatio: 0.05,
    offsetMaxRatio: 0.25,
  },
  [TrackGroup.Battle]: {
    variants: [MusicAsset.Battle1, MusicAsset.Battle2],
    volume: 0.5,
    randomOffset: true,
    offsetMinRatio: 0.05,
    offsetMaxRatio: 0.5,
  },
  [TrackGroup.Death]: {
    // No variant pool / no offset — the somber atmosphere works better
    // played from the start of the track each time the player dies.
    variants: [MusicAsset.Death],
    volume: 0.42,
  },
};

class AudioManager {
  private current: Phaser.Sound.BaseSound | null = null;
  private currentGroup: TrackGroupKey | null = null;
  // Latest one-shot stinger so it can be cut short on the next scene
  // transition. Otherwise the victory stinger leaks audibly into the map
  // track when the player clicks Continue mid-fanfare.
  private stinger: Phaser.Sound.BaseSound | null = null;

  // Begin (or keep playing) the given group's music in this scene's context.
  // No-op when the group is already the active one and audibly playing — this
  // is what lets the map track keep going while opening Equipment/Shop.
  play(scene: Phaser.Scene, groupKey: TrackGroupKey): void {
    if (this.currentGroup === groupKey && this.current?.isPlaying) return;

    const group = GROUPS[groupKey];
    if (!group) return;

    // Stop the previous track (hard cut for v1; crossfade can come later).
    this.stop();
    // Kill any lingering victory/defeat stinger so it doesn't bleed into
    // the freshly-started bg track.
    this.stopStinger();

    const variantKey = group.variants[Math.floor(Math.random() * group.variants.length)];
    if (!scene.cache.audio.exists(variantKey)) return;

    const sound = scene.sound.add(variantKey, {
      loop: true,
      volume: group.volume * Settings.musicVolume(),
    });

    const start = () => {
      // Guard against the queue-then-swap race: if the user clicked through
      // MainMenu fast enough that we replaced this sound before the audio
      // context unlocked, don't play a destroyed track.
      if (this.current !== sound) return;
      let seek = 0;
      if (group.randomOffset) {
        const dur = (sound as Phaser.Sound.WebAudioSound).duration ?? 0;
        const min = group.offsetMinRatio ?? 0;
        const max = group.offsetMaxRatio ?? 0.5;
        seek = dur * (min + Math.random() * Math.max(0, max - min));
      }
      sound.play({ seek });
    };

    // Set as current before invoking start so the guard inside start sees
    // a match. (For deferred starts via the unlocked listener this also
    // means a later play() that swaps tracks will trip the guard.)
    this.current = sound;
    this.currentGroup = groupKey;

    // Browsers block autoplay until the first user gesture. If the audio
    // context is locked here we just wait for Phaser's UNLOCKED event,
    // which fires on the first click anywhere in the game.
    if (scene.sound.locked) {
      scene.sound.once("unlocked", start);
    } else {
      start();
    }
  }

  // Fire-and-forget one-shot. Used for the victory stinger on PostBattleScene
  // (and any other "play once, no loop" cue we wire up later). Doesn't touch
  // the looping-music state machine — currentGroup keeps pointing at whatever
  // background track was last set.
  playStinger(scene: Phaser.Scene, key: MusicAssetKey, volume = 0.6): void {
    if (!scene.cache.audio.exists(key)) return;
    // Only one stinger at a time — if a new one starts before the previous
    // finished, drop the old one so they don't pile up.
    this.stopStinger();
    const sound = scene.sound.add(key, {
      loop: false,
      volume: volume * Settings.musicVolume(),
    });
    sound.once("complete", () => {
      if (this.stinger === sound) this.stinger = null;
      sound.destroy();
    });
    this.stinger = sound;
    if (scene.sound.locked) {
      scene.sound.once("unlocked", () => sound.play());
    } else {
      sound.play();
    }
  }

  private stopStinger(): void {
    if (this.stinger) {
      this.stinger.stop();
      this.stinger.destroy();
      this.stinger = null;
    }
  }

  // Recompute the live track volume from current group's base × Settings master.
  // Called by the Options slider on every drag tick so volume changes feel
  // instant instead of only kicking in on the next track change.
  applyMasterVolume(): void {
    if (!this.current || !this.currentGroup) return;
    const base = GROUPS[this.currentGroup].volume;
    const live = base * Settings.musicVolume();
    (this.current as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(live);
  }

  stop(): void {
    if (this.current) {
      this.current.stop();
      this.current.destroy();
      this.current = null;
    }
    this.currentGroup = null;
    this.stopStinger();
  }

  // Test seam — drops cached refs without poking Phaser internals.
  resetForTests(): void {
    this.current = null;
    this.currentGroup = null;
    this.stinger = null;
  }

  currentGroupKey(): TrackGroupKey | null {
    return this.currentGroup;
  }
}

export const Audio = new AudioManager();
