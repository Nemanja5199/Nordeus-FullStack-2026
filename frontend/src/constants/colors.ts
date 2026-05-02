// Backgrounds (hex). Includes panels, rows, buttons, node states, cards.
export const BG = {
  DARKEST:           0x0d0905,
  PANEL:             0x1c1008,
  ROW:               0x120e06,
  ROW_MID:           0x2a1a08,
  BTN:               0x2a1e0a,
  BTN_HOVER:         0x3a2a10,
  SEPIA:             0x3a1f05,
  HERO_BATTLE:       0x1c3018,
  MONSTER_BATTLE:    0x301010,
  NODE_DEFEATED:     0x1a2808,
  NODE_ACTIVE:       0x2a1a06,
  NODE_LOCKED:       0x120e06,
  NODE_SHOP:         0x0e1e38,
  NODE_SHOP_DONE:    0x0a1830,
  NODE_SHOP_LOCKED:  0x080e18,
  BTN_SUCCESS:       0x1c2e14,
  BTN_NEUTRAL:       0x1a1c20,
  BTN_DANGER:        0x2e1008,
  BTN_CLOSE:         0x1a1a2e,
  BTN_STAT:          0x2a4a18,
  BTN_STAT_HOVER:    0x3a6a24,
  BTN_BUY:           0x2a1040,
  BTN_BUY_HOVER:     0x3d1a5e,
  MOVE_CARD:         0x1c1408,
  MOVE_EQUIPPED:     0x1a2010,
  CARD_LOCKED:       0x100c08,
  CARD_SELECTED:     0x2a1e08,
  STAT_CARD:         0x1a1408,
  STAT_CARD_AVAIL:   0x1c2a10,
  UPGRADE_AVAILABLE: 0x1a0f2a,
  UPGRADE_PURCHASED: 0x0a1f0a,
  UPGRADE_LOCKED:    0x100c08,
  BAR_TRACK:         0x1a1a1a,
  LOAD_BAR_TRACK:    0x2a2010,
  TITLE_BAND:        0x000000,
  BLACK:             0x000000,
} as const;

// Text colours (CSS strings used by Phaser text objects).
export const TXT = {
  GOLD:          "#c8a035",
  GOLD_LIGHT:    "#d4b483",
  GOLD_MID:      "#a07840",
  GOLD_WARM:     "#c8b078",
  MUTED:         "#8a7a5a",
  DARK:          "#3a2808",
  BLACK:         "#000000",
  HERO:          "#a8c888",
  MONSTER:       "#c87870",
  DEFEATED:      "#5aaa3a",
  DEFEAT:        "#8a3a3a",
  LOCKED:        "#4a3418",
  LOCKED_NAME:   "#6a5030",
  CARD_LOCKED:   "#2a2418",
  CLASS_LOCKED:  "#3a3020",
  COMING_SOON:   "#4a3820",
  MANA:          "#5588ff",
  MANA_LOW:      "#cc4444",
  LOG:           "#a09070",
  LOG_MAGIC:     "#a060e0",
  SHOP:          "#70aaff",
  SHOP_DONE:     "#3a6aaa",
  SHOP_LOCKED:   "#1a2a44",
  BOSS:          "#c84a2a",
  TAGLINE:       "#a09060",
  TIER_BOSS:     "#8a3a3a",
  DUST_MOTE:     "#c87840",
  SKILL_POINTS:  "#70cc50",
  SHARD:         "#c084fc",
  STROKE_TITLE:  "#3a2008",
  STROKE_HEADER: "#4a3010",
  INTENT_ATTACK: "#c85030",
  INTENT_DEBUFF: "#9060c0",
  INTENT_BUFF:   "#c8a035",
  INTENT_HEAL:   "#50aa50",
  MOVE_BUFF:     "#fbbf24",
  MOVE_DEBUFF:   "#fb923c",
  RARITY_EPIC:   "#f97316",
  STAT_ATTACK:   "#ef4444",
  STAT_DEFENSE:  "#9ca3af",
  STAT_MAGIC:    "#a78bfa",
  STAT_HP:       "#4ade80",
} as const;

export const BORDER = {
  GOLD:           0x7a5828,
  GOLD_BRIGHT:    0xb88820,
  LOCKED:         0x4a3818,
  ROW:            0x3a2a14,
  DEFEATED:       0x5a8a2a,
  HERO_BATTLE:    0x4a8a3a,
  MON_BATTLE:     0x8a3a3a,
  SHOP:           0x5090e0,
  SHOP_DONE:      0x3a6aaa,
  SHOP_LOCKED:    0x1a2a44,
  CARD_LOCKED:    0x2a2018,
  STAT_AVAIL:     0x5a8a3a,
  SHARD:          0x9333ea,
  UPGRADE_OWNED:  0x4ade80,
} as const;

// HP / mana / XP bar fills.
export const BAR = {
  HP_FILL:    0x8a3a3a,
  HERO_HP:    0x4a8a3a,
  HP_HIGH:    0x44cc44,
  HP_MID:     0xddaa00,
  HP_LOW:     0xcc3333,
  XP_FILL:    0xb88820,
  MANA_FILL:  0x2255cc,
} as const;

// Map-tree path segments.
export const DOT = {
  PATH_DEFEATED: 0x6ab830,
  PATH_ACTIVE:   0xc89040,
} as const;

// Damage / heal preview overlay on HP bars.
export const HP_GHOST = {
  HERO:    0x8a1a1a,
  MONSTER: 0x3a0808,
} as const;

// One-off tints / small singletons that don't fit a group.
export const TINT_GOLD       = 0xffd700;
export const DUST_MOTE_COLOR = 0xb89050;
export const STROKE_TITLE_DARK = "#2a1404";

// Lookups keyed by gameplay enums.
export const RARITY_COLOR: Record<string, string> = {
  common: TXT.GOLD_MID,
  rare:   TXT.STAT_MAGIC,
  epic:   TXT.RARITY_EPIC,
};

export const RARITY_COLOR_NUM: Record<string, number> = {
  common: 0xa07840,
  rare:   0xa78bfa,
  epic:   0xf97316,
};

export const STAT_COLOR: Record<string, string> = {
  attack:  TXT.STAT_ATTACK,
  defense: TXT.STAT_DEFENSE,
  magic:   TXT.STAT_MAGIC,
  maxHp:   TXT.STAT_HP,
};
