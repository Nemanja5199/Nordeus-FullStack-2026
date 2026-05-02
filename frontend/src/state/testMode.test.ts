import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestMode } from "./testMode";

function makeLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
  // Reset internal cache against the new stubbed storage.
  TestMode.set(false);
});

describe("TestMode toggle", () => {
  it("starts off when nothing is persisted", () => {
    expect(TestMode.isOn()).toBe(false);
  });

  it("set(true) flips the flag and persists it", () => {
    TestMode.set(true);
    expect(TestMode.isOn()).toBe(true);
    expect(localStorage.getItem("rpg_test_mode")).toBe("true");
  });

  it("set(false) clears the persisted key", () => {
    TestMode.set(true);
    TestMode.set(false);
    expect(localStorage.getItem("rpg_test_mode")).toBeNull();
  });

  it("toggle() flips and returns the new state", () => {
    expect(TestMode.toggle()).toBe(true);
    expect(TestMode.isOn()).toBe(true);
    expect(TestMode.toggle()).toBe(false);
    expect(TestMode.isOn()).toBe(false);
  });
});
