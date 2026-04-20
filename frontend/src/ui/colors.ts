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

// ─── Post-battle buttons ─────────────────────────────────────────────────────
export const BG_BTN_SUCCESS = 0x1c2e14;  // green — positive action (Back to Map win)
export const BG_BTN_NEUTRAL = 0x1a1c20;  // grey — neutral action (Replay)
export const BG_BTN_DANGER  = 0x2e1008;  // red — negative action (Try Again)
export const TXT_DEFEAT     = "#8a3a3a";  // defeat title colour

// ─── Move management ─────────────────────────────────────────────────────────
export const BG_MOVE_CARD     = 0x1c1408;  // default move card bg
export const BG_MOVE_EQUIPPED = 0x1a2010;  // learned card bg when already equipped
export const BG_BTN_CLOSE     = 0x1a1a2e;  // close / cancel button

// ─── Stat bars ───────────────────────────────────────────────────────────────
export const BAR_HP_FILL   = 0x8a3a3a;  // monster HP
export const BAR_HERO_HP   = 0x4a8a3a;  // hero HP default
export const BAR_HP_HIGH   = 0x44cc44;  // >50% HP
export const BAR_HP_MID    = 0xddaa00;  // 25-50% HP
export const BAR_HP_LOW    = 0xcc3333;  // <25% HP
export const BAR_XP_FILL   = 0xb88820;
export const BG_BAR_TRACK  = 0x1a1a1a;  // HP bar background track

// ─── Battle log ──────────────────────────────────────────────────────────────
export const TXT_LOG = "#a09070";

// ─── Shop nodes (tree map) ────────────────────────────────────────────────────
export const BG_NODE_SHOP         = 0x0e1e38;
export const BG_NODE_SHOP_DONE    = 0x0a1830;
export const BG_NODE_SHOP_LOCKED  = 0x080e18;
export const BORDER_SHOP          = 0x5090e0;
export const BORDER_SHOP_DONE     = 0x3a6aaa;
export const BORDER_SHOP_LOCKED   = 0x1a2a44;
export const TXT_SHOP             = "#70aaff";
export const TXT_SHOP_DONE        = "#3a6aaa";
export const TXT_SHOP_LOCKED      = "#1a2a44";

// ─── Title stroke (used on light/textured backgrounds) ───────────────────────
export const STROKE_TITLE_DARK    = "#2a1404";
export const BG_TITLE_BAND        = 0x000000;
export const TXT_BOSS             = "#c84a2a";
