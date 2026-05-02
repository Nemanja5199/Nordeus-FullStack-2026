// Player preferences. Mirrored to the cloud (hero_progress.settings JSONB)
// so a returning player on another device picks up their volume / fast-anim
// choices. The local cache stays the in-session source of truth; the cloud
// push happens debounced via Cloud.pushDebounced() on every write.
import { Cloud } from "./cloudSync";

const KEY = "rpg_settings";

interface SettingsShape {
  fastAnimations: boolean;
  screenShake: boolean;
  // 0..1 master multiplier applied on top of per-group track volumes in audio.ts.
  musicVolume: number;
  // 0..1 master multiplier reserved for upcoming SFX wiring; not surfaced in UI yet.
  sfxVolume: number;
}

const DEFAULTS: SettingsShape = {
  fastAnimations: false,
  screenShake: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
};

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

class SettingsManager {
  private cached: SettingsShape | null = null;

  private read(): SettingsShape {
    if (this.cached) return this.cached;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsShape>;
        this.cached = { ...DEFAULTS, ...parsed };
        return this.cached;
      }
    } catch {
      // Corrupted JSON → fall through to defaults; next write will repair it.
    }
    this.cached = { ...DEFAULTS };
    return this.cached;
  }

  private write(): void {
    if (this.cached) localStorage.setItem(KEY, JSON.stringify(this.cached));
    Cloud.pushDebounced();
  }

  fastAnimations(): boolean {
    return this.read().fastAnimations;
  }

  screenShake(): boolean {
    return this.read().screenShake;
  }

  setFastAnimations(value: boolean): void {
    this.read().fastAnimations = value;
    this.write();
  }

  setScreenShake(value: boolean): void {
    this.read().screenShake = value;
    this.write();
  }

  toggleFastAnimations(): boolean {
    this.setFastAnimations(!this.fastAnimations());
    return this.fastAnimations();
  }

  toggleScreenShake(): boolean {
    this.setScreenShake(!this.screenShake());
    return this.screenShake();
  }

  musicVolume(): number {
    return clamp01(this.read().musicVolume);
  }

  sfxVolume(): number {
    return clamp01(this.read().sfxVolume);
  }

  setMusicVolume(value: number): void {
    this.read().musicVolume = clamp01(value);
    this.write();
  }

  setSfxVolume(value: number): void {
    this.read().sfxVolume = clamp01(value);
    this.write();
  }

  // Returns the multiplier animation durations should be scaled by.
  // BattleScene reads this once on create and applies it to every _MS constant.
  animSpeedMultiplier(): number {
    return this.fastAnimations() ? 0.5 : 1;
  }

  // Test seam — drops the cache so a fresh localStorage read happens next call.
  resetCacheForTests(): void {
    this.cached = null;
  }
}

export const Settings = new SettingsManager();
