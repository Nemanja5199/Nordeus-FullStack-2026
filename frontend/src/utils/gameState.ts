import type { GearItem, GearSlot, GearStatBonuses, HeroState, RunConfig, RunSave } from "../types/game";

export function getGearBonuses(equipment: Partial<Record<GearSlot, GearItem>>): GearStatBonuses {
  const bonuses: GearStatBonuses = { attack: 0, defense: 0, magic: 0, maxHp: 0 };
  for (const item of Object.values(equipment)) {
    if (!item) continue;
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

function defaultHero(defaults: {
  maxHp: number;
  attack: number;
  defense: number;
  magic: number;
  defaultMoves: string[];
}): HeroState {
  return {
    level: 1,
    xp: 0,
    currentHp: defaults.maxHp,
    maxHp: defaults.maxHp,
    attack: defaults.attack,
    defense: defaults.defense,
    magic: defaults.magic,
    skillPoints: 0,
    gold: 0,
    equipment: {},
    inventory: [],
    learnedMoves: [...defaults.defaultMoves],
    equippedMoves: [...defaults.defaultMoves],
  };
}

class GameStateManager {
  hero!: HeroState;
  runConfig: RunConfig | null = null;
  runSave: RunSave | null = null;

  // Tree-run progress
  completedNodes: string[] = [];
  currentNode: string | null = null;
  runSeed: number | null = null;

  getSessionId(): string {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  initHero(config: RunConfig): void {
    const raw = localStorage.getItem(HERO_KEY);
    this.hero = raw ? JSON.parse(raw) : defaultHero(config.heroDefaults);
    if (this.hero.currentHp === undefined) this.hero.currentHp = this.hero.maxHp;
    if (this.hero.skillPoints === undefined) this.hero.skillPoints = 0;
    if (this.hero.gold === undefined) this.hero.gold = 0;
    if (this.hero.equipment === undefined) this.hero.equipment = {};
    if (this.hero.inventory === undefined) this.hero.inventory = [];
  }

  saveHero(): void {
    localStorage.setItem(HERO_KEY, JSON.stringify(this.hero));
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

  saveTreeState(): void {
    localStorage.setItem(
      TREE_KEY,
      JSON.stringify({
        completedNodes: this.completedNodes,
        currentNode: this.currentNode,
        runSeed: this.runSeed,
      }),
    );
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

  completeNode(nodeId: string): void {
    if (!this.completedNodes.includes(nodeId)) {
      this.completedNodes.push(nodeId);
    }
    this.currentNode = nodeId;
    this.saveTreeState();
  }

  addXp(amount: number): boolean {
    this.hero.xp += amount;
    const needed = Math.floor(this.hero.level * this.hero.level * 60);
    if (this.hero.xp >= needed) {
      this.levelUp();
      this.saveHero();
      return true;
    }
    this.saveHero();
    return false;
  }

  private levelUp(): void {
    this.hero.level += 1;
    this.hero.xp = 0;
    this.hero.skillPoints = (this.hero.skillPoints ?? 0) + 3;
  }

  spendSkillPoint(stat: "attack" | "defense" | "magic" | "maxHp"): boolean {
    if ((this.hero.skillPoints ?? 0) <= 0) return false;
    const gains = this.runConfig?.heroDefaults.levelUpStats ?? {
      maxHp: 20,
      attack: 3,
      defense: 2,
      magic: 2,
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

  equipItem(item: GearItem): void {
    const displaced = this.hero.equipment[item.slot];
    if (displaced) this.hero.inventory.push(displaced);
    this.hero.equipment[item.slot] = item;
    this.hero.inventory = this.hero.inventory.filter((i) => i.id !== item.id);
    this.saveHero();
  }

  unequipItem(slot: GearSlot): void {
    const item = this.hero.equipment[slot];
    if (!item) return;
    this.hero.inventory.push(item);
    delete this.hero.equipment[slot];
    this.saveHero();
  }

  addToInventory(item: GearItem): void {
    this.hero.inventory.push(item);
    this.saveHero();
  }

  resetHero(config: RunConfig): void {
    this.hero = defaultHero(config.heroDefaults);
    this.saveHero();
  }
}

export const GameState = new GameStateManager();
