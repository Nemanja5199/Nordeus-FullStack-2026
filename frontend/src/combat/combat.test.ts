import { describe, it, expect } from "vitest";
import { getEffectiveStat, applyMove, tickBuffs, tickDots } from "./combat";
import type { CombatCharacter, MoveConfig } from "../types/game";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChar(overrides: Partial<CombatCharacter> = {}): CombatCharacter {
  return {
    id: "hero",
    name: "Hero",
    hp: 100,
    maxHp: 100,
    baseStats: { attack: 15, defense: 10, magic: 8 },
    activeBuffs: [],
    activeDots: [],
    moves: [],
    ...overrides,
  };
}

function makeMove(overrides: Partial<MoveConfig> = {}): MoveConfig {
  return {
    id: "slash",
    name: "Slash",
    moveType: "physical",
    baseValue: 20,
    effects: [],
    description: "",
    dropChance: 1.0,
    manaCost: 0,
    ...overrides,
  };
}

// ── getEffectiveStat ──────────────────────────────────────────────────────────

describe("getEffectiveStat", () => {
  it("returns base stat when no buffs", () => {
    const char = makeChar();
    expect(getEffectiveStat(char, "attack")).toBe(15);
  });

  it("applies a single buff multiplier", () => {
    const char = makeChar({
      activeBuffs: [{ stat: "attack", multiplier: 1.5, turnsRemaining: 2 }],
    });
    expect(getEffectiveStat(char, "attack")).toBe(Math.floor(15 * 1.5)); // 22
  });

  it("stacks multiple buffs on the same stat multiplicatively", () => {
    const char = makeChar({
      activeBuffs: [
        { stat: "attack", multiplier: 1.5, turnsRemaining: 2 },
        { stat: "attack", multiplier: 1.5, turnsRemaining: 1 },
      ],
    });
    expect(getEffectiveStat(char, "attack")).toBe(Math.floor(15 * 1.5 * 1.5)); // 33
  });

  it("applies a debuff multiplier", () => {
    const char = makeChar({
      activeBuffs: [{ stat: "defense", multiplier: 0.7, turnsRemaining: 2 }],
    });
    expect(getEffectiveStat(char, "defense")).toBe(Math.floor(10 * 0.7)); // 7
  });

  it("buffs on different stats do not interfere", () => {
    const char = makeChar({
      activeBuffs: [{ stat: "magic", multiplier: 2.0, turnsRemaining: 1 }],
    });
    expect(getEffectiveStat(char, "attack")).toBe(15);
    expect(getEffectiveStat(char, "magic")).toBe(16);
  });

  it("never returns less than 1", () => {
    const char = makeChar({
      baseStats: { attack: 1, defense: 1, magic: 1 },
      activeBuffs: [{ stat: "attack", multiplier: 0.0, turnsRemaining: 1 }],
    });
    expect(getEffectiveStat(char, "attack")).toBeGreaterThanOrEqual(1);
  });
});

// ── applyMove — physical ──────────────────────────────────────────────────────

describe("applyMove — physical", () => {
  it("deals damage using formula: floor((baseValue + effAtk) * 0.75 - effDef * 0.5)", () => {
    const attacker = makeChar({ baseStats: { attack: 15, defense: 10, magic: 8 } });
    const defender = makeChar({ hp: 100, baseStats: { attack: 10, defense: 10, magic: 5 } });
    const move = makeMove({ moveType: "physical", baseValue: 20 });

    const result = applyMove(move, attacker, defender);
    const expected = Math.max(1, Math.floor((20 + 15) * 0.75 - 10 * 0.5));
    expect(result.damage).toBe(expected);
    expect(defender.hp).toBe(100 - expected);
  });

  it("deals minimum 1 damage even against high defense", () => {
    const attacker = makeChar({ baseStats: { attack: 1, defense: 10, magic: 1 } });
    const defender = makeChar({ hp: 100, baseStats: { attack: 1, defense: 999, magic: 1 } });
    const move = makeMove({ moveType: "physical", baseValue: 1 });

    const result = applyMove(move, attacker, defender);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });

  it("does not reduce HP below 0", () => {
    const attacker = makeChar({ baseStats: { attack: 100, defense: 1, magic: 1 } });
    const defender = makeChar({ hp: 1, baseStats: { attack: 1, defense: 1, magic: 1 } });
    const move = makeMove({ moveType: "physical", baseValue: 200 });

    applyMove(move, attacker, defender);
    expect(defender.hp).toBe(0);
  });
});

