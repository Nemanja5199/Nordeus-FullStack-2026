import Phaser from "phaser";
import { FONT_LG, FONT_MD, FONT_BODY, FONT_SM } from "../ui/typography";
import { BATTLE_PANEL_W as PANEL_W, BATTLE_LOG_LINES as LOG_LINES } from "../ui/layout";
import type { CombatCharacter, MoveConfig, MonsterConfig } from "../types/game";
import { applyMove, tickBuffs, getEffectiveStat, hasSimilarMove } from "../utils/combat";
import { GameState, getGearBonuses } from "../utils/gameState";
import { MetaProgress } from "../utils/metaProgress";
import { api } from "../services/api";
import { HERO_FRAME, MONSTER_FRAMES } from "../utils/spriteFrames";
import {
  BG_DARKEST,
  BG_HERO_BATTLE,
  BG_MONSTER_BATTLE,
  BG_MOVE_CARD,
  BG_BTN_HOVER,
  BG_PANEL,
  BORDER_HERO_BATTLE,
  BORDER_MON_BATTLE,
  BORDER_LOCKED,
  BORDER_GOLD,
  BORDER_GOLD_BRIGHT,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_MID,
  TXT_MUTED,
  TXT_HERO,
  TXT_MONSTER,
  BAR_HP_FILL,
  BAR_HERO_HP,
  BAR_HP_HIGH,
  BAR_HP_MID,
  BAR_HP_LOW,
  BAR_MANA_FILL,
  TXT_MANA,
  TXT_MANA_LOW,
  BG_BAR_TRACK,
  HP_GHOST_HERO,
  HP_GHOST_MONSTER,
  TXT_INTENT_ATTACK,
  TXT_INTENT_BUFF,
  TXT_INTENT_DEBUFF,
  TXT_INTENT_HEAL,
  TXT_LOG_MAGIC,
  TXT_DUST_MOTE,
} from "../ui/colors";

interface BattleData {
  monster: MonsterConfig;
  monsterIndex: number;
  defeatedIds: string[];
  sourceScene?: string;
  nodeId?: string;
  levelBand?: { min: number; max: number };
}

const BAR_W = PANEL_W - 24;

export class BattleScene extends Phaser.Scene {
  private hero!: CombatCharacter;
  private monster!: CombatCharacter;
  private monsterCfg!: MonsterConfig;
  private monsterIndex!: number;
  private defeatedIds!: string[];
  private sourceScene!: string;
  private nodeId!: string | undefined;
  private monsterLevel = 1;
  private turnNumber = 0;
  private busy = false;

  // Mana
  private heroMana = 60;
  private readonly MANA_MAX = 60;
  private readonly MANA_REGEN = 6;
  private heroManaBarLeft!: number;

  // Potions (free action, 1 per turn)
  private readonly HP_POTION_HEAL = 40;
  private readonly MP_POTION_RESTORE = 30;
  private usedPotionThisTurn = false;
  private potionButtons: Array<{
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Rectangle;
    txt: Phaser.GameObjects.Text;
  }> = [];

  // UI
  private heroHpFill!: Phaser.GameObjects.Rectangle;
  private heroManaFill!: Phaser.GameObjects.Rectangle;
  private heroManaText!: Phaser.GameObjects.Text;
  private monsterHpFill!: Phaser.GameObjects.Rectangle;
  private heroHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private heroStatsText!: Phaser.GameObjects.Text;
  private heroBuffText!: Phaser.GameObjects.Text;
  private monsterBuffText!: Phaser.GameObjects.Text;
  private monsterIntentText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private logLines: Phaser.GameObjects.Text[] = [];
  private logColors: string[] = [];
  private moveButtons: Array<{
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Rectangle;
    nameTxt: Phaser.GameObjects.Text;
    typeTxt: Phaser.GameObjects.Text;
    costTxt: Phaser.GameObjects.Text;
  }> = [];
  private monsterIntentMoveId: string | null = null;
  private monsterMoveHistory: string[] = [];

  // HP preview ghosts
  private heroHpGhost!: Phaser.GameObjects.Rectangle;
  private monsterHpGhost!: Phaser.GameObjects.Rectangle;
  private heroBarLeft!: number;
  private heroBarY!: number;
  private monsterBarLeft!: number;
  private monsterBarY!: number;

  constructor() {
    super("BattleScene");
  }

