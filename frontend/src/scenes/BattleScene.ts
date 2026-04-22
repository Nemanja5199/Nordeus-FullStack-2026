import Phaser from "phaser";
import type { CombatCharacter, MonsterConfig } from "../types/game";
import { applyMove, tickBuffs, getEffectiveStat } from "../utils/combat";
import { GameState } from "../utils/gameState";
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
}

const LOG_LINES = 3;
const PANEL_W = 270;
const BAR_W = PANEL_W - 24;

export class BattleScene extends Phaser.Scene {
  private hero!: CombatCharacter;
  private monster!: CombatCharacter;
  private monsterCfg!: MonsterConfig;
  private monsterIndex!: number;
  private defeatedIds!: string[];
  private sourceScene!: string;
  private nodeId!: string | undefined;
  private turnNumber = 0;
  private busy = false;

  // UI
  private heroHpFill!: Phaser.GameObjects.Rectangle;
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
  private moveButtons: Phaser.GameObjects.Container[] = [];
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
    this.moveButtons = [];
    this.logLines = [];
    this.monsterIntentMoveId = null;

    this.monsterCfg = data.monster;
    this.monsterIndex = data.monsterIndex;
    this.defeatedIds = data.defeatedIds ?? [];
    this.sourceScene = data.sourceScene ?? "TreeMapScene";
    this.nodeId = data.nodeId;

    const hs = GameState.hero;
    this.hero = {
      id: "hero",
      name: "Knight",
      hp: hs.currentHp ?? hs.maxHp,
      maxHp: hs.maxHp,
      baseStats: { attack: hs.attack, defense: hs.defense, magic: hs.magic },
      activeBuffs: [],
      moves: hs.equippedMoves,
    };

