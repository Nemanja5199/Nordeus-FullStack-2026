// Player preferences. Mirrored to cloud via Cloud.pushDebounced on every write.
import { Cloud } from "./cloudSync";

const KEY = "rpg_settings";

interface SettingsShape {
  fastAnimations: boolean;
  screenShake: boolean;
  musicVolume: number;
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
    } catch { /* corrupted JSON, fall through to defaults */ }
    this.cached = { ...DEFAULTS };
    return this.cached;
  }

  private write(): void {
    if (this.cached) localStorage.setItem(KEY, JSON.stringify(this.cached));
    Cloud.pushDebounced();
  }

  fastAnimations(): boolean { return this.read().fastAnimations; }
  screenShake(): boolean { return this.read().screenShake; }
  musicVolume(): number { return clamp01(this.read().musicVolume); }
  sfxVolume(): number { return clamp01(this.read().sfxVolume); }

  setFastAnimations(value: boolean): void {
    this.read().fastAnimations = value;
    this.write();
  }

  setScreenShake(value: boolean): void {
    this.read().screenShake = value;
    this.write();
  }

  setMusicVolume(value: number): void {
    this.read().musicVolume = clamp01(value);
    this.write();
  }

  setSfxVolume(value: number): void {
    this.read().sfxVolume = clamp01(value);
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

  // Multiplier BattleScene applies to its _MS constants when read on create.
  animSpeedMultiplier(): number {
    return this.fastAnimations() ? 0.5 : 1;
  }

  resetCacheForTests(): void {
    this.cached = null;
  }
}

export const Settings = new SettingsManager();
