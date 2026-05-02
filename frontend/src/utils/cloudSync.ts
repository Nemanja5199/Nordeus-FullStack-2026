import { api } from "../services/api";

// Acts as a transparent sync layer over the existing localStorage stores
// (GameState, MetaProgress, Settings). On boot we hydrate localStorage from
// the cloud row before any other module reads it; thereafter every
// state-mutating call site invokes pushDebounced(), which coalesces a flurry
// of writes into a single POST after PUSH_DEBOUNCE_MS.
//
// Failure mode: cloud unreachable → we stay in local-only mode and the next
// successful push catches up. We never block gameplay on a network error.

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
  // Push gate: until loadFromCloud() finishes, every state mutation in scene
  // setup would race with the hydrate and overwrite cloud truth with stale
  // local defaults. Flip on after the load attempt completes (succeed *or*
  // fail — offline players still need writes to flush).
  private booted = false;

  getSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  // Boot-time hydrate. Pulls the cloud row and writes each section to its
  // localStorage key so the existing GameState/MetaProgress/Settings load
  // paths see it on first read. Must run before any of those modules
  // initialises — call from PreloadScene.create() with await.
  async loadFromCloud(): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      console.debug("[Cloud] loading session", sessionId);
      const data = await api.loadGame(sessionId);
      console.debug("[Cloud] loaded", {
        hero: !!data.hero, meta: !!data.meta, settings: !!data.settings, run: !!data.run,
      });

      if (data.hero) {
        // Stamp saveVersion so the local migrateHero() path doesn't fire
        // a version-mismatch warning on the freshly-hydrated record.
        localStorage.setItem(HERO_KEY, JSON.stringify({ ...data.hero, saveVersion: 1 }));
      }
      if (data.meta) {
        const shards = (data.meta as { shards?: number }).shards;
        if (typeof shards === "number") {
          localStorage.setItem(SHARDS_KEY, String(shards));
        }
        const ups = (data.meta as { purchasedUpgrades?: string[] }).purchasedUpgrades;
        if (Array.isArray(ups)) {
          localStorage.setItem(UPGRADES_KEY, JSON.stringify(ups));
        }
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

  // Schedules a push. Multiple calls within PUSH_DEBOUNCE_MS coalesce into
  // a single network request — important because saveHero() fires from
  // ~20 callsites and a level-up alone triggers several in a row.
  pushDebounced(): void {
    if (!this.booted) return;
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      void this.pushNow();
    }, PUSH_DEBOUNCE_MS);
  }

  // Immediate push (skip the debounce). Used by tests; production should
  // prefer pushDebounced() to avoid the network spam.
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
      } catch {
        // Corrupted local hero → don't push junk.
      }
    }

    const shardsRaw = localStorage.getItem(SHARDS_KEY);
    const upgradesRaw = localStorage.getItem(UPGRADES_KEY);
    if (shardsRaw !== null || upgradesRaw !== null) {
      let upgrades: string[] = [];
      if (upgradesRaw) {
        try {
          const parsed = JSON.parse(upgradesRaw);
          if (Array.isArray(parsed)) upgrades = parsed;
        } catch {
          // skip corrupt upgrades list
        }
      }
      payload.meta = {
        shards: shardsRaw ? parseInt(shardsRaw, 10) || 0 : 0,
        purchasedUpgrades: upgrades,
      };
    }

    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    if (settingsRaw) {
      try {
        payload.settings = JSON.parse(settingsRaw);
      } catch {
        // skip corrupt settings
      }
    }

    // Nothing to push? Bail before hitting the network.
    if (!payload.hero && !payload.meta && !payload.settings) return;

    try {
      console.debug("[Cloud] pushing", Object.keys(payload).filter((k) => k !== "sessionId"));
      await api.saveGame(payload);
      console.debug("[Cloud] push ok");
    } catch (err) {
      console.warn("[Cloud] push failed:", err);
    }
  }

  // Test seam — drops timer + boot flag without poking localStorage.
  resetForTests(): void {
    if (this.pushTimer !== null) clearTimeout(this.pushTimer);
    this.pushTimer = null;
    this.booted = false;
  }

  // Test seam — flip the boot gate without going through loadFromCloud.
  markBootedForTests(): void {
    this.booted = true;
  }
}

export const Cloud = new CloudSyncManager();
