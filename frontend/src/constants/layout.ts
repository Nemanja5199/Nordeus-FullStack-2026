// Layout sizing — card sizes, grid dims, panel sizes, spacing.

export const MOVE_CARD = {
  W:       270,
  H:        58,
  GAP:      12,
  START_Y: 200,
} as const;

export const UPGRADE_CARD = {
  W:   220,
  H:   150,
  GAP:  16,
} as const;

export const EQ_CARD = {
  W:         260,
  H:          64,
  GAP:        12,
  START_Y:   170,
  ICON_SIZE:  32,
} as const;

export const INV_GRID = {
  CELL:    58,
  GAP:      8,
  COLS:     5,
  START_Y: 170,
} as const;

export const HERO_PANEL = {
  W:   260,
  H:   690,
  GAP:  16,
} as const;

export const BATTLE = {
  PANEL_W:   270,
  LOG_LINES:   3,
} as const;

// Map tree nodes (regular + boss).
export const NODE = {
  W:            96,
  H:            84,
  BOSS_W:      120,
  BOSS_H:       98,
  HOVER_SCALE: 1.35,
} as const;