// ── applyMove — magic ─────────────────────────────────────────────────────────

describe("applyMove — magic", () => {
  it("deals damage using formula: floor(baseValue + effMag * 1.1)", () => {
    const attacker = makeChar({ baseStats: { attack: 10, defense: 10, magic: 20 } });
    const defender = makeChar({ hp: 100, baseStats: { attack: 10, defense: 50, magic: 5 } });
    const move = makeMove({ moveType: "magic", baseValue: 28 });

    const result = applyMove(move, attacker, defender);
    const expected = Math.max(1, Math.floor(28 + 20 * 1.1));
    expect(result.damage).toBe(expected);
  });

  it("magic damage ignores defender defense stat", () => {
    const attacker = makeChar({ baseStats: { attack: 10, defense: 10, magic: 10 } });

    const defLow = makeChar({ hp: 200, baseStats: { attack: 1, defense: 1, magic: 1 } });
    const defHigh = makeChar({ hp: 200, baseStats: { attack: 1, defense: 999, magic: 1 } });
    const move = makeMove({ moveType: "magic", baseValue: 20 });

    const r1 = applyMove(move, attacker, defLow);
    attacker.activeBuffs = []; // reset (applyMove is not pure, reset state)
    const attacker2 = makeChar({ baseStats: { attack: 10, defense: 10, magic: 10 } });
    const r2 = applyMove(move, attacker2, defHigh);

    expect(r1.damage).toBe(r2.damage);
  });
});

// ── applyMove — heal ──────────────────────────────────────────────────────────

describe("applyMove — heal", () => {
  it("heals the attacker", () => {
    const attacker = makeChar({
      hp: 60,
      maxHp: 100,
      baseStats: { attack: 10, defense: 10, magic: 8 },
    });
    const defender = makeChar();
    const move = makeMove({ moveType: "heal", baseValue: 15, effects: [] });

    const result = applyMove(move, attacker, defender);
    expect(result.heal).toBeGreaterThan(0);
    expect(attacker.hp).toBeGreaterThan(60);
  });

  it("does not overheal beyond maxHp", () => {
    const attacker = makeChar({
      hp: 99,
      maxHp: 100,
      baseStats: { attack: 10, defense: 10, magic: 8 },
    });
    const defender = makeChar();
    const move = makeMove({ moveType: "heal", baseValue: 50, effects: [] });

    applyMove(move, attacker, defender);
    expect(attacker.hp).toBe(100);
  });

  it("heals minimum 5 HP", () => {
    const attacker = makeChar({ hp: 50, baseStats: { attack: 1, defense: 1, magic: 0 } });
    const defender = makeChar();
    const move = makeMove({ moveType: "heal", baseValue: 0, effects: [] });

    const result = applyMove(move, attacker, defender);
    expect(result.heal).toBeGreaterThanOrEqual(5);
  });
});

// ── applyMove — effects ───────────────────────────────────────────────────────