  create(data: BattleData) {
    this.busy = false;
    this.turnNumber = 0;
    this.heroMana = this.MANA_MAX;
    this.moveButtons = [];
    this.potionButtons = [];
    this.usedPotionThisTurn = false;
    this.logLines = [];
    this.logColors = [];
    this.monsterIntentMoveId = null;

    this.monsterCfg = data.monster;
    this.monsterIndex = data.monsterIndex;
    this.defeatedIds = data.defeatedIds ?? [];
    this.sourceScene = data.sourceScene ?? "TreeMapScene";
    this.nodeId = data.nodeId;

    const hs = GameState.hero;
    const gear = getGearBonuses(hs.equipment ?? {}, GameState.runConfig!.items);
    const effMaxHp = hs.maxHp + (gear.maxHp ?? 0);
    this.hero = {
      id: "hero",
      name: "Knight",
      hp: effMaxHp,
      maxHp: effMaxHp,
      baseStats: {
        attack: hs.attack + (gear.attack ?? 0),
        defense: hs.defense + (gear.defense ?? 0),
        magic: hs.magic + (gear.magic ?? 0),
      },
      activeBuffs: [],
      moves: hs.equippedMoves,
    };

    const ms = this.monsterCfg.stats;
    const heroLevel = GameState.hero.level;
    const band = data.levelBand ?? { min: 1, max: 15 };
    this.monsterLevel = Math.max(band.min, Math.min(band.max, heroLevel));
    const scaleFactor = 1 + 0.05 * (this.monsterLevel - 1);
    const scaledHp = Math.floor(ms.hp * scaleFactor);
    this.monster = {
      id: this.monsterCfg.id,
      name: this.monsterCfg.name,
      hp: scaledHp,
      maxHp: scaledHp,
      baseStats: {
        attack: Math.floor(ms.attack * scaleFactor),
        defense: Math.floor(ms.defense * scaleFactor),
        magic: Math.floor(ms.magic * scaleFactor),
      },
      activeBuffs: [],
      moves: this.monsterCfg.moves,
    };

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);

    this.buildHeroPanel(width, height);
    this.buildMonsterPanel(width, height);
    this.buildStatusBar(width, height);
    this.buildPotionButtons(width, height);
    this.buildMoveButtons(width, height);
    this.buildBattleLog(width, height);

