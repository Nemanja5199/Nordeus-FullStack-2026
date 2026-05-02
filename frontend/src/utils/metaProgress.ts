import type { MetaUpgrade, MetaUpgradeCategory } from "../types/game";
import { Cloud } from "./cloudSync";

const SHARDS_KEY   = "rpg_meta_shards";
const UPGRADES_KEY = "rpg_meta_upgrades";

export const UPGRADE_DEFS: MetaUpgrade[] = [
  // ── Vitality (Max HP) ──────────────────────────────────────────────────────
  { id: "vitality_1", name: "Vitality I",   category: "maxHp",      cost: 15, bonus: 15, description: "Start each run with +15 Max HP" },
  { id: "vitality_2", name: "Vitality II",  category: "maxHp",      cost: 30, bonus: 30, requires: "vitality_1", description: "Start each run with +30 Max HP" },
  { id: "vitality_3", name: "Vitality III", category: "maxHp",      cost: 60, bonus: 70, requires: "vitality_2", description: "Start each run with +70 Max HP" },
  // ── Strength (Attack) ─────────────────────────────────────────────────────
  { id: "strength_1", name: "Strength I",   category: "attack",     cost: 15, bonus: 2, description: "Start each run with +2 Attack" },
  { id: "strength_2", name: "Strength II",  category: "attack",     cost: 30, bonus: 4, requires: "strength_1", description: "Start each run with +4 Attack" },
  { id: "strength_3", name: "Strength III", category: "attack",     cost: 60, bonus: 9, requires: "strength_2", description: "Start each run with +9 Attack" },
  // ── Arcane (Magic) ────────────────────────────────────────────────────────
  { id: "arcane_1",   name: "Arcane I",     category: "magic",      cost: 15, bonus: 2, description: "Start each run with +2 Magic" },
  { id: "arcane_2",   name: "Arcane II",    category: "magic",      cost: 30, bonus: 4, requires: "arcane_1",   description: "Start each run with +4 Magic" },
  { id: "arcane_3",   name: "Arcane III",   category: "magic",      cost: 60, bonus: 9, requires: "arcane_2",   description: "Start each run with +9 Magic" },
  // ── Guard (Defense) ───────────────────────────────────────────────────────
  { id: "guard_1",    name: "Guard I",      category: "defense",    cost: 15, bonus: 2, description: "Start each run with +2 Defense" },
  { id: "guard_2",    name: "Guard II",     category: "defense",    cost: 30, bonus: 4, requires: "guard_1",    description: "Start each run with +4 Defense" },
  { id: "guard_3",    name: "Guard III",    category: "defense",    cost: 60, bonus: 9, requires: "guard_2",    description: "Start each run with +9 Defense" },
  // ── Special ───────────────────────────────────────────────────────────────
  { id: "scholar",    name: "Scholar",      category: "skillPoints", cost: 100, bonus: 1, description: "Gain +1 extra skill point on every level up" },
  { id: "hoarder",    name: "Hoarder",      category: "gold",       cost: 40, bonus: 25, description: "Start each run with 25 gold" },
];

type StartingBonuses = Record<MetaUpgradeCategory, number>;

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
    const def = UPGRADE_DEFS.find((u) => u.id === id);
    if (!def || this.purchased.has(id)) return false;
    if (this.shards < def.cost) return false;
    if (def.requires && !this.purchased.has(def.requires)) return false;
    return true;
  }

  buy(id: string): boolean {
    if (!this.canBuy(id)) return false;
    const def = UPGRADE_DEFS.find((u) => u.id === id)!;
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
      const def = UPGRADE_DEFS.find((u) => u.id === id);
      if (def && def.category !== "skillPoints") b[def.category] += def.bonus;
    }
    return b;
  }

  getLevelUpSkillBonus(): number {
    let bonus = 0;
    for (const id of this.purchased) {
      const def = UPGRADE_DEFS.find((u) => u.id === id);
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
