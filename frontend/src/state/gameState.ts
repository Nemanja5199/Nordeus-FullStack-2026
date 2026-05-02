import type { GearItem, GearSlot, GearStatBonuses, HeroClass, HeroState, MoveConfig, RunConfig, RunSave } from "../types/game";
import { XP_CURVE_FACTOR } from "../constants";
import { MetaProgress } from "./metaProgress";
import { Cloud } from "./cloudSync";

export function getGearBonuses(
  equipment: Partial<Record<GearSlot, string>>,
  items: Record<string, GearItem>,
): GearStatBonuses {
  const bonuses: GearStatBonuses = { attack: 0, defense: 0, magic: 0, maxHp: 0 };
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    const item = items[itemId];
    if (!item) {
      console.warn(`[GameState] equipped item not in runConfig: ${itemId}`);
      continue;
    }
    bonuses.attack = (bonuses.attack ?? 0) + (item.statBonuses.attack ?? 0);
    bonuses.defense = (bonuses.defense ?? 0) + (item.statBonuses.defense ?? 0);
    bonuses.magic = (bonuses.magic ?? 0) + (item.statBonuses.magic ?? 0);
    bonuses.maxHp = (bonuses.maxHp ?? 0) + (item.statBonuses.maxHp ?? 0);
  }
  return bonuses;
}

const SESSION_KEY = "rpg_session_id";
const HERO_KEY = "rpg_hero";
const RUN_KEY = "rpg_run";
const TREE_KEY = "rpg_tree_state";
const CLASS_KEY = "rpg_selected_class";

// Bump on non-additive hero shape changes; add a migrateHero case per version.
export const SAVE_VERSION = 1;

type PersistedHero = HeroState & { saveVersion?: number };

export const POTION_PRICE = {
  HP:   18,
  MANA: 21,
} as const;

function defaultHero(config: RunConfig, cls: HeroClass): HeroState {
  const defaults = config.heroClasses[cls];
  const meta = MetaProgress.getStartingBonuses();
  const hero: HeroState = {
    level: 1,
    xp: 0,
    currentHp: defaults.maxHp + meta.maxHp,
    maxHp: defaults.maxHp + meta.maxHp,
    attack: defaults.attack + meta.attack,
    defense: defaults.defense + meta.defense,
    magic: defaults.magic + meta.magic,
    skillPoints: meta.skillPoints,
    gold: meta.gold,
    equipment: {},
    inventory: [],
    learnedMoves: [...defaults.defaultMoves],
    equippedMoves: [...defaults.defaultMoves],
    hpPotions: 0,
    manaPotions: 0,
  };
  return hero;
}

class GameStateManager {
  hero!: HeroState;
  runConfig: RunConfig | null = null;
  runSave: RunSave | null = null;

  completedNodes: string[] = [];
  currentNode: string | null = null;
  runSeed: number | null = null;

  selectedClass: HeroClass = "knight";

  getSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  loadSelectedClass(): void {
    const raw = localStorage.getItem(CLASS_KEY);
    this.selectedClass = (raw === "knight" || raw === "mage") ? raw : "knight";
  }

  setSelectedClass(cls: HeroClass): void {
    this.selectedClass = cls;
    localStorage.setItem(CLASS_KEY, cls);
  }

  initHero(config: RunConfig): void {
    const raw = localStorage.getItem(HERO_KEY);
    if (!raw) {
      this.hero = defaultHero(config, this.selectedClass);
      return;
    }
    this.hero = this.migrateHero(JSON.parse(raw));
  }

  private migrateHero(saved: PersistedHero): HeroState {
    if (saved.saveVersion !== undefined && saved.saveVersion !== SAVE_VERSION) {
      console.warn(`[GameState] migrating hero save from v${saved.saveVersion} to v${SAVE_VERSION}`);
    }
    return {
      level: saved.level,
      xp: saved.xp,
      currentHp: saved.currentHp ?? saved.maxHp,
      maxHp: saved.maxHp,
      attack: saved.attack,
      defense: saved.defense,
      magic: saved.magic,
      skillPoints: saved.skillPoints ?? 0,
      gold: saved.gold ?? 0,
      equipment: saved.equipment ?? {},
      inventory: saved.inventory ?? [],
      learnedMoves: saved.learnedMoves,
      equippedMoves: saved.equippedMoves,
      hpPotions: saved.hpPotions ?? 0,
      manaPotions: saved.manaPotions ?? 0,
    };
  }

