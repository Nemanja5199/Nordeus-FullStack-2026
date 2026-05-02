import { api } from "../services/api";

// Sync layer over localStorage. Boot hydrates from cloud → localStorage;
// thereafter pushDebounced() mirrors writes back. Network failures are soft.

const SESSION_KEY = "rpg_session_id";
const HERO_KEY = "rpg_hero";
const SHARDS_KEY = "rpg_meta_shards";
const UPGRADES_KEY = "rpg_meta_upgrades";
const SETTINGS_KEY = "rpg_settings";

const PUSH_DEBOUNCE_MS = 500;

interface PushPayload {
  sessionId: string;
  hero?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

class CloudSyncManager {
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  // Flips on after loadFromCloud completes (success or failure). Pushes
  // before this would race with the hydrate.
  private booted = false;

  getSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  async loadFromCloud(): Promise<void> {
    try {
      const data = await api.loadGame(this.getSessionId());
      if (data.hero) {
        // Stamp saveVersion to skip migrateHero's mismatch warning.
        localStorage.setItem(HERO_KEY, JSON.stringify({ ...data.hero, saveVersion: 1 }));
      }
      if (data.meta) {
        const shards = (data.meta as { shards?: number }).shards;
        if (typeof shards === "number") localStorage.setItem(SHARDS_KEY, String(shards));
        const ups = (data.meta as { purchasedUpgrades?: string[] }).purchasedUpgrades;
        if (Array.isArray(ups)) localStorage.setItem(UPGRADES_KEY, JSON.stringify(ups));
      }
      if (data.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      }
    } catch (err) {
      console.warn("[Cloud] load failed, running offline:", err);
    } finally {
      this.booted = true;
    }
  }

  // Coalesces a flurry of writes into one POST. saveHero alone fires from
  // ~20 callsites; a level-up triggers several in a row.
  pushDebounced(): void {
    if (!this.booted) return;
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.pushNow();
    }, PUSH_DEBOUNCE_MS);
  }

  async pushNow(): Promise<void> {
    const payload: PushPayload = { sessionId: this.getSessionId() };

    const heroRaw = localStorage.getItem(HERO_KEY);
    if (heroRaw) {
      try {
        const h = JSON.parse(heroRaw) as Record<string, unknown>;
        payload.hero = {
          level: h.level,
          xp: h.xp,
          maxHp: h.maxHp,
          attack: h.attack,
          defense: h.defense,
          magic: h.magic,
          skillPoints: h.skillPoints ?? 0,
          gold: h.gold ?? 0,
          hpPotions: h.hpPotions ?? 0,
          manaPotions: h.manaPotions ?? 0,
          learnedMoves: h.learnedMoves ?? [],
          equippedMoves: h.equippedMoves ?? [],
          inventory: h.inventory ?? [],
          equipment: h.equipment ?? {},
        };
      } catch { /* corrupted hero, skip */ }
    }

    const shardsRaw = localStorage.getItem(SHARDS_KEY);
    const upgradesRaw = localStorage.getItem(UPGRADES_KEY);
    if (shardsRaw !== null || upgradesRaw !== null) {
      let upgrades: string[] = [];
      if (upgradesRaw) {
        try {
          const parsed = JSON.parse(upgradesRaw);
          if (Array.isArray(parsed)) upgrades = parsed;
        } catch { /* skip */ }
      }
      payload.meta = {
        shards: shardsRaw ? parseInt(shardsRaw, 10) || 0 : 0,
        purchasedUpgrades: upgrades,
      };
    }

    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw) {
      try { payload.settings = JSON.parse(settingsRaw); } catch { /* skip */ }
    }

    if (!payload.hero && !payload.meta && !payload.settings) return;

    try {
      await api.saveGame(payload);
    } catch (err) {
      console.warn("[Cloud] push failed:", err);
    }
  }

  resetForTests(): void {
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
    this.pushTimer = null;
    this.booted = false;
  }

  markBootedForTests(): void {
    this.booted = true;
  }
}

export const Cloud = new CloudSyncManager();
