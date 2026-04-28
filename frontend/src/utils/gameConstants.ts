// Gameplay tuning constants — single source of truth for balance numbers.
// UI layout values stay scene-local; this file is only for game balance.

// Mana economy
export const MANA_MAX = 60;
export const MANA_REGEN = 6;

// Potions (free action, 1 use per turn, lost on death)
export const HP_POTION_HEAL = 40;
export const MP_POTION_RESTORE = 30;

// Monster scaling: stats grow per hero level above 1
export const MONSTER_LEVEL_SCALING = 0.05;

// HP bar color thresholds (% of maxHp)
export const HP_BAR_HIGH_THRESHOLD = 0.5;
export const HP_BAR_MID_THRESHOLD = 0.25;

// XP curve: `floor(level² × XP_CURVE_FACTOR)` — souls-like, grindy by design
export const XP_CURVE_FACTOR = 60;
