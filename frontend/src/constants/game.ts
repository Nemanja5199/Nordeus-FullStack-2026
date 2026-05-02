// Gameplay tuning constants — single source of truth for balance numbers.

export const MANA = {
  MAX:    60,
  REGEN:   6,
} as const;

export const POTIONS = {
  HP_HEAL:    40,
  MP_RESTORE: 30,
} as const;

// % of maxHp thresholds for the HP bar colour shift.
export const HP_BAR = {
  HIGH_THRESHOLD: 0.5,
  MID_THRESHOLD:  0.25,
} as const;

// Per-level monster stat scaling: scaleFactor = 1 + MONSTER_LEVEL_SCALING * (level - 1).
export const MONSTER_LEVEL_SCALING = 0.05;

// XP curve: floor(level² × XP_CURVE_FACTOR).
export const XP_CURVE_FACTOR = 60;
