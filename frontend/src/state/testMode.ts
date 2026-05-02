// Dev toggle. When on, defaultHero() builds a god-stats hero with full kit.
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
