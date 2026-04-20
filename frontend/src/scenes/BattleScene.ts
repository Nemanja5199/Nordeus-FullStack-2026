import Phaser from "phaser";
import type { CombatCharacter, MonsterConfig } from "../types/game";
import { applyMove, tickBuffs } from "../utils/combat";
import { GameState } from "../utils/gameState";
import { api } from "../services/api";
import { HERO_FRAME, MONSTER_FRAMES } from "../utils/spriteFrames";
import {
  BG_DARKEST,
  BG_HERO_BATTLE, BG_MONSTER_BATTLE,
  BG_MOVE_CARD, BG_BTN_HOVER, BG_PANEL,
  BORDER_HERO_BATTLE, BORDER_MON_BATTLE,
  BORDER_LOCKED, BORDER_GOLD, BORDER_GOLD_BRIGHT,
  TXT_GOLD, TXT_GOLD_LIGHT, TXT_GOLD_MID, TXT_MUTED,
  TXT_HERO, TXT_MONSTER,
  BAR_HP_FILL, BAR_HERO_HP, BAR_HP_HIGH, BAR_HP_MID, BAR_HP_LOW,
  BG_BAR_TRACK, TXT_LOG,
} from "../ui/colors";

interface BattleData {
  monster: MonsterConfig;
  monsterIndex: number;
  defeatedIds: string[];
  sourceScene?: string;
  nodeId?: string;
}