describe("applyMove — buff/debuff effects", () => {
  it("applies a self buff to the attacker", () => {
    const attacker = makeChar();
    const defender = makeChar();
    const move = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "buff", target: "self", stat: "attack", multiplier: 1.5, turns: 2 }],
    });

    applyMove(move, attacker, defender);
    expect(attacker.activeBuffs).toHaveLength(1);
    expect(attacker.activeBuffs[0]).toMatchObject({
      stat: "attack",
      multiplier: 1.5,
      turnsRemaining: 3,
    });
  });

  it("applies a debuff to the defender", () => {
    const attacker = makeChar();
    const defender = makeChar();
    const move = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "debuff", target: "opponent", stat: "defense", multiplier: 0.7, turns: 2 }],
    });

    applyMove(move, attacker, defender);
    expect(defender.activeBuffs).toHaveLength(1);
    expect(defender.activeBuffs[0]).toMatchObject({
      stat: "defense",
      multiplier: 0.7,
      turnsRemaining: 3,
    });
  });

  it("refreshes buff duration instead of stacking if same stat+multiplier", () => {
    const attacker = makeChar({
      activeBuffs: [{ stat: "attack", multiplier: 1.5, turnsRemaining: 1 }],
    });
    const defender = makeChar();
    const move = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "buff", target: "self", stat: "attack", multiplier: 1.5, turns: 3 }],
    });

    applyMove(move, attacker, defender);
    expect(attacker.activeBuffs).toHaveLength(1);
    expect(attacker.activeBuffs[0].turnsRemaining).toBe(4);
  });
});

describe("applyMove — drain", () => {
  it("heals attacker for 50% of damage dealt (lifesteal)", () => {
    const attacker = makeChar({
      hp: 50,
      maxHp: 100,
      baseStats: { attack: 10, defense: 10, magic: 15 },
    });
    const defender = makeChar({ hp: 100, baseStats: { attack: 10, defense: 5, magic: 5 } });
    const move = makeMove({
      moveType: "magic",
      baseValue: 12,
      effects: [{ type: "drain", target: "self" }],
    });

    const result = applyMove(move, attacker, defender);
    expect(result.heal).toBe(Math.max(1, Math.floor(result.damage * 0.5)));
    expect(attacker.hp).toBe(Math.min(100, 50 + result.heal));
  });

  it("drain heals at least 1 HP even when damage is tiny", () => {
    const attacker = makeChar({
      hp: 50,
      maxHp: 100,
      baseStats: { attack: 1, defense: 1, magic: 1 },
    });
    const defender = makeChar({
      hp: 100,
      baseStats: { attack: 1, defense: 99, magic: 1 },
    });
    const move = makeMove({
      moveType: "magic",
      baseValue: 1,
      effects: [{ type: "drain", target: "self" }],
    });

    const result = applyMove(move, attacker, defender);
    expect(result.heal).toBeGreaterThanOrEqual(1);
  });
});

describe("applyMove — hp_cost", () => {
  it("reduces attacker HP by the cost value", () => {
    const attacker = makeChar({ hp: 80, maxHp: 100 });
    const defender = makeChar();
    const move = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "hp_cost", value: 15 }],
    });

    applyMove(move, attacker, defender);
    expect(attacker.hp).toBe(65);
  });

  it("hp_cost does not kill the attacker (minimum 1 HP)", () => {
    const attacker = makeChar({ hp: 5, maxHp: 100 });
    const defender = makeChar();
    const move = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "hp_cost", value: 100 }],
    });

    applyMove(move, attacker, defender);
    expect(attacker.hp).toBeGreaterThanOrEqual(1);
  });
});

// ── tickBuffs ─────────────────────────────────────────────────────────────────

describe("tickBuffs", () => {
  it("decrements turnsRemaining by 1 each tick", () => {
    const char = makeChar({
      activeBuffs: [{ stat: "attack", multiplier: 1.5, turnsRemaining: 3 }],
    });
    tickBuffs(char);
    expect(char.activeBuffs[0].turnsRemaining).toBe(2);
  });

  it("removes buffs when turnsRemaining reaches 0", () => {
    const char = makeChar({
      activeBuffs: [{ stat: "attack", multiplier: 1.5, turnsRemaining: 1 }],
    });
    tickBuffs(char);
    expect(char.activeBuffs).toHaveLength(0);
  });

  it("keeps buffs with remaining turns and removes expired ones", () => {
    const char = makeChar({
      activeBuffs: [
        { stat: "attack", multiplier: 1.5, turnsRemaining: 1 },
        { stat: "defense", multiplier: 0.7, turnsRemaining: 3 },
      ],
    });
    tickBuffs(char);
    expect(char.activeBuffs).toHaveLength(1);
    expect(char.activeBuffs[0].stat).toBe("defense");
    expect(char.activeBuffs[0].turnsRemaining).toBe(2);
  });

  it("does nothing when no active buffs", () => {
    const char = makeChar();
    tickBuffs(char);
    expect(char.activeBuffs).toHaveLength(0);
  });
});

