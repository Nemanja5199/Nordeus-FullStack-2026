import Phaser from "phaser";
import { FONT_TITLE, FONT_LG, FONT_MD, FONT_BODY, FONT_SM, FONT_XS } from "../ui/typography";
import { MOVE_CARD_W as CARD_W, MOVE_CARD_H as CARD_H, MOVE_CARD_GAP as CARD_GAP, MOVE_CARD_START_Y as START_Y } from "../ui/layout";
import { GameState } from "../utils/gameState";
import type { MoveConfig } from "../types/game";
import { TXT_STAT_ATTACK, TXT_STAT_MAGIC, TXT_STAT_HP, TXT_MOVE_BUFF, TXT_MOVE_DEBUFF, TXT_SHARD } from "../ui/colors";
import { createModalFooter } from "../ui/ModalFooter";
import {
  BG_DARKEST,
  BG_MOVE_CARD,
  BG_MOVE_EQUIPPED,
  BORDER_GOLD,
  BORDER_GOLD_BRIGHT,
  BORDER_LOCKED,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_MID,
  TXT_MUTED,
  TXT_HERO,
  TXT_LOCKED,
  BG_STAT_CARD,
  BG_STAT_CARD_AVAIL,
  BORDER_STAT_AVAIL,
  TXT_SKILL_POINTS,
  BG_BTN_STAT,
  BG_BTN_STAT_HOVER,
  TXT_STROKE_HEADER,
} from "../ui/colors";

interface MoveManagementData {
  returnScene: string;
}

// Layout constants

const STAT_LABEL: Record<string, string> = { attack: "ATK", defense: "DEF", magic: "MAG" };

function buildMoveStatLines(move: MoveConfig): { text: string; color: string }[] {
  const lines: { text: string; color: string }[] = [];

  if (move.baseValue > 0) {
    if (move.moveType === "physical")
      lines.push({ text: `⚔  ${move.baseValue} physical dmg`, color: TXT_STAT_ATTACK });
    else if (move.moveType === "magic")
      lines.push({ text: `✦  ${move.baseValue} magic dmg`, color: TXT_STAT_MAGIC });
    else if (move.moveType === "heal")
      lines.push({ text: `♥  ${move.baseValue} HP restored`, color: TXT_STAT_HP });
  }

  for (const fx of move.effects) {
    if (fx.type === "buff" && fx.stat) {
      const pct = Math.round((fx.multiplier! - 1) * 100);
      lines.push({ text: `▲  ${STAT_LABEL[fx.stat]} +${pct}%  (${fx.turns}t)`, color: TXT_MOVE_BUFF });
    } else if (fx.type === "debuff" && fx.stat) {
      const pct = Math.round((1 - fx.multiplier!) * 100);
      lines.push({ text: `▼  Enemy ${STAT_LABEL[fx.stat]} -${pct}%  (${fx.turns}t)`, color: TXT_MOVE_DEBUFF });
    } else if (fx.type === "drain") {
      lines.push({ text: `↺  Drain: heal for dmg dealt`, color: TXT_SHARD });
    } else if (fx.type === "hp_cost" && fx.value) {
      lines.push({ text: `↓  Costs ${fx.value} HP`, color: TXT_STAT_ATTACK });
    }
  }

  return lines;
}

export class MoveManagementScene extends Phaser.Scene {
  private selectedLearnedIndex = -1;
  private selectedEquippedSlot = -1;
  private learnedButtons: Phaser.GameObjects.Container[] = [];
  private equippedButtons: Phaser.GameObjects.Container[] = [];
  private infoText!: Phaser.GameObjects.Text;
  private tooltipObjects: Phaser.GameObjects.Text[] = [];
  private returnScene!: string;

  constructor() {
    super("MoveManagementScene");
  }