  saveHero(): void {
    const persisted: PersistedHero = { ...this.hero, saveVersion: SAVE_VERSION };
    localStorage.setItem(HERO_KEY, JSON.stringify(persisted));
    Cloud.pushDebounced();
  }

  saveRun(run: RunSave): void {
    this.runSave = run;
    localStorage.setItem(RUN_KEY, JSON.stringify(run));
  }

  loadRun(): RunSave | null {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clearRun(): void {
    this.runSave = null;
    localStorage.removeItem(RUN_KEY);
    this.clearTreeState();
  }

  // Defeat path: keeps the same map (runSeed) so CONTINUE resumes here.
  resetRunProgress(): void {
    this.runSave = null;
    localStorage.removeItem(RUN_KEY);
    this.completedNodes = [];
    this.currentNode = null;
    this.saveTreeState();
  }

  saveTreeState(): void {
    localStorage.setItem(TREE_KEY, JSON.stringify({
      completedNodes: this.completedNodes,
      currentNode: this.currentNode,
      runSeed: this.runSeed,
    }));
  }

  loadTreeState(): void {
    const raw = localStorage.getItem(TREE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      this.completedNodes = saved.completedNodes ?? [];
      this.currentNode = saved.currentNode ?? null;
      this.runSeed = saved.runSeed ?? null;
    } else {
      this.completedNodes = [];
      this.currentNode = null;
      this.runSeed = null;
    }
  }

  clearTreeState(): void {
    this.completedNodes = [];
    this.currentNode = null;
    this.runSeed = null;
    localStorage.removeItem(TREE_KEY);
  }

  // Replay must not advance the frontier — currentNode gates which next-tier
  // nodes are unlocked, so overwriting it on replay would lock them.
  completeNode(nodeId: string): void {
    if (!this.completedNodes.includes(nodeId)) {
      this.completedNodes.push(nodeId);
      this.currentNode = nodeId;
    }
    this.saveTreeState();
  }

  addXp(amount: number): boolean {
    this.hero.xp += amount;
    let leveled = false;
    let needed = Math.floor(this.hero.level * this.hero.level * XP_CURVE_FACTOR);
    while (this.hero.xp >= needed) {
      this.hero.xp -= needed;
      this.levelUp();
      leveled = true;
      needed = Math.floor(this.hero.level * this.hero.level * XP_CURVE_FACTOR);
    }
    this.saveHero();
    return leveled;
  }

  private levelUp(): void {
    this.hero.level += 1;
    this.hero.skillPoints = (this.hero.skillPoints ?? 0) + 1 + MetaProgress.getLevelUpSkillBonus();
  }

  spendSkillPoint(stat: "attack" | "defense" | "magic" | "maxHp"): boolean {
    if ((this.hero.skillPoints ?? 0) <= 0) return false;
    const gains = this.runConfig?.heroClasses[this.selectedClass].levelUpStats ?? {
      maxHp: 8, attack: 2, defense: 2, magic: 3,
    };
    if (stat === "maxHp") {
      this.hero.maxHp += gains.maxHp;
      this.hero.currentHp = Math.min(this.hero.currentHp + gains.maxHp, this.hero.maxHp);
    } else {
      this.hero[stat] += gains[stat];
    }
    this.hero.skillPoints -= 1;
    this.saveHero();
    return true;
  }

  learnMove(moveId: string): void {
    if (!this.hero.learnedMoves.includes(moveId)) {
      this.hero.learnedMoves.push(moveId);
      this.saveHero();
    }
  }

  equipMove(slot: number, moveId: string): void {
    if (this.hero.learnedMoves.includes(moveId) && slot >= 0 && slot < 4) {
      this.hero.equippedMoves[slot] = moveId;
      this.saveHero();
    }
  }

  equipItem(itemId: string): void {
    const item = this.runConfig!.items[itemId];
    if (!item) return;
    const displaced = this.hero.equipment[item.slot];
    if (displaced) this.hero.inventory.push(displaced);
    this.hero.equipment[item.slot] = itemId;
    this.hero.inventory = this.hero.inventory.filter((id) => id !== itemId);
    this.saveHero();
  }

  unequipItem(slot: GearSlot): void {
    const itemId = this.hero.equipment[slot];
    if (!itemId) return;
    this.hero.inventory.push(itemId);
    delete this.hero.equipment[slot];
    this.saveHero();
  }

  addToInventory(itemId: string): void {
    this.hero.inventory.push(itemId);
    this.saveHero();
  }

  addHpPotion(n: number): void {
    this.hero.hpPotions = (this.hero.hpPotions ?? 0) + n;
    this.saveHero();
  }

  addManaPotion(n: number): void {
    this.hero.manaPotions = (this.hero.manaPotions ?? 0) + n;
    this.saveHero();
  }

  useHpPotion(): boolean {
    if ((this.hero.hpPotions ?? 0) <= 0) return false;
    this.hero.hpPotions -= 1;
    this.saveHero();
    return true;
  }

  useManaPotion(): boolean {
    if ((this.hero.manaPotions ?? 0) <= 0) return false;
    this.hero.manaPotions -= 1;
    this.saveHero();
    return true;
  }

  // Shop tier gating: lv 1 → tier 1, lv 3 → tier 2, lv 6 → tier 3.
  unlockedTier(): 1 | 2 | 3 {
    const lv = this.hero.level;
    if (lv >= 6) return 3;
    if (lv >= 3) return 2;
    return 1;
  }

  isItemOwned(itemId: string): boolean {
    if (Object.values(this.hero.equipment ?? {}).includes(itemId)) return true;
    return (this.hero.inventory ?? []).includes(itemId);
  }

  canBuyItem(itemId: string): boolean {
    const item = this.runConfig?.items[itemId];
    if (!item) return false;
    if (this.isItemOwned(itemId)) return false;
    if (item.tier > this.unlockedTier()) return false;
    return (this.hero.gold ?? 0) >= item.cost;
  }

  buyItem(itemId: string): boolean {
    if (!this.canBuyItem(itemId)) return false;
    const item = this.runConfig!.items[itemId];
    this.hero.gold = (this.hero.gold ?? 0) - item.cost;
    this.hero.inventory.push(itemId);
    this.saveHero();
    return true;
  }

  buyHpPotion(): boolean {
    if ((this.hero.gold ?? 0) < POTION_PRICE.HP) return false;
    this.hero.gold -= POTION_PRICE.HP;
    this.hero.hpPotions = (this.hero.hpPotions ?? 0) + 1;
    this.saveHero();
    return true;
  }

  buyManaPotion(): boolean {
    if ((this.hero.gold ?? 0) < POTION_PRICE.MANA) return false;
    this.hero.gold -= POTION_PRICE.MANA;
    this.hero.manaPotions = (this.hero.manaPotions ?? 0) + 1;
    this.saveHero();
    return true;
  }

  resetHero(config: RunConfig): void {
    this.hero = defaultHero(config, this.selectedClass);
    this.saveHero();
  }

  // Post-defeat "Fight Again": fresh map seed + reset hero, but
  // MetaProgress (shards, upgrades) is in a separate store and survives.
  // saveTreeState here is required so MainMenu sees a save on refresh —
  // TreeMapScene's lazy save only fires when runSeed was null on entry.
  startFreshRun(config: RunConfig): void {
    this.clearRun();
    this.runConfig = config;
    this.runSeed = config.seed;
    this.saveTreeState();
    this.resetHero(config);
  }

  // Returns undefined + warns on missing ids, so a stale moveId/itemId in
  // localStorage degrades gracefully instead of crashing on `.name`.
  getMove(moveId: string): MoveConfig | undefined {
    const move = this.runConfig?.moves[moveId];
    if (!move) console.warn(`[GameState] unknown move id: ${moveId}`);
    return move;
  }

  getItem(itemId: string): GearItem | undefined {
    const item = this.runConfig?.items[itemId];
    if (!item) console.warn(`[GameState] unknown item id: ${itemId}`);
    return item;
  }
}

export const GameState = new GameStateManager();
