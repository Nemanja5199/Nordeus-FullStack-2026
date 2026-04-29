// Persistent dev toggle. When on, defaultHero() in gameState replaces the
// freshly-built hero with god stats + all items + all droppable moves so we
// can iterate on later-game content without grinding through earlier tiers.
const KEY = "rpg_test_mode";

class TestModeManager {
  private cached: boolean | null = null;

  isOn(): boolean {
    if (this.cached === null) {
      this.cached = localStorage.getItem(KEY) === "true";
    }
    return this.cached;
  }

  set(value: boolean): void {
    this.cached = value;
    if (value) {
      localStorage.setItem(KEY, "true");
    } else {
      localStorage.removeItem(KEY);
    }
  }

  toggle(): boolean {
    this.set(!this.isOn());
    return this.isOn();
  }
}

export const TestMode = new TestModeManager();