    this.setStatus("Your turn — choose a move!");
    void this.prefetchMonsterIntent();
  }

  // ── Hero panel ───────────────────────────────────────────────────────────

  private buildHeroPanel(width: number, height: number) {
    const panelH = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.2;

    this.add
      .rectangle(cx, panelTop + panelH / 2, PANEL_W, panelH, BG_HERO_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER_HERO_BATTLE);

    this.add
      .text(cx, panelTop + 20, `Knight  Lv.${GameState.hero.level}`, {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_HERO,
      })
      .setOrigin(0.5);

    this.add
      .image(cx, panelTop + panelH * 0.42, HERO_FRAME.key, HERO_FRAME.frame)
      .setScale(5)
      .setOrigin(0.5);

    // Live effective stats (updated each turn)
    this.heroStatsText = this.add
      .text(cx, panelTop + panelH * 0.62, "", {
        fontSize: FONT_BODY,
        color: TXT_GOLD_LIGHT,
        align: "center",
      })
      .setOrigin(0.5);

    // HP bar
    const barY = panelTop + panelH * 0.70;
    this.heroBarLeft = cx - BAR_W / 2;
    this.heroBarY = barY;
    this.add.rectangle(cx, barY, BAR_W, 14, BG_BAR_TRACK).setOrigin(0.5);
    this.heroHpFill = this.add
      .rectangle(this.heroBarLeft, barY, BAR_W, 14, BAR_HERO_HP)
      .setOrigin(0, 0.5);
    this.heroHpGhost = this.add
      .rectangle(this.heroBarLeft, barY, 0, 14, HP_GHOST_HERO, 0.75)
      .setOrigin(0, 0.5);
    this.heroHpText = this.add
      .text(cx, barY + 16, "", {
        fontSize: FONT_BODY,
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0.5);

    // Mana bar
    const manaBarY = panelTop + panelH * 0.81;
    this.heroManaBarLeft = cx - BAR_W / 2;
    this.add.rectangle(cx, manaBarY, BAR_W, 10, BG_BAR_TRACK).setOrigin(0.5);
    this.heroManaFill = this.add
      .rectangle(this.heroManaBarLeft, manaBarY, BAR_W, 10, BAR_MANA_FILL)
      .setOrigin(0, 0.5);
    this.heroManaText = this.add
      .text(cx, manaBarY + 14, "", {
        fontSize: FONT_BODY,
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0.5);

    this.heroBuffText = this.add
      .text(cx, panelTop + panelH * 0.93, "", {
        fontSize: FONT_SM,
        color: TXT_GOLD_MID,
        wordWrap: { width: PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    this.updateHeroHp();
  }

  // ── Monster panel ────────────────────────────────────────────────────────

  private buildMonsterPanel(width: number, height: number) {
    const panelH = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.8;

    this.add
      .rectangle(cx, panelTop + panelH / 2, PANEL_W, panelH, BG_MONSTER_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER_MON_BATTLE);

    this.add
      .text(cx, panelTop + 20, this.monsterCfg.name, {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_MONSTER,
      })
      .setOrigin(0.5);

    const monsterFrame = MONSTER_FRAMES[this.monsterCfg.id];
    if (monsterFrame) {
      this.add
        .image(cx, panelTop + panelH * 0.42, monsterFrame.key, monsterFrame.frame)
        .setScale(-5, 5)
        .setOrigin(0.5);
    }

    // Monster stats scaled to hero level
    this.add
      .text(
        cx,
        panelTop + panelH * 0.62,
        `ATK ${this.monster.baseStats.attack}   DEF ${this.monster.baseStats.defense}   MAG ${this.monster.baseStats.magic}`,
        {
          fontSize: FONT_BODY,
          color: TXT_GOLD_LIGHT,
          align: "center",
        },
      )
      .setOrigin(0.5);

    // HP bar
    const barY = panelTop + panelH * 0.72;
    this.monsterBarLeft = cx - BAR_W / 2;
    this.monsterBarY = barY;
    this.add.rectangle(cx, barY, BAR_W, 14, BG_BAR_TRACK).setOrigin(0.5);
    this.monsterHpFill = this.add
      .rectangle(this.monsterBarLeft, barY, BAR_W, 14, BAR_HP_FILL)
      .setOrigin(0, 0.5);
    this.monsterHpGhost = this.add
      .rectangle(this.monsterBarLeft, barY, 0, 14, HP_GHOST_MONSTER, 0.85)
      .setOrigin(0, 0.5);
    this.monsterHpText = this.add
      .text(cx, barY + 18, "", {
        fontSize: FONT_BODY,
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0.5);

    // Intent row — what the monster plans to do this turn
    this.monsterIntentText = this.add
      .text(cx, panelTop + panelH * 0.86, "", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_MUTED,
        wordWrap: { width: PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    // Active buffs/debuffs
    this.monsterBuffText = this.add
      .text(cx, panelTop + panelH * 0.94, "", {
        fontSize: FONT_SM,
        color: TXT_DUST_MOTE,
        wordWrap: { width: PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    this.updateMonsterHp();
  }

  // ── Status bar ───────────────────────────────────────────────────────────

  private buildStatusBar(width: number, height: number) {
    const y = height * 0.66;
    this.add.rectangle(width / 2, y, width - 20, 38, BG_PANEL, 0.92).setStrokeStyle(1, BORDER_GOLD);
    this.statusText = this.add
      .text(width / 2, y, "", {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
      })
      .setOrigin(0.5);
  }

  private setStatus(msg: string) {
    this.statusText.setText(msg);
  }

  // ── Move buttons ─────────────────────────────────────────────────────────

  private buildMoveButtons(width: number, height: number) {
    const moves = this.hero.moves;
    const btnW = 240;
    const btnH = 54;
    const btnGap = 14;
    const totalW = moves.length * btnW + (moves.length - 1) * btnGap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const btnY = height * 0.77;
    const descY = height * 0.71;

    this.descText = this.add
      .text(width / 2, descY, "", {
        fontSize: FONT_BODY,
        color: TXT_GOLD_MID,
        wordWrap: { width: width - 40 },
        align: "center",
      })
      .setOrigin(0.5);

    moves.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const x = startX + i * (btnW + btnGap);
      const container = this.add.container(x, btnY);
      const cost = move.manaCost ?? 0;

      const bg = this.add
        .rectangle(0, 0, btnW, btnH, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);
      const nameTxt = this.add
        .text(0, -12, move.name, {
          fontSize: FONT_MD,
          fontFamily: "EnchantedLand",
          color: TXT_GOLD_LIGHT,
        })
        .setOrigin(0.5);
      const typeTxt = this.add
        .text(cost > 0 ? -20 : 0, 10, `[${move.moveType}]`, {
          fontSize: FONT_SM,
          color: TXT_GOLD_MID,
        })
        .setOrigin(0.5);
      const costTxt = this.add
        .text(cost > 0 ? 32 : 0, 10, cost > 0 ? `${cost} MP` : "", {
          fontSize: FONT_SM,
          color: TXT_MANA,
        })
        .setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (this.busy) return;
        const canAfford = this.heroMana >= cost;
        if (!canAfford) return;
        bg.setFillStyle(BG_BTN_HOVER);
        bg.setStrokeStyle(1, BORDER_GOLD_BRIGHT);
        nameTxt.setColor(TXT_GOLD);
        this.descText.setText(this.buildMoveTooltip(moveId) || move.description);
        this.showMovePreview(moveId);
      });
      bg.on("pointerout", () => {
        bg.setFillStyle(BG_MOVE_CARD);
        bg.setStrokeStyle(1, BORDER_LOCKED);
        nameTxt.setColor(TXT_GOLD_LIGHT);
        this.descText.setText("");
        this.hideMovePreview();
      });
      bg.on("pointerdown", () => {
        if (this.heroMana < cost) return;
        this.handlePlayerMove(moveId);
      });

      container.add([bg, nameTxt, typeTxt, costTxt]);
      this.moveButtons.push({ container, bg, nameTxt, typeTxt, costTxt });
    });
  }

  private setButtonsEnabled(enabled: boolean) {
    this.moveButtons.forEach(({ bg, nameTxt }) => {
      bg.setAlpha(enabled ? 1 : 0.4);
      if (!enabled) {
        bg.setFillStyle(BG_MOVE_CARD);
        bg.setStrokeStyle(1, BORDER_LOCKED);
        nameTxt.setColor(TXT_GOLD_LIGHT);
        bg.disableInteractive();
      } else {
        bg.setInteractive({ useHandCursor: true });
      }
    });
    this.updatePotionButtons();
  }

  // ── Potion buttons ───────────────────────────────────────────────────────

  private buildPotionButtons(width: number, height: number) {
    const btnW = 130;
    const btnH = 40;
    const gap = 18;
    const totalW = btnW * 2 + gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const y = height * 0.85;

    const make = (i: number, iconKey: string, count: number, onUse: () => void) => {
      const x = startX + i * (btnW + gap);
      const container = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, btnW, btnH, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);
      const icon = this.add.image(-btnW / 2 + 22, 0, iconKey).setScale(0.85).setOrigin(0.5);
      const txt = this.add
        .text(8, 0, `× ${count}`, {
          fontSize: FONT_BODY,
          fontFamily: "EnchantedLand",
          color: TXT_GOLD_LIGHT,
        })
        .setOrigin(0, 0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        bg.setFillStyle(BG_BTN_HOVER);
        bg.setStrokeStyle(1, BORDER_GOLD_BRIGHT);
        txt.setColor(TXT_GOLD);
      });
      bg.on("pointerout", () => {
        bg.setFillStyle(BG_MOVE_CARD);
        bg.setStrokeStyle(1, BORDER_LOCKED);
        txt.setColor(TXT_GOLD_LIGHT);
      });
      bg.on("pointerdown", onUse);
      container.add([bg, icon, txt]);
      this.potionButtons.push({ container, bg, txt });
    };

    make(0, "potion_hp", GameState.hero.hpPotions ?? 0, () => this.useHpPotion());
    make(1, "potion_mp", GameState.hero.manaPotions ?? 0, () => this.useManaPotion());
    this.updatePotionButtons();
  }

  private canUseHpPotion(): boolean {
    return (
      !this.busy &&
      !this.usedPotionThisTurn &&
      (GameState.hero.hpPotions ?? 0) > 0 &&
      this.hero.hp < this.hero.maxHp
    );
  }

  private canUseManaPotion(): boolean {
    return (
      !this.busy &&
      !this.usedPotionThisTurn &&
      (GameState.hero.manaPotions ?? 0) > 0 &&
      this.heroMana < this.MANA_MAX
    );
  }

  private useHpPotion() {
    if (!this.canUseHpPotion()) return;
    if (!GameState.useHpPotion()) return;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + this.HP_POTION_HEAL);
    GameState.hero.currentHp = this.hero.hp;
    this.usedPotionThisTurn = true;
    this.pushLog(`You drink an HP potion (+${this.HP_POTION_HEAL} HP).`);
    this.updateHeroHp();
    this.updatePotionButtons();
  }

  private useManaPotion() {
    if (!this.canUseManaPotion()) return;
    if (!GameState.useManaPotion()) return;
    this.heroMana = Math.min(this.MANA_MAX, this.heroMana + this.MP_POTION_RESTORE);
    this.usedPotionThisTurn = true;
    this.pushLog(`You drink a mana potion (+${this.MP_POTION_RESTORE} MP).`);
    this.updateHeroMana();
    this.updatePotionButtons();
  }

  private updatePotionButtons() {
    const counts = [GameState.hero.hpPotions ?? 0, GameState.hero.manaPotions ?? 0];
    const enabled = [this.canUseHpPotion(), this.canUseManaPotion()];
    this.potionButtons.forEach(({ bg, txt }, i) => {
      txt.setText(`× ${counts[i]}`);
      bg.setAlpha(enabled[i] ? 1 : 0.4);
      if (enabled[i]) {
        bg.setInteractive({ useHandCursor: true });
      } else {
        bg.disableInteractive();
        bg.setFillStyle(BG_MOVE_CARD);
        bg.setStrokeStyle(1, BORDER_LOCKED);
        txt.setColor(TXT_GOLD_LIGHT);
      }
    });
  }

  // ── Battle log ───────────────────────────────────────────────────────────

  private buildBattleLog(width: number, height: number) {
    const startY = height * 0.89;
    const lineH = 24;
    this.add.rectangle(
      width / 2,
      startY + (LOG_LINES * lineH) / 2,
      width * 0.7,
      LOG_LINES * lineH + 14,
      BG_DARKEST,
      0.7,
    );

    for (let i = 0; i < LOG_LINES; i++) {
      this.logLines.push(
        this.add
          .text(width / 2, startY + i * lineH, "", {
            fontSize: FONT_MD,
            color: TXT_GOLD_LIGHT,
          })
          .setOrigin(0.5),
      );
      this.logColors.push(TXT_GOLD_LIGHT);
    }
  }

  private pushLog(msg: string, color: string = TXT_GOLD_LIGHT) {
    for (let i = 0; i < this.logLines.length - 1; i++) {
      this.logLines[i].setText(this.logLines[i + 1].text);
      this.logLines[i].setColor(this.logColors[i + 1]);
      this.logColors[i] = this.logColors[i + 1];
    }
    const lastIdx = this.logLines.length - 1;
    this.logLines[lastIdx].setText(`> ${msg}`);
    this.logLines[lastIdx].setColor(color);
    this.logColors[lastIdx] = color;
  }

  private moveLogColor(move: {
    moveType: string;
    baseValue: number;
    effects: { type: string }[];
  }): string {
    if (move.moveType === "physical" && move.baseValue > 0) return TXT_INTENT_ATTACK;
    if (move.moveType === "magic" && move.baseValue > 0) return TXT_LOG_MAGIC;
    if (move.moveType === "heal") return TXT_INTENT_HEAL;
    if (move.effects.some((e) => e.type === "drain")) return TXT_INTENT_HEAL;
    if (move.effects.some((e) => e.type === "buff")) return TXT_INTENT_BUFF;
    if (move.effects.some((e) => e.type === "debuff")) return TXT_INTENT_DEBUFF;
    return TXT_GOLD_LIGHT;
  }

  // ── HP + live stats ──────────────────────────────────────────────────────

  private updateHeroHp() {
    const pct = Math.max(0, this.hero.hp) / this.hero.maxHp;
    this.heroHpFill.setScale(pct, 1);
    this.heroHpFill.setFillStyle(pct > 0.5 ? BAR_HP_HIGH : pct > 0.25 ? BAR_HP_MID : BAR_HP_LOW);
    this.heroHpText.setText(`HP  ${Math.max(0, this.hero.hp)} / ${this.hero.maxHp}`);
    this.heroBuffText.setText(this.formatBuffs(this.hero));
    this.updateHeroStats();
    this.updateHeroMana();
  }

  private updateHeroMana() {
    const pct = this.heroMana / this.MANA_MAX;
    this.heroManaFill.setScale(pct, 1);
    this.heroManaText.setText(`MP  ${this.heroMana} / ${this.MANA_MAX}`).setColor(TXT_GOLD_LIGHT);
    this.updateButtonManaState();
  }

  private updateButtonManaState() {
    this.hero.moves.forEach((moveId, i) => {
      const btn = this.moveButtons[i];
      if (!btn) return;
      const cost = GameState.getMove(moveId)?.manaCost ?? 0;
      const canAfford = this.heroMana >= cost;
      btn.bg.setAlpha(canAfford ? 1 : 0.45);
      btn.costTxt.setColor(canAfford ? TXT_MANA : TXT_MANA_LOW);
    });
  }

  private updateHeroStats() {
    const effAtk = getEffectiveStat(this.hero, "attack");
    const effDef = getEffectiveStat(this.hero, "defense");
    const effMag = getEffectiveStat(this.hero, "magic");
    this.heroStatsText.setText(`ATK ${effAtk}   DEF ${effDef}   MAG ${effMag}`);
  }

  private updateMonsterHp() {
    const pct = Math.max(0, this.monster.hp) / this.monster.maxHp;
    this.monsterHpFill.setScale(pct, 1);
    this.monsterHpText.setText(`HP  ${Math.max(0, this.monster.hp)} / ${this.monster.maxHp}`);
    this.monsterBuffText.setText(this.formatBuffs(this.monster));
  }

  private formatBuffs(char: CombatCharacter): string {
    if (!char.activeBuffs.length) return "";
    return char.activeBuffs
      .map((b) => {
        const sign = b.multiplier >= 1 ? "+" : "-";
        const pct = Math.round(Math.abs(b.multiplier - 1) * 100);
        return `${b.stat} ${sign}${pct}% (${b.turnsRemaining}t)`;
      })
      .join("  ");
  }

  // ── Move tooltip (shown on hover) ───────────────────────────────────────

  private buildMoveTooltip(moveId: string): string {
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return "";

    const effAtk = getEffectiveStat(this.hero, "attack");
    const effMag = getEffectiveStat(this.hero, "magic");
    const effDef = getEffectiveStat(this.monster, "defense");
    const parts: string[] = [];

    if (move.moveType === "physical" && move.baseValue > 0) {
      const dmg = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - effDef * 0.5));
      parts.push(`~${dmg} physical dmg to enemy`);
    } else if (move.moveType === "magic" && move.baseValue > 0) {
      const dmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
      parts.push(`~${dmg} magic dmg to enemy`);
    } else if (move.moveType === "heal") {
      const heal = Math.max(5, Math.floor(move.baseValue + effMag));
      parts.push(`heals you for ~${heal} HP`);
    }

    for (const fx of move.effects) {
      if (fx.type === "drain") {
        const dmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
        parts.push(`heals you for ~${dmg} HP`);
      } else if (fx.type === "buff" && fx.target === "self") {
        const pct = Math.round((fx.multiplier! - 1) * 100);
        parts.push(`+${pct}% your ${fx.stat} for ${fx.turns} turns`);
      } else if (fx.type === "debuff" && fx.target === "opponent") {
        const pct = Math.round((1 - fx.multiplier!) * 100);
        parts.push(`-${pct}% enemy ${fx.stat} for ${fx.turns} turns`);
      } else if (fx.type === "hp_cost") {
        parts.push(`costs you ${fx.value!} HP`);
      }
    }

    return parts.join("   •   ");
  }

  // ── Enemy intent ─────────────────────────────────────────────────────────

  private updateMonsterIntent(moveId: string | null) {
    if (!moveId) {
      this.monsterIntentText.setText("Thinking...").setColor(TXT_MUTED);
      return;
    }
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return;

    const hasDamage = move.baseValue > 0;
    const hasDrain = move.effects.some((e) => e.type === "drain");
    const hasHeal = move.moveType === "heal";
    const hasBuff = move.effects.some((e) => e.type === "buff" && e.target === "self");
    const hasDebuff = move.effects.some((e) => e.type === "debuff" && e.target === "opponent");

    if (hasDamage && !hasDrain) {
      const isPhysical = move.moveType === "physical";
      const effStat = getEffectiveStat(this.monster, isPhysical ? "attack" : "magic");
      const effDef = getEffectiveStat(this.hero, "defense");
      const dmg = isPhysical
        ? Math.max(1, Math.floor((move.baseValue + effStat) * 0.75 - effDef * 0.5))
        : Math.max(1, Math.floor(move.baseValue + effStat * 1.1));
      const label = isPhysical ? "Physical" : "Magic";
      const color = isPhysical ? TXT_INTENT_ATTACK : TXT_LOG_MAGIC;
      this.monsterIntentText.setText(`${label}  ~${dmg} dmg`).setColor(color);
    } else if (hasDrain) {
      this.monsterIntentText.setText("Draining life").setColor(TXT_INTENT_HEAL);
    } else if (hasHeal) {
      this.monsterIntentText.setText("Healing").setColor(TXT_INTENT_HEAL);
    } else if (hasDebuff) {
      const stat = move.effects.find((e) => e.type === "debuff")?.stat ?? "stat";
      this.monsterIntentText.setText(`Weakening your ${stat}`).setColor(TXT_INTENT_DEBUFF);
    } else if (hasBuff) {
      const stat = move.effects.find((e) => e.type === "buff")?.stat ?? "stat";
      this.monsterIntentText.setText(`Buffing own ${stat}`).setColor(TXT_INTENT_BUFF);
    } else {
      this.monsterIntentText.setText(move.name).setColor(TXT_MUTED);
    }
  }

  private async prefetchMonsterIntent() {
    const capturedTurn = this.turnNumber;
    this.updateMonsterIntent(null);
    try {
      const payload = {
        monsterId: this.monster.id,
        monsterMoves: this.monster.moves,
        monsterState: {
          hp: this.monster.hp,
          maxHp: this.monster.maxHp,
          attack: this.monster.baseStats.attack,
          defense: this.monster.baseStats.defense,
          magic: this.monster.baseStats.magic,
          activeBuffs: this.monster.activeBuffs,
        },
        heroState: {
          hp: this.hero.hp,
          maxHp: this.hero.maxHp,
          attack: this.hero.baseStats.attack,
          defense: this.hero.baseStats.defense,
          magic: this.hero.baseStats.magic,
          activeBuffs: this.hero.activeBuffs,
        },
        turnNumber: this.turnNumber,
        heroMoves: this.hero.moves,
        lastMonsterMoves: this.monsterMoveHistory,
      };
      const resp = await api.getMonsterMove(payload);
      if (this.turnNumber !== capturedTurn) return; // player already moved, discard
      this.monsterIntentMoveId = resp.moveId;
      this.updateMonsterIntent(resp.moveId);
    } catch {
      if (this.turnNumber !== capturedTurn) return;
      this.monsterIntentText.setText("Unknown").setColor(TXT_MUTED);
    }
  }

  // ── HP preview on move hover ─────────────────────────────────────────────

  private showMovePreview(moveId: string) {
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return;
    const futureDef = this.previewHeroBuffs(move);
    const { playerDmg, playerHeal } = this.previewMonsterHp(move);
    this.previewHeroHp(playerDmg, playerHeal, futureDef);
    this.previewMana(move.manaCost ?? 0);
  }

  private previewMana(cost: number) {
    if (cost <= 0) return;
    const futureMana = Math.max(0, this.heroMana - cost);
    const futureRegen = Math.min(this.MANA_MAX, futureMana + this.MANA_REGEN);
    this.heroManaFill.setScale(futureMana / this.MANA_MAX, 1);
    this.heroManaText
      .setText(`MP  ${futureMana} / ${this.MANA_MAX}  (+${futureRegen - futureMana} next turn)`)
      .setColor(TXT_MANA_LOW);
  }

  private previewHeroBuffs(move: MoveConfig): number {
    let futureAtk = getEffectiveStat(this.hero, "attack");
    let futureDef = getEffectiveStat(this.hero, "defense");
    let futureMag = getEffectiveStat(this.hero, "magic");
    for (const fx of move.effects) {
      if (fx.type === "buff" && fx.target === "self") {
        if (fx.stat === "attack") futureAtk = Math.floor(futureAtk * fx.multiplier!);
        if (fx.stat === "defense") futureDef = Math.floor(futureDef * fx.multiplier!);
        if (fx.stat === "magic") futureMag = Math.floor(futureMag * fx.multiplier!);
      }
    }
    const statsChanged =
      futureAtk !== getEffectiveStat(this.hero, "attack") ||
      futureDef !== getEffectiveStat(this.hero, "defense") ||
      futureMag !== getEffectiveStat(this.hero, "magic");
    if (statsChanged) {
      this.heroStatsText.setText(`ATK ${futureAtk}   DEF ${futureDef}   MAG ${futureMag}`);
    }
    return futureDef;
  }

  private previewMonsterHp(move: MoveConfig): { playerDmg: number; playerHeal: number } {
    const effAtk = getEffectiveStat(this.hero, "attack");
    const effMag = getEffectiveStat(this.hero, "magic");
    const monsterEffDef = getEffectiveStat(this.monster, "defense");

    let playerDmg = 0;
    let playerHeal = 0;

    if (move.moveType === "physical" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - monsterEffDef * 0.5));
    else if (move.moveType === "magic" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
    else if (move.moveType === "heal")
      playerHeal = Math.max(5, Math.floor(move.baseValue + effMag));

    if (move.effects.some((e) => e.type === "drain")) playerHeal = playerDmg;

    if (playerDmg > 0) {
      const futureHp = Math.max(0, this.monster.hp - playerDmg);
      this.monsterHpGhost.setPosition(
        this.monsterBarLeft + BAR_W * (futureHp / this.monster.maxHp),
        this.monsterBarY,
      );
      this.monsterHpGhost.setSize(BAR_W * (playerDmg / this.monster.maxHp), 14);
      this.monsterHpText
        .setText(`HP  ${futureHp} / ${this.monster.maxHp}`)
        .setColor(TXT_INTENT_ATTACK);
    }

    return { playerDmg, playerHeal };
  }

  private previewHeroHp(playerDmg: number, playerHeal: number, futureDef: number): void {
    if (playerHeal > 0) {
      const futureHp = Math.min(this.hero.maxHp, this.hero.hp + playerHeal);
      this.heroHpGhost.setPosition(
        this.heroBarLeft + BAR_W * (this.hero.hp / this.hero.maxHp),
        this.heroBarY,
      );
      this.heroHpGhost
        .setSize(BAR_W * ((futureHp - this.hero.hp) / this.hero.maxHp), 14)
        .setFillStyle(BAR_HP_HIGH, 0.7);
      this.heroHpText.setText(`HP  ${futureHp} / ${this.hero.maxHp}`).setColor(TXT_INTENT_HEAL);
      return;
    }

    const monsterSurvives = this.monster.hp - playerDmg > 0;
    if (monsterSurvives && this.monsterIntentMoveId) {
      const intentMove = GameState.runConfig!.moves[this.monsterIntentMoveId];
      const monsterEffAtk = getEffectiveStat(this.monster, "attack");
      const monsterEffMag = getEffectiveStat(this.monster, "magic");

      let monsterDmg = 0;
      if (intentMove?.moveType === "physical" && intentMove.baseValue > 0)
        monsterDmg = Math.max(
          1,
          Math.floor((intentMove.baseValue + monsterEffAtk) * 0.75 - futureDef * 0.5),
        );
      else if (intentMove?.moveType === "magic" && intentMove.baseValue > 0)
        monsterDmg = Math.max(1, Math.floor(intentMove.baseValue + monsterEffMag * 1.1));

      if (monsterDmg > 0) {
        const futureHp = Math.max(0, this.hero.hp - monsterDmg);
        this.heroHpGhost.setPosition(
          this.heroBarLeft + BAR_W * (futureHp / this.hero.maxHp),
          this.heroBarY,
        );
        this.heroHpGhost
          .setSize(BAR_W * (monsterDmg / this.hero.maxHp), 14)
          .setFillStyle(HP_GHOST_HERO, 0.75);
        this.heroHpText.setText(`HP  ${futureHp} / ${this.hero.maxHp}`).setColor(TXT_INTENT_ATTACK);
      }
    }
  }

  private hideMovePreview() {
    this.monsterHpGhost.setSize(0, 14);
    this.heroHpGhost.setSize(0, 14);
    this.monsterHpText
      .setText(`HP  ${Math.max(0, this.monster.hp)} / ${this.monster.maxHp}`)
      .setColor(TXT_GOLD_LIGHT);
    this.heroHpText
      .setText(`HP  ${Math.max(0, this.hero.hp)} / ${this.hero.maxHp}`)
      .setColor(TXT_GOLD_LIGHT);
    this.updateHeroStats();
    this.updateHeroMana();
  }

  // ── Turn logic ───────────────────────────────────────────────────────────

  private handlePlayerMove(moveId: string) {
    if (this.busy) return;
    this.busy = true;
    this.hideMovePreview();
    this.setButtonsEnabled(false);

    const move = GameState.getMove(moveId);
    if (!move) {
      this.busy = false;
      this.setButtonsEnabled(true);
      return;
    }
    this.heroMana = Math.max(0, this.heroMana - (move.manaCost ?? 0));
    const result = applyMove(move, this.hero, this.monster);
    this.pushLog(`You → ${move.name}: ${result.logMessage}`, this.moveLogColor(move));
    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.monster.hp <= 0) {
      this.handleVictory();
      return;
    }

    this.setStatus("Monster is deciding...");
    this.time.delayedCall(900, () => void this.doMonsterTurn());
  }

  private async doMonsterTurn() {
    try {
      // Use the pre-fetched intent move if available; otherwise fetch now
      let moveId = this.monsterIntentMoveId;
      this.monsterIntentMoveId = null;

      if (!moveId) {
        const payload = {
          monsterId: this.monster.id,
          monsterMoves: this.monster.moves,
          monsterState: {
            hp: this.monster.hp,
            maxHp: this.monster.maxHp,
            attack: this.monster.baseStats.attack,
            defense: this.monster.baseStats.defense,
            magic: this.monster.baseStats.magic,
            activeBuffs: this.monster.activeBuffs,
          },
          heroState: {
            hp: this.hero.hp,
            maxHp: this.hero.maxHp,
            attack: this.hero.baseStats.attack,
            defense: this.hero.baseStats.defense,
            magic: this.hero.baseStats.magic,
            activeBuffs: this.hero.activeBuffs,
          },
          turnNumber: this.turnNumber,
          heroMoves: this.hero.moves,
          lastMonsterMoves: this.monsterMoveHistory,
        };
        const resp = await api.getMonsterMove(payload);
        moveId = resp.moveId;
      }

      const monsterMove = GameState.getMove(moveId);
      if (!monsterMove) throw new Error(`unknown monster move: ${moveId}`);
      const result = applyMove(monsterMove, this.monster, this.hero);
      this.pushLog(
        `${this.monster.name} → ${monsterMove.name}: ${result.logMessage}`,
        this.moveLogColor(monsterMove),
      );
      this.monsterMoveHistory = [moveId, ...this.monsterMoveHistory].slice(0, 3);
    } catch {
      const fallbackId = this.monster.moves[Math.floor(Math.random() * this.monster.moves.length)];
      const fallbackMove = GameState.getMove(fallbackId);
      if (!fallbackMove) {
        this.pushLog(`${this.monster.name} hesitates.`, TXT_MUTED);
      } else {
        const result = applyMove(fallbackMove, this.monster, this.hero);
        this.pushLog(
          `${this.monster.name} → ${fallbackMove.name}: ${result.logMessage}`,
          this.moveLogColor(fallbackMove),
        );
        this.monsterMoveHistory = [fallbackId, ...this.monsterMoveHistory].slice(0, 3);
      }
    }

    tickBuffs(this.hero);
    tickBuffs(this.monster);
    this.heroMana = Math.min(this.MANA_MAX, this.heroMana + this.MANA_REGEN);
    this.turnNumber++;

    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.hero.hp <= 0) {
      this.handleDefeat();
      return;
    }

    this.setStatus("Your turn — choose a move!");
    this.usedPotionThisTurn = false;
    this.busy = false;
    this.setButtonsEnabled(true);
    void this.prefetchMonsterIntent();
  }

  // ── Battle end ───────────────────────────────────────────────────────────

  private handleVictory() {
    GameState.hero.currentHp = this.hero.hp;
    const xpGain = Math.floor(this.monsterCfg.xpReward * this.monsterLevel);
    const leveled = GameState.addXp(xpGain);

    const goldMin = this.monsterCfg.goldMin ?? 0;
    const goldMax = this.monsterCfg.goldMax ?? 0;
    const goldEarned = Math.floor(goldMin + Math.random() * (goldMax - goldMin + 1));
    GameState.hero.gold = (GameState.hero.gold ?? 0) + goldEarned;

    const shardMin = this.monsterCfg.shardMin ?? 0;
    const shardMax = this.monsterCfg.shardMax ?? 0;
    const shardsEarned = Math.floor(shardMin + Math.random() * (shardMax - shardMin + 1));
    MetaProgress.addShards(shardsEarned);

    GameState.saveHero();

    const allMoves = GameState.runConfig!.moves;
    const learned = GameState.hero.learnedMoves;
    const moveDropPool = this.monsterCfg.dropMoves ?? this.monsterCfg.moves;
    const notKnown = moveDropPool.filter((id) => !learned.includes(id));
    const genuinelyNew = notKnown.filter((id) => !hasSimilarMove(allMoves[id], learned, allMoves));
    const dropped = genuinelyNew.filter((id) => Math.random() < (allMoves[id]?.dropChance ?? 1));
    const learnedMove = dropped.length > 0 ? dropped[Math.floor(Math.random() * dropped.length)] : null;
    if (learnedMove) GameState.learnMove(learnedMove);

    const newDefeated = [...this.defeatedIds, this.monsterCfg.id];
    if (this.nodeId) GameState.completeNode(this.nodeId);

    this.scene.start("PostBattleScene", {
      won: true,
      learnedMoveId: learnedMove,
      xpGained: xpGain,
      goldEarned,
      shardsEarned,
      leveledUp: leveled,
      monsterIndex: this.monsterIndex,
      defeatedIds: newDefeated,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }

  private handleDefeat() {
    // Full run reset — hero returns to level 1 with meta bonuses applied
    if (GameState.runConfig) GameState.resetHero(GameState.runConfig);
    GameState.resetRunProgress(); // saves fresh tree state so CONTINUE works from main menu

    this.scene.start("PostBattleScene", {
      won: false,
      learnedMoveId: null,
      xpGained: 0,
      leveledUp: false,
      monsterIndex: this.monsterIndex,
      defeatedIds: this.defeatedIds,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }
}