// ── DOT (damage over time) ────────────────────────────────────────────────────

describe("applyMove with dot effect", () => {
  it("adds an entry to the target's activeDots", () => {
    const attacker = makeChar({ baseStats: { attack: 10, defense: 10, magic: 20 } });
    const defender = makeChar({ hp: 100, maxHp: 100 });
    const decay = makeMove({
      id: "decay_curse",
      moveType: "magic",
      baseValue: 6,
      effects: [{ type: "dot", target: "opponent", value: 4, turns: 4 }],
    });
    applyMove(decay, attacker, defender);
    expect(defender.activeDots).toHaveLength(1);
    // DOTs store turns directly (no +1) so a 4-turn DOT ticks exactly 4 times.
    expect(defender.activeDots[0].turnsRemaining).toBe(4);
    expect(defender.activeDots[0].damagePerTurn).toBe(4);
  });

  it("still applies the upfront magic damage alongside the DOT", () => {
    const attacker = makeChar({ baseStats: { attack: 10, defense: 10, magic: 10 } });
    const defender = makeChar({ hp: 100, maxHp: 100 });
    const decay = makeMove({
      moveType: "magic",
      baseValue: 6,
      effects: [{ type: "dot", target: "opponent", value: 4, turns: 4 }],
    });
    applyMove(decay, attacker, defender);
    expect(defender.hp).toBeLessThan(100);
  });
});

describe("tickDots", () => {
  it("returns 0 and is a no-op on a character with no DOTs", () => {
    const char = makeChar();
    expect(tickDots(char)).toBe(0);
    expect(char.hp).toBe(100);
  });

  it("subtracts damagePerTurn from hp and returns total damage dealt", () => {
    const char = makeChar({ activeDots: [{ damagePerTurn: 4, turnsRemaining: 4 }] });
    const dealt = tickDots(char);
    expect(dealt).toBe(4);
    expect(char.hp).toBe(96);
  });

  it("decrements turnsRemaining and removes expired DOTs", () => {
    const char = makeChar({ activeDots: [{ damagePerTurn: 5, turnsRemaining: 1 }] });
    tickDots(char);
    expect(char.activeDots).toHaveLength(0);
  });

  it("ticks four times for a 'turns: 4' DOT (matches storage convention)", () => {
    // Attacker casts a 4-turn DOT → applyMove stores turnsRemaining = 5.
    const attacker = makeChar();
    const defender = makeChar({ hp: 100 });
    const dot = makeMove({
      moveType: "none",
      baseValue: 0,
      effects: [{ type: "dot", target: "opponent", value: 3, turns: 4 }],
    });
    applyMove(dot, attacker, defender);
    let totalDamage = 0;
    while (defender.activeDots.length > 0) totalDamage += tickDots(defender);
    expect(totalDamage).toBe(12); // 4 ticks × 3 dmg each
  });

  it("clamps hp to 0 (won't go negative)", () => {
    const char = makeChar({ hp: 2, activeDots: [{ damagePerTurn: 10, turnsRemaining: 3 }] });
    tickDots(char);
    expect(char.hp).toBe(0);
  });

  it("sums damage from multiple stacked DOTs in one tick", () => {
    const char = makeChar({
      activeDots: [
        { damagePerTurn: 3, turnsRemaining: 2 },
        { damagePerTurn: 5, turnsRemaining: 2 },
      ],
    });
    expect(tickDots(char)).toBe(8);
    expect(char.hp).toBe(92);
  });
});
