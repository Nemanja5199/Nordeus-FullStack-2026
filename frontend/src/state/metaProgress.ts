import type { MetaUpgrade, MetaUpgradeCategory } from "../types/game";
import { Cloud } from "./cloudSync";
import { GameState } from "./gameState";

const SHARDS_KEY   = "rpg_meta_shards";
const UPGRADES_KEY = "rpg_meta_upgrades";

type StartingBonuses = Record<MetaUpgradeCategory, number>;

// Upgrade definitions live on the backend (data/upgrades.py) and arrive
// via /api/run/meta. Returns [] if no run config has loaded yet so the
// menu can render before the first run starts.
function defs(): MetaUpgrade[] {
  return GameState.runConfig?.upgrades ?? [];
}

class MetaProgressManager {
  shards = 0;
  purchased: Set<string> = new Set();

  load(): void {
    const s = localStorage.getItem(SHARDS_KEY);
    if (s) this.shards = parseInt(s, 10) || 0;
    const u = localStorage.getItem(UPGRADES_KEY);
    if (u) this.purchased = new Set(JSON.parse(u) as string[]);
  }

  save(): void {
    localStorage.setItem(SHARDS_KEY, String(this.shards));
    localStorage.setItem(UPGRADES_KEY, JSON.stringify([...this.purchased]));
    Cloud.pushDebounced();
  }

  addShards(amount: number): void {
    this.shards += amount;
    this.save();
  }

  canBuy(id: string): boolean {
    const def = defs().find((u) => u.id === id);
    if (!def || this.purchased.has(id)) return false;
    if (this.shards < def.cost) return false;
    if (def.requires && !this.purchased.has(def.requires)) return false;
    return true;
  }

  buy(id: string): boolean {
    if (!this.canBuy(id)) return false;
    const def = defs().find((u) => u.id === id)!;
    this.shards -= def.cost;
    this.purchased.add(id);
    this.save();
    return true;
  }

  // Scholar's skillPoints bonus applies per level-up via getLevelUpSkillBonus,
  // not at run start, so it's filtered out here.
  getStartingBonuses(): StartingBonuses {
    const b: StartingBonuses = { maxHp: 0, attack: 0, defense: 0, magic: 0, skillPoints: 0, gold: 0 };
    for (const id of this.purchased) {
      const def = defs().find((u) => u.id === id);
      if (def && def.category !== "skillPoints") b[def.category] += def.bonus;
    }
    return b;
  }

  getLevelUpSkillBonus(): number {
    let bonus = 0;
    for (const id of this.purchased) {
      const def = defs().find((u) => u.id === id);
      if (def && def.category === "skillPoints") bonus += def.bonus;
    }
    return bonus;
  }

  resetAll(): void {
    this.shards = 0;
    this.purchased = new Set();
    localStorage.removeItem(SHARDS_KEY);
    localStorage.removeItem(UPGRADES_KEY);
    Cloud.pushDebounced();
  }
}

export const MetaProgress = new MetaProgressManager();
