import type Phaser from "phaser";
import { Settings } from "../state/settings";

// Background-music orchestrator. Tracks persist across scene transitions
// when the *group* doesn't change (map → equipment → map = no restart).

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
  // Uniform [min, max] × duration. min skips dead intros; max keeps us
  // from cutting in near the end and looping immediately.
  offsetMinRatio?: number;
  offsetMaxRatio?: number;
}

const GROUPS: Record<TrackGroupKey, TrackGroupConfig> = {
  [TrackGroup.Menu]:   { variants: [MusicAsset.Menu1, MusicAsset.Menu2],     volume: 0.42, randomOffset: true, offsetMinRatio: 0.05, offsetMaxRatio: 0.25 },
  [TrackGroup.Map]:    { variants: [MusicAsset.Map1, MusicAsset.Map2],       volume: 0.38, randomOffset: true, offsetMinRatio: 0.05, offsetMaxRatio: 0.25 },
  [TrackGroup.Battle]: { variants: [MusicAsset.Battle1, MusicAsset.Battle2], volume: 0.5,  randomOffset: true, offsetMinRatio: 0.05, offsetMaxRatio: 0.5 },
  [TrackGroup.Death]:  { variants: [MusicAsset.Death],                       volume: 0.42 },
};

class AudioManager {
  private current: Phaser.Sound.BaseSound | null = null;
  private currentGroup: TrackGroupKey | null = null;
  private stinger: Phaser.Sound.BaseSound | null = null;

  // No-op when the group is already audibly playing — keeps map music alive
  // while opening Equipment/Shop.
  play(scene: Phaser.Scene, groupKey: TrackGroupKey): void {
    if (this.currentGroup === groupKey && this.current?.isPlaying) return;

    const group = GROUPS[groupKey];
    if (!group) return;

    this.stop();
    this.stopStinger();

    const variantKey = group.variants[Math.floor(Math.random() * group.variants.length)];
    if (!scene.cache.audio.exists(variantKey)) return;

    const sound = scene.sound.add(variantKey, {
      loop: true,
      volume: group.volume * Settings.musicVolume(),
    });

    const start = () => {
      // Queue-then-swap guard: if play() was called again before the audio
      // context unlocked, don't start a sound that's already been replaced.
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

    // Set current before scheduling start so the guard above can match it.
    this.current = sound;
    this.currentGroup = groupKey;

    // Browsers block autoplay until first user gesture; Phaser fires
    // "unlocked" on first click anywhere.
    if (scene.sound.locked) scene.sound.once("unlocked", start);
    else start();
  }

  // Fire-and-forget one-shot (e.g. victory stinger). Doesn't change the
  // looping-music state machine.
  playStinger(scene: Phaser.Scene, key: MusicAssetKey, volume = 0.6): void {
    if (!scene.cache.audio.exists(key)) return;
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
    if (scene.sound.locked) scene.sound.once("unlocked", () => sound.play());
    else sound.play();
  }

  private stopStinger(): void {
    if (this.stinger) {
      this.stinger.stop();
      this.stinger.destroy();
      this.stinger = null;
    }
  }

  // Called by the Options slider every drag tick so volume changes feel live.
  applyMasterVolume(): void {
    if (!this.current || !this.currentGroup) return;
    const live = GROUPS[this.currentGroup].volume * Settings.musicVolume();
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
