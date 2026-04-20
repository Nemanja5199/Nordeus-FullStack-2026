import type { HeroState, RunConfig, RunSave } from "../types/game";

const SESSION_KEY = "rpg_session_id";
const HERO_KEY = "rpg_hero";
const RUN_KEY = "rpg_run";

function defaultHero(defaults: { maxHp: number; attack: number; defense: number; magic: number; defaultMoves: string[] }): HeroState {
  return {
    level: 1,
    xp: 0,
    maxHp: defaults.maxHp,
    attack: defaults.attack,
    defense: defaults.defense,
    magic: defaults.magic,
    learnedMoves: [...defaults.defaultMoves],
    equippedMoves: [...defaults.defaultMoves],
  };
}

class GameStateManager {
  hero!: HeroState;
  runConfig: RunConfig | null = null;
  runSave: RunSave | null = null;

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
  }

  addXp(amount: number): boolean {
    this.hero.xp += amount;
    const needed = this.hero.level * (this.runConfig?.heroDefaults.xpPerLevel ?? 100);
    if (this.hero.xp >= needed) {
      this.levelUp();
      this.saveHero();
      return true;
    }
    this.saveHero();
    return false;
  }

  private levelUp(): void {
    const gains = this.runConfig?.heroDefaults.levelUpStats ?? { maxHp: 20, attack: 3, defense: 2, magic: 2 };
    this.hero.level += 1;
    this.hero.xp = 0;
    this.hero.maxHp += gains.maxHp;
    this.hero.attack += gains.attack;
    this.hero.defense += gains.defense;
    this.hero.magic += gains.magic;
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

  resetHero(config: RunConfig): void {
    this.hero = defaultHero(config.heroDefaults);
    this.saveHero();
  }
}

export const GameState = new GameStateManager();
