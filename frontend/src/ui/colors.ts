// ─── Backgrounds ─────────────────────────────────────────────────────────────
export const BG_DARKEST    = 0x0d0905;  // scene fill (battle, post-battle)
export const BG_PANEL      = 0x1c1008;  // main panel background
export const BG_ROW        = 0x120e06;  // inner row / node fill
export const BG_ROW_MID    = 0x2a1a08;  // XP / HP bar background
export const BG_BTN        = 0x2a1e0a;  // button default fill
export const BG_BTN_HOVER  = 0x3a2a10;  // button hover fill
export const BG_SEPIA      = 0x3a1f05;  // map sand overlay tint

// ─── Map path dots ───────────────────────────────────────────────────────────
export const DOT_PATH_DEFEATED = 0x6ab830;  // bright green — defeated segment
export const DOT_PATH_ACTIVE   = 0xc89040;  // amber — upcoming / locked segment

// ─── Node states ─────────────────────────────────────────────────────────────
export const BG_NODE_DEFEATED = 0x1a2808;
export const BG_NODE_ACTIVE   = 0x2a1a06;
export const BG_NODE_LOCKED   = 0x120e06;

// ─── Battle panels ───────────────────────────────────────────────────────────
export const BG_HERO_BATTLE    = 0x1c3018;
export const BG_MONSTER_BATTLE = 0x301010;

// ─── Borders ─────────────────────────────────────────────────────────────────
export const BORDER_GOLD        = 0x7a5828;  // default panel border
export const BORDER_GOLD_BRIGHT = 0xb88820;  // selected / active highlight
export const BORDER_LOCKED      = 0x4a3818;  // dimmed / locked border
export const BORDER_ROW         = 0x3a2a14;  // inner row border
export const BORDER_DEFEATED    = 0x5a8a2a;  // green defeated border
export const BORDER_HERO_BATTLE = 0x4a8a3a;
export const BORDER_MON_BATTLE  = 0x8a3a3a;

// ─── Text (CSS strings used by Phaser text objects) ──────────────────────────
export const TXT_GOLD       = "#c8a035";  // headers, selected state
export const TXT_GOLD_LIGHT = "#d4b483";  // normal body text
export const TXT_GOLD_MID   = "#a07840";  // secondary / XP text
export const TXT_MUTED      = "#8a7a5a";  // dim / subtext
export const TXT_DARK       = "#3a2808";  // dark-bg label (title stroke fill)
export const TXT_HERO       = "#a8c888";  // hero in battle
export const TXT_MONSTER    = "#c87870";  // monster in battle
export const TXT_DEFEATED   = "#5aaa3a";  // defeated status
export const TXT_LOCKED     = "#4a3418";  // locked status
export const TXT_LOCKED_NAME = "#6a5030"; // locked node name

// ─── Stat bars ───────────────────────────────────────────────────────────────
export const BAR_HP_FILL = 0x8a3a3a;
export const BAR_XP_FILL = 0xb88820;