const LOG_LINES = 3;
const PANEL_W   = 270;
const BAR_W     = PANEL_W - 24;

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
  private heroBuffText!: Phaser.GameObjects.Text;
  private monsterBuffText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private logLines: Phaser.GameObjects.Text[] = [];
  private moveButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("BattleScene");
  }

  create(data: BattleData) {
    this.busy = false;
    this.turnNumber = 0;
    this.moveButtons = [];
    this.logLines = [];

    this.monsterCfg   = data.monster;
    this.monsterIndex = data.monsterIndex;
    this.defeatedIds  = data.defeatedIds ?? [];
    this.sourceScene  = data.sourceScene ?? "MapScene";
    this.nodeId       = data.nodeId;

    const hs = GameState.hero;
    this.hero = {
      id: "hero", name: "Knight",
      hp: hs.currentHp ?? hs.maxHp, maxHp: hs.maxHp,
      baseStats: { attack: hs.attack, defense: hs.defense, magic: hs.magic },
      activeBuffs: [], moves: hs.equippedMoves,
    };

    const ms = this.monsterCfg.stats;
    this.monster = {
      id: this.monsterCfg.id, name: this.monsterCfg.name,
      hp: ms.hp, maxHp: ms.hp,
      baseStats: { attack: ms.attack, defense: ms.defense, magic: ms.magic },
      activeBuffs: [], moves: this.monsterCfg.moves,
    };

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);

    this.buildHeroPanel(width, height);
    this.buildMonsterPanel(width, height);
    this.buildStatusBar(width, height);
    this.buildMoveButtons(width, height);
    this.buildBattleLog(width, height);

    this.setStatus("Your turn — choose a move!");
  }

  // ── Hero panel ───────────────────────────────────────────────────────────

  private buildHeroPanel(width: number, height: number) {
    const panelH  = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.20;

    this.add.rectangle(cx, panelTop + panelH / 2, PANEL_W, panelH, BG_HERO_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER_HERO_BATTLE);

    this.add.text(cx, panelTop + 20, `Knight  Lv.${GameState.hero.level}`, {
      fontSize: "19px", fontFamily: "EnchantedLand", color: TXT_HERO,
    }).setOrigin(0.5);

    this.add.image(cx, panelTop + panelH * 0.42, HERO_FRAME.key, HERO_FRAME.frame)
      .setScale(5).setOrigin(0.5);

    // Stats row
    const statsY = panelTop + panelH * 0.62;
    this.add.text(cx, statsY,
      `ATK ${GameState.hero.attack}   DEF ${GameState.hero.defense}   MAG ${GameState.hero.magic}`, {
        fontSize: "13px", color: TXT_MUTED, align: "center",
      }).setOrigin(0.5);

    // HP bar
    const barY = panelTop + panelH * 0.72;
    this.add.rectangle(cx, barY, BAR_W, 14, BG_BAR_TRACK).setOrigin(0.5);
    this.heroHpFill = this.add.rectangle(cx - BAR_W / 2, barY, BAR_W, 14, BAR_HERO_HP).setOrigin(0, 0.5);
    this.heroHpText = this.add.text(cx, barY + 16, "", {
      fontSize: "13px", color: TXT_GOLD_LIGHT,
    }).setOrigin(0.5);

    this.heroBuffText = this.add.text(cx, panelTop + panelH * 0.88, "", {
      fontSize: "11px", color: TXT_GOLD_MID,
      wordWrap: { width: PANEL_W - 16 }, align: "center",
    }).setOrigin(0.5);

    this.updateHeroHp();
  }

  // ── Monster panel ────────────────────────────────────────────────────────

  private buildMonsterPanel(width: number, height: number) {
    const panelH   = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.80;

    this.add.rectangle(cx, panelTop + panelH / 2, PANEL_W, panelH, BG_MONSTER_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER_MON_BATTLE);

    this.add.text(cx, panelTop + 20, this.monsterCfg.name, {
      fontSize: "19px", fontFamily: "EnchantedLand", color: TXT_MONSTER,
    }).setOrigin(0.5);

    const monsterFrame = MONSTER_FRAMES[this.monsterCfg.id];
    if (monsterFrame) {
      this.add.image(cx, panelTop + panelH * 0.42, monsterFrame.key, monsterFrame.frame)
        .setScale(-5, 5).setOrigin(0.5);
    }

    // Stats row
    const ms = this.monsterCfg.stats;
    const statsY = panelTop + panelH * 0.62;
    this.add.text(cx, statsY,
      `ATK ${ms.attack}   DEF ${ms.defense}   MAG ${ms.magic}`, {
        fontSize: "13px", color: TXT_MUTED, align: "center",
      }).setOrigin(0.5);

    // HP bar
    const barY = panelTop + panelH * 0.72;
    this.add.rectangle(cx, barY, BAR_W, 14, BG_BAR_TRACK).setOrigin(0.5);
    this.monsterHpFill = this.add.rectangle(cx - BAR_W / 2, barY, BAR_W, 14, BAR_HP_FILL).setOrigin(0, 0.5);
    this.monsterHpText = this.add.text(cx, barY + 16, "", {
      fontSize: "13px", color: TXT_GOLD_LIGHT,
    }).setOrigin(0.5);

    this.monsterBuffText = this.add.text(cx, panelTop + panelH * 0.88, "", {
      fontSize: "11px", color: "#c87840",
      wordWrap: { width: PANEL_W - 16 }, align: "center",
    }).setOrigin(0.5);

    this.updateMonsterHp();
  }

  // ── Status bar ───────────────────────────────────────────────────────────

  private buildStatusBar(width: number, height: number) {
    const y = height * 0.66;
    this.add.rectangle(width / 2, y, width - 20, 38, BG_PANEL, 0.92).setStrokeStyle(1, BORDER_GOLD);
    this.statusText = this.add.text(width / 2, y, "", {
      fontSize: "18px", fontFamily: "EnchantedLand", color: TXT_GOLD,
    }).setOrigin(0.5);
  }

  private setStatus(msg: string) {
    this.statusText.setText(msg);
  }

  // ── Move buttons ─────────────────────────────────────────────────────────

  private buildMoveButtons(width: number, height: number) {
    const moves   = this.hero.moves;
    const btnW    = 240;
    const btnH    = 54;
    const btnGap  = 14;
    const totalW  = moves.length * btnW + (moves.length - 1) * btnGap;
    const startX  = (width - totalW) / 2 + btnW / 2;
    const btnY    = height * 0.77;
    const descY   = height * 0.85;

    this.descText = this.add.text(width / 2, descY, "", {
      fontSize: "13px", color: TXT_MUTED,
      wordWrap: { width: width - 40 }, align: "center",
    }).setOrigin(0.5);

    moves.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const x = startX + i * (btnW + btnGap);
      const container = this.add.container(x, btnY);

      const bg = this.add.rectangle(0, 0, btnW, btnH, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);
      const nameTxt = this.add.text(0, -10, move.name, {
        fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT,
      }).setOrigin(0.5);
      const typeTxt = this.add.text(0, 10, `[${move.moveType}]`, {
        fontSize: "11px", color: TXT_MUTED,
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (this.busy) return;
        bg.setFillStyle(BG_BTN_HOVER);
        bg.setStrokeStyle(1, BORDER_GOLD_BRIGHT);
        nameTxt.setColor(TXT_GOLD);
        this.descText.setText(move.description);
      });
      bg.on("pointerout", () => {
        bg.setFillStyle(BG_MOVE_CARD);
        bg.setStrokeStyle(1, BORDER_LOCKED);
        nameTxt.setColor(TXT_GOLD_LIGHT);
        this.descText.setText("");
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
    const lineH  = 17;
    this.add.rectangle(width / 2, startY + (LOG_LINES * lineH) / 2, width * 0.7, LOG_LINES * lineH + 10, BG_DARKEST, 0.7);

    for (let i = 0; i < LOG_LINES; i++) {
      this.logLines.push(
        this.add.text(width / 2, startY + i * lineH, "", {
          fontSize: "13px", color: TXT_LOG,
        }).setOrigin(0.5)
      );
    }
  }

  private pushLog(msg: string) {
    for (let i = 0; i < this.logLines.length - 1; i++) {
      this.logLines[i].setText(this.logLines[i + 1].text);
    }
    this.logLines[this.logLines.length - 1].setText(`> ${msg}`);
  }

  // ── HP updates ───────────────────────────────────────────────────────────

  private updateHeroHp() {
    const pct = Math.max(0, this.hero.hp) / this.hero.maxHp;
    this.heroHpFill.setScale(pct, 1);
    this.heroHpFill.setFillStyle(pct > 0.5 ? BAR_HP_HIGH : pct > 0.25 ? BAR_HP_MID : BAR_HP_LOW);
    this.heroHpText.setText(`HP  ${Math.max(0, this.hero.hp)} / ${this.hero.maxHp}`);
    this.heroBuffText.setText(this.formatBuffs(this.hero));
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
        const pct  = Math.round(Math.abs(b.multiplier - 1) * 100);
        return `${b.stat} ${sign}${pct}% (${b.turnsRemaining}t)`;
      })
      .join("  ");
  }

  // ── Turn logic ───────────────────────────────────────────────────────────

  private handlePlayerMove(moveId: string) {
    if (this.busy) return;
    this.busy = true;
    this.setButtonsEnabled(false);

    const move   = GameState.runConfig!.moves[moveId];
    const result = applyMove(move, this.hero, this.monster);
    this.pushLog(`You → ${move.name}: ${result.logMessage}`);
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
      const payload = {
        monsterId: this.monster.id,
        monsterMoves: this.monster.moves,
        monsterState: {
          hp: this.monster.hp, maxHp: this.monster.maxHp,
          attack: this.monster.baseStats.attack,
          defense: this.monster.baseStats.defense,
          magic: this.monster.baseStats.magic,
          activeBuffs: this.monster.activeBuffs,
        },
        heroState: {
          hp: this.hero.hp, maxHp: this.hero.maxHp,
          attack: this.hero.baseStats.attack,
          defense: this.hero.baseStats.defense,
          magic: this.hero.baseStats.magic,
          activeBuffs: this.hero.activeBuffs,
        },
        turnNumber: this.turnNumber,
      };

      const resp        = await api.getMonsterMove(payload);
      const monsterMove = GameState.runConfig!.moves[resp.moveId];
      const result      = applyMove(monsterMove, this.monster, this.hero);
      this.pushLog(`${this.monster.name} → ${monsterMove.name}: ${result.logMessage}`);
    } catch {
      const fallbackId   = this.monster.moves[Math.floor(Math.random() * this.monster.moves.length)];
      const fallbackMove = GameState.runConfig!.moves[fallbackId];
      const result       = applyMove(fallbackMove, this.monster, this.hero);
      this.pushLog(`${this.monster.name} → ${fallbackMove.name}: ${result.logMessage}`);
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
  }

  // ── Battle end ───────────────────────────────────────────────────────────

  private handleVictory() {
    GameState.hero.currentHp = this.hero.hp;
    const xpGain = this.monsterCfg.xpReward;
    const leveled = GameState.addXp(xpGain);

    const newMoves   = this.monsterCfg.moves.filter((id) => !GameState.hero.learnedMoves.includes(id));
    const learnedMove = newMoves.length > 0
      ? newMoves[Math.floor(Math.random() * newMoves.length)]
      : null;
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