    const ms = this.monsterCfg.stats;
    this.monster = {
      id: this.monsterCfg.id,
      name: this.monsterCfg.name,
      hp: ms.hp,
      maxHp: ms.hp,
      baseStats: { attack: ms.attack, defense: ms.defense, magic: ms.magic },
      activeBuffs: [],
      moves: this.monsterCfg.moves,
    };

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);

    this.buildHeroPanel(width, height);
    this.buildMonsterPanel(width, height);
    this.buildStatusBar(width, height);
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
        fontSize: "22px",
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
        fontSize: "15px",
        color: TXT_GOLD_LIGHT,
        align: "center",
      })
      .setOrigin(0.5);

    // HP bar
    const barY = panelTop + panelH * 0.72;
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
      .text(cx, barY + 18, "", {
        fontSize: "15px",
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0.5);

    this.heroBuffText = this.add
      .text(cx, panelTop + panelH * 0.88, "", {
        fontSize: "13px",
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
        fontSize: "22px",
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

    // Monster base stats (static — monsters don't level up)
    const ms = this.monsterCfg.stats;
    this.add
      .text(
        cx,
        panelTop + panelH * 0.62,
        `ATK ${ms.attack}   DEF ${ms.defense}   MAG ${ms.magic}`,
        {
          fontSize: "15px",
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
        fontSize: "15px",
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0.5);

    // Intent row — what the monster plans to do this turn
    this.monsterIntentText = this.add
      .text(cx, panelTop + panelH * 0.86, "", {
        fontSize: "18px",
        fontFamily: "EnchantedLand",
        color: TXT_MUTED,
        wordWrap: { width: PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    // Active buffs/debuffs
    this.monsterBuffText = this.add
      .text(cx, panelTop + panelH * 0.94, "", {
        fontSize: "12px",
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
        fontSize: "22px",
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
    const descY = height * 0.85;

    this.descText = this.add
      .text(width / 2, descY, "", {
        fontSize: "15px",
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

      const bg = this.add
        .rectangle(0, 0, btnW, btnH, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);
      const nameTxt = this.add
        .text(0, -10, move.name, {
          fontSize: "17px",
          fontFamily: "EnchantedLand",
          color: TXT_GOLD_LIGHT,
        })
        .setOrigin(0.5);
      const typeTxt = this.add
        .text(0, 12, `[${move.moveType}]`, {
          fontSize: "13px",
          color: TXT_GOLD_MID,
        })
        .setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (this.busy) return;
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
      bg.on("pointerdown", () => this.handlePlayerMove(moveId));

      container.add([bg, nameTxt, typeTxt]);
      this.moveButtons.push(container);
    });
  }

  private setButtonsEnabled(enabled: boolean) {
    this.moveButtons.forEach((c) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setAlpha(enabled ? 1 : 0.4);
      if (!enabled) bg.disableInteractive();
      else bg.setInteractive({ useHandCursor: true });
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
            fontSize: "17px",
            color: TXT_GOLD_LIGHT,
          })
          .setOrigin(0.5),
      );
    }
  }

  private pushLog(msg: string, color: string = TXT_GOLD_LIGHT) {
    for (let i = 0; i < this.logLines.length - 1; i++) {
      this.logLines[i].setText(this.logLines[i + 1].text);
      this.logLines[i].setColor(this.logLines[i + 1].style.color as string);
    }
    const last = this.logLines[this.logLines.length - 1];
    last.setText(`> ${msg}`);
    last.setColor(color);
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

    const effAtk = getEffectiveStat(this.hero, "attack");
    const effMag = getEffectiveStat(this.hero, "magic");
    const monsterEffDef = getEffectiveStat(this.monster, "defense");

    // ── Apply this move's buffs to get future hero stats ─────────────────
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

    // ── What the player's move does ───────────────────────────────────────
    let playerDmg = 0;
    let playerHeal = 0;

    if (move.moveType === "physical" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - monsterEffDef * 0.5));
    else if (move.moveType === "magic" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
    else if (move.moveType === "heal")
      playerHeal = Math.max(5, Math.floor(move.baseValue + effMag));

    if (move.effects.some((e) => e.type === "drain")) playerHeal = playerDmg;

    // ── Monster HP ghost (dark overlay on the chunk that would be removed) ─
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

    // ── Hero HP ghost — heal gain (green) ─────────────────────────────────
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
      return; // don't show retaliation on heal turns
    }

    // ── Hero HP ghost — monster retaliation using future (buffed) defense ─
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
  }

  // ── Turn logic ───────────────────────────────────────────────────────────

  private handlePlayerMove(moveId: string) {
    if (this.busy) return;
    this.busy = true;
    this.hideMovePreview();
    this.setButtonsEnabled(false);

    const move = GameState.runConfig!.moves[moveId];
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

      const monsterMove = GameState.runConfig!.moves[moveId];
      const result = applyMove(monsterMove, this.monster, this.hero);
      this.pushLog(
        `${this.monster.name} → ${monsterMove.name}: ${result.logMessage}`,
        this.moveLogColor(monsterMove),
      );
      this.monsterMoveHistory = [moveId, ...this.monsterMoveHistory].slice(0, 3);
    } catch {
      const fallbackId = this.monster.moves[Math.floor(Math.random() * this.monster.moves.length)];
      const fallbackMove = GameState.runConfig!.moves[fallbackId];
      const result = applyMove(fallbackMove, this.monster, this.hero);
      this.pushLog(
        `${this.monster.name} → ${fallbackMove.name}: ${result.logMessage}`,
        this.moveLogColor(fallbackMove),
      );
      this.monsterMoveHistory = [fallbackId, ...this.monsterMoveHistory].slice(0, 3);
    }

    tickBuffs(this.hero);
    tickBuffs(this.monster);
    this.turnNumber++;

    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.hero.hp <= 0) {
      this.handleDefeat();
      return;
    }

    this.setStatus("Your turn — choose a move!");
    this.setButtonsEnabled(true);
    this.busy = false;
    void this.prefetchMonsterIntent();
  }

  // ── Battle end ───────────────────────────────────────────────────────────

  private handleVictory() {
    GameState.hero.currentHp = this.hero.hp;
    const xpGain = this.monsterCfg.xpReward;
    const leveled = GameState.addXp(xpGain);

    const newMoves = this.monsterCfg.moves.filter(
      (id) => !GameState.hero.learnedMoves.includes(id),
    );
    const learnedMove =
      newMoves.length > 0 ? newMoves[Math.floor(Math.random() * newMoves.length)] : null;
    if (learnedMove) GameState.learnMove(learnedMove);

    const newDefeated = [...this.defeatedIds, this.monsterCfg.id];
    if (this.nodeId) GameState.completeNode(this.nodeId);

    this.scene.start("PostBattleScene", {
      won: true,
      learnedMoveId: learnedMove,
      xpGained: xpGain,
      leveledUp: leveled,
      monsterIndex: this.monsterIndex,
      defeatedIds: newDefeated,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }

  private handleDefeat() {
    GameState.hero.currentHp = GameState.hero.maxHp;
    const xpGain = Math.floor(this.monsterCfg.xpReward * 0.25);
    GameState.addXp(xpGain);

    this.scene.start("PostBattleScene", {
      won: false,
      learnedMoveId: null,
      xpGained: xpGain,
      leveledUp: false,
      monsterIndex: this.monsterIndex,
      defeatedIds: this.defeatedIds,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }
}