  create(data: MoveManagementData) {
    this.returnScene = data.returnScene ?? "TreeMapScene";
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.learnedButtons = [];
    this.equippedButtons = [];
    this.tooltipObjects = [];

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "MOVE MANAGEMENT", {
        fontSize: FONT_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Column X positions
    const colLearnedX = width * 0.22;
    const colEquippedX = width * 0.5;
    const colStatsX = width * 0.78;

    this.add
      .text(colLearnedX, 90, "LEARNED MOVES", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);
    this.add
      .text(colEquippedX, 90, "EQUIPPED SLOTS", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);
    this.add
      .text(colStatsX, 90, "STAT POINTS", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    // Vertical dividers
    const divAlpha = 0.25;
    const divTop = 90;
    const divBot = height - 80;
    this.add.rectangle(
      width * 0.36,
      (divTop + divBot) / 2,
      1,
      divBot - divTop,
      BORDER_GOLD,
      divAlpha,
    );
    this.add.rectangle(
      width * 0.64,
      (divTop + divBot) / 2,
      1,
      divBot - divTop,
      BORDER_GOLD,
      divAlpha,
    );

    this.infoText = createModalFooter(this, {
      hint: "Hover a move to see its description.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });

    this.buildLearnedPanel(colLearnedX);
    this.buildEquippedPanel(colEquippedX);
    this.buildStatPanel(colStatsX);
  }

  private showMoveTooltip(move: MoveConfig): void {
    this.tooltipObjects.forEach((t) => t.destroy());
    this.tooltipObjects = [];
    this.infoText.setVisible(false);

    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 148;

    this.tooltipObjects.push(
      this.add.text(cx, baseY, move.description, {
        fontSize: FONT_SM,
        color: TXT_MUTED,
        wordWrap: { width: width * 0.75 },
        align: "center",
      }).setOrigin(0.5),
    );

    const lines = buildMoveStatLines(move);
    if (lines.length > 0) {
      const spacing = Math.min(200, (width * 0.8) / lines.length);
      const startX = cx - ((lines.length - 1) * spacing) / 2;
      lines.forEach((line, i) => {
        this.tooltipObjects.push(
          this.add.text(startX + i * spacing, baseY + 26, line.text, {
            fontSize: FONT_LG,
            fontFamily: "EnchantedLand",
            color: line.color,
          }).setOrigin(0.5),
        );
      });
    }
  }

  private clearMoveTooltip(): void {
    this.tooltipObjects.forEach((t) => t.destroy());
    this.tooltipObjects = [];
    this.infoText.setVisible(true);
  }

  private buildLearnedPanel(panelX: number) {
    GameState.hero.learnedMoves.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const isEquipped = GameState.hero.equippedMoves.includes(moveId);
      const y = START_Y + i * (CARD_H + CARD_GAP);

      const container = this.add.container(panelX, y);
      const bg = this.add
        .rectangle(0, 0, CARD_W, CARD_H, isEquipped ? BG_MOVE_EQUIPPED : BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, isEquipped ? BORDER_GOLD : BORDER_LOCKED);

      const nameTxt = this.add.text(-CARD_W / 2 + 14, -12, move.name, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_LIGHT,
      });
      const typeTxt = this.add.text(-CARD_W / 2 + 14, 10, `[${move.moveType}]`, {
        fontSize: FONT_SM,
        color: TXT_MUTED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectLearned(i, moveId));
      bg.on("pointerover", () => { bg.setAlpha(0.7); this.showMoveTooltip(move); });
      bg.on("pointerout", () => { bg.setAlpha(1); this.clearMoveTooltip(); });

      container.add([bg, nameTxt, typeTxt]);
      this.learnedButtons.push(container);
    });
  }

  private buildEquippedPanel(panelX: number) {
    for (let slot = 0; slot < 4; slot++) {
      const moveId = GameState.hero.equippedMoves[slot];
      const move = moveId ? GameState.runConfig!.moves[moveId] : null;
      const y = START_Y + slot * (CARD_H + CARD_GAP);

      const container = this.add.container(panelX, y);
      const bg = this.add
        .rectangle(0, 0, CARD_W, CARD_H, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);

      const slotTxt = this.add.text(-CARD_W / 2 + 14, -18, `SLOT ${slot + 1}`, {
        fontSize: FONT_XS,
        color: TXT_MUTED,
      });
      const nameTxt = this.add.text(-CARD_W / 2 + 14, 4, move ? move.name : "(empty)", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: move ? TXT_HERO : TXT_LOCKED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectEquipped(slot));
      bg.on("pointerover", () => { bg.setAlpha(0.7); if (move) this.showMoveTooltip(move); });
      bg.on("pointerout", () => { bg.setAlpha(1); this.clearMoveTooltip(); });

      container.add([bg, slotTxt, nameTxt]);
      this.equippedButtons.push(container);
    }
  }

  private buildStatPanel(panelX: number) {
    const pts = GameState.hero.skillPoints ?? 0;
    const cardW = 200;
    const cardH = 80;
    const gap = 16;

    // Points badge — sits just below the column header
    this.add
      .text(panelX, 112, pts > 0 ? `✦ ${pts} to spend` : "no points", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: pts > 0 ? TXT_SKILL_POINTS : TXT_MUTED,
      })
      .setOrigin(0.5);

    const stats: {
      label: string;
      key: "attack" | "defense" | "magic" | "maxHp";
      gain: string;
      sub: string;
    }[] = [
      { label: "ATTACK", key: "attack", gain: "+3", sub: "Physical damage" },
      { label: "DEFENSE", key: "defense", gain: "+2", sub: "Damage reduction" },
      { label: "MAGIC", key: "magic", gain: "+2", sub: "Spell power" },
      { label: "MAX HP", key: "maxHp", gain: "+20", sub: "Max health" },
    ];

    // Cards start below the badge — badge is at y=100, badge height ~22, gap 18 → cards from y=140
    const cardsStartY = 156;

    stats.forEach(({ label, key, gain, sub }, i) => {
      const y = cardsStartY + cardH / 2 + i * (cardH + gap);
      const haspts = pts > 0;
      const val = key === "maxHp" ? GameState.hero.maxHp : GameState.hero[key];

      this.add
        .rectangle(panelX, y, cardW, cardH, haspts ? BG_STAT_CARD_AVAIL : BG_STAT_CARD, 0.95)
        .setStrokeStyle(haspts ? 2 : 1, haspts ? BORDER_STAT_AVAIL : BORDER_LOCKED);

      // Stat name + sub
      this.add.text(panelX - cardW / 2 + 14, y - 22, label, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
      });
      this.add.text(panelX - cardW / 2 + 14, y - 2, sub, {
        fontSize: FONT_SM,
        color: TXT_MUTED,
      });

      // Current value
      this.add.text(panelX - cardW / 2 + 14, y + 16, String(val), {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_LIGHT,
      });

      // Gain label
      this.add.text(panelX - cardW / 2 + 66, y + 16, gain, {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: haspts ? TXT_SKILL_POINTS : TXT_MUTED,
      });

      if (haspts) {
        const btnX = panelX + cardW / 2 - 36;
        const btn = this.add
          .rectangle(btnX, y, 56, 36, BG_BTN_STAT, 0.95)
          .setStrokeStyle(1, BORDER_STAT_AVAIL)
          .setInteractive({ useHandCursor: true });

        this.add
          .text(btnX, y, "+ Add", {
            fontSize: FONT_SM,
            fontFamily: "EnchantedLand",
            color: TXT_SKILL_POINTS,
          })
          .setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(BG_BTN_STAT_HOVER));
        btn.on("pointerout", () => btn.setFillStyle(BG_BTN_STAT));
        btn.on("pointerdown", () => {
          GameState.spendSkillPoint(key);
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        });
      }
    });
  }

  private selectLearned(index: number, moveId: string) {
    this.selectedLearnedIndex = index;
    this.selectedEquippedSlot = -1;

    this.learnedButtons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
        2,
        i === index ? BORDER_GOLD_BRIGHT : BORDER_LOCKED,
      );
    });

    const name = GameState.runConfig!.moves[moveId]?.name;
    this.infoText.setText(`"${name}" selected — click an equipped slot to place it.`);
    this.trySwap(moveId);
  }

  private selectEquipped(slot: number) {
    this.selectedEquippedSlot = slot;

    this.equippedButtons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
        2,
        i === slot ? BORDER_GOLD_BRIGHT : BORDER_LOCKED,
      );
    });

    if (this.selectedLearnedIndex >= 0) {
      const moveId = GameState.hero.learnedMoves[this.selectedLearnedIndex];
      this.trySwap(moveId);
    }
  }

  private trySwap(moveId: string) {
    if (this.selectedEquippedSlot < 0) return;

    const targetSlot = this.selectedEquippedSlot;
    const existingSlot = GameState.hero.equippedMoves.indexOf(moveId);

    if (existingSlot === targetSlot) {
      this.selectedLearnedIndex = -1;
      this.selectedEquippedSlot = -1;
      return;
    }

    if (existingSlot >= 0) {
      const displaced = GameState.hero.equippedMoves[targetSlot];
      GameState.equipMove(existingSlot, displaced);
    }

    GameState.equipMove(targetSlot, moveId);
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.children.removeAll(true);
    this.create({ returnScene: this.returnScene });
  }
}
