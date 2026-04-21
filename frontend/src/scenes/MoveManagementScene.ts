import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createButton, BTN_SM } from "../ui/Button";
import {
  BG_DARKEST, BG_MOVE_CARD, BG_MOVE_EQUIPPED, BG_BTN_CLOSE,
  BORDER_GOLD, BORDER_GOLD_BRIGHT, BORDER_LOCKED,
  TXT_GOLD, TXT_GOLD_LIGHT, TXT_GOLD_MID, TXT_MUTED, TXT_HERO, TXT_LOCKED,
  BG_STAT_CARD, BG_STAT_CARD_AVAIL, BORDER_STAT_AVAIL, TXT_SKILL_POINTS,
} from "../ui/colors";

interface MoveManagementData {
  returnScene: string;
}

// Layout constants
const CARD_W   = 270;
const CARD_H   = 58;
const CARD_GAP = 12;
const START_Y  = 114;

export class MoveManagementScene extends Phaser.Scene {
  private selectedLearnedIndex = -1;
  private selectedEquippedSlot = -1;
  private learnedButtons: Phaser.GameObjects.Container[] = [];
  private equippedButtons: Phaser.GameObjects.Container[] = [];
  private infoText!: Phaser.GameObjects.Text;
  private returnScene!: string;

  constructor() {
    super("MoveManagementScene");
  }

  create(data: MoveManagementData) {
    this.returnScene = data.returnScene ?? "MapScene";
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.learnedButtons = [];
    this.equippedButtons = [];

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0);

    this.add.text(width / 2, 34, "MOVE MANAGEMENT", {
      fontSize: "36px", fontFamily: "EnchantedLand", color: TXT_GOLD,
      stroke: "#4a3010", strokeThickness: 3,
    }).setOrigin(0.5);

    // Column X positions
    const colLearnedX  = width * 0.22;
    const colEquippedX = width * 0.50;
    const colStatsX    = width * 0.78;

    this.add.text(colLearnedX,  78, "LEARNED MOVES",  { fontSize: "16px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID }).setOrigin(0.5);
    this.add.text(colEquippedX, 78, "EQUIPPED SLOTS", { fontSize: "16px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID }).setOrigin(0.5);
    this.add.text(colStatsX,    78, "STAT POINTS",    { fontSize: "16px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID }).setOrigin(0.5);

    // Vertical dividers
    const divAlpha = 0.25;
    const divTop   = 90;
    const divBot   = height - 80;
    this.add.rectangle(width * 0.36, (divTop + divBot) / 2, 1, divBot - divTop, BORDER_GOLD, divAlpha);
    this.add.rectangle(width * 0.64, (divTop + divBot) / 2, 1, divBot - divTop, BORDER_GOLD, divAlpha);

    this.infoText = this.add.text(width * 0.32, height - 52,
      "Hover a move to see its description.", {
        fontSize: "15px", color: TXT_MUTED,
        wordWrap: { width: width * 0.60 }, align: "center",
      }).setOrigin(0.5);

    this.buildLearnedPanel(colLearnedX);
    this.buildEquippedPanel(colEquippedX);
    this.buildStatPanel(colStatsX, height);

    createButton(this, width / 2, height - 22, {
      ...BTN_SM, label: "CLOSE", color: BG_BTN_CLOSE,
      onClick: () => this.scene.stop(),
    });
  }

  private buildLearnedPanel(panelX: number) {
    GameState.hero.learnedMoves.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const isEquipped = GameState.hero.equippedMoves.includes(moveId);
      const y = START_Y + i * (CARD_H + CARD_GAP);

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, CARD_W, CARD_H,
        isEquipped ? BG_MOVE_EQUIPPED : BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, isEquipped ? BORDER_GOLD : BORDER_LOCKED);

      const nameTxt = this.add.text(-CARD_W / 2 + 14, -12, move.name, {
        fontSize: "18px", fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT,
      });
      const typeTxt = this.add.text(-CARD_W / 2 + 14, 10, `[${move.moveType}]`, {
        fontSize: "13px", color: TXT_MUTED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectLearned(i, moveId));
      bg.on("pointerover", () => { bg.setAlpha(0.7); this.infoText.setText(move.description); });
      bg.on("pointerout",  () => { bg.setAlpha(1);   this.infoText.setText("Hover a move to see its description."); });

      container.add([bg, nameTxt, typeTxt]);
      this.learnedButtons.push(container);
    });
  }

  private buildEquippedPanel(panelX: number) {
    for (let slot = 0; slot < 4; slot++) {
      const moveId = GameState.hero.equippedMoves[slot];
      const move   = moveId ? GameState.runConfig!.moves[moveId] : null;
      const y = START_Y + slot * (CARD_H + CARD_GAP);

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);

      const slotTxt = this.add.text(-CARD_W / 2 + 14, -18, `SLOT ${slot + 1}`, {
        fontSize: "11px", color: TXT_MUTED,
      });
      const nameTxt = this.add.text(-CARD_W / 2 + 14, 4, move ? move.name : "(empty)", {
        fontSize: "18px", fontFamily: "EnchantedLand",
        color: move ? TXT_HERO : TXT_LOCKED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectEquipped(slot));
      bg.on("pointerover", () => { bg.setAlpha(0.7); if (move) this.infoText.setText(move.description); });
      bg.on("pointerout",  () => { bg.setAlpha(1);   this.infoText.setText("Hover a move to see its description."); });

      container.add([bg, slotTxt, nameTxt]);
      this.equippedButtons.push(container);
    }
  }

  private buildStatPanel(panelX: number, height: number) {
    const pts  = GameState.hero.skillPoints ?? 0;
    const cardW = 200;
    const cardH = 80;
    const gap   = 16;

    // Points badge — sits just below the column header
    this.add.text(panelX, 100, pts > 0 ? `✦ ${pts} to spend` : "no points", {
      fontSize: "18px", fontFamily: "EnchantedLand",
      color: pts > 0 ? TXT_SKILL_POINTS : TXT_MUTED,
    }).setOrigin(0.5);

    const stats: { label: string; key: "attack"|"defense"|"magic"|"maxHp"; gain: string; sub: string }[] = [
      { label: "ATTACK",  key: "attack",  gain: "+3",  sub: "Physical damage" },
      { label: "DEFENSE", key: "defense", gain: "+2",  sub: "Damage reduction" },
      { label: "MAGIC",   key: "magic",   gain: "+2",  sub: "Spell power" },
      { label: "MAX HP",  key: "maxHp",   gain: "+20", sub: "Max health" },
    ];

    // Cards start below the badge — badge is at y=100, badge height ~22, gap 18 → cards from y=140
    const cardsStartY = 140;

    stats.forEach(({ label, key, gain, sub }, i) => {
      const y      = cardsStartY + cardH / 2 + i * (cardH + gap);
      const haspts = pts > 0;
      const val    = key === "maxHp" ? GameState.hero.maxHp : GameState.hero[key];

      const bg = this.add.rectangle(panelX, y, cardW, cardH,
        haspts ? BG_STAT_CARD_AVAIL : BG_STAT_CARD, 0.95)
        .setStrokeStyle(haspts ? 2 : 1, haspts ? BORDER_STAT_AVAIL : BORDER_LOCKED);

      // Stat name + sub
      this.add.text(panelX - cardW / 2 + 14, y - 22, label, {
        fontSize: "17px", fontFamily: "EnchantedLand", color: TXT_GOLD,
      });
      this.add.text(panelX - cardW / 2 + 14, y - 2, sub, {
        fontSize: "12px", color: TXT_MUTED,
      });

      // Current value
      this.add.text(panelX - cardW / 2 + 14, y + 16, String(val), {
        fontSize: "22px", fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT,
      });

      // Gain label
      this.add.text(panelX - cardW / 2 + 66, y + 16, gain, {
        fontSize: "15px", fontFamily: "EnchantedLand",
        color: haspts ? TXT_SKILL_POINTS : TXT_MUTED,
      });

      if (haspts) {
        const btnX = panelX + cardW / 2 - 36;
        const btn = this.add.rectangle(btnX, y, 56, 36, 0x2a4a18, 0.95)
          .setStrokeStyle(1, BORDER_STAT_AVAIL)
          .setInteractive({ useHandCursor: true });

        this.add.text(btnX, y, "+ Add", {
          fontSize: "14px", fontFamily: "EnchantedLand", color: TXT_SKILL_POINTS,
        }).setOrigin(0.5);

        btn.on("pointerover",  () => btn.setFillStyle(0x3a6a24));
        btn.on("pointerout",   () => btn.setFillStyle(0x2a4a18));
        btn.on("pointerdown",  () => {
          GameState.spendSkillPoint(key);
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        });
      }

      void bg;
    });
  }

  private selectLearned(index: number, moveId: string) {
    this.selectedLearnedIndex = index;
    this.selectedEquippedSlot = -1;

    this.learnedButtons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle)
        .setStrokeStyle(2, i === index ? BORDER_GOLD_BRIGHT : BORDER_LOCKED);
    });

    const name = GameState.runConfig!.moves[moveId]?.name;
    this.infoText.setText(`"${name}" selected — click an equipped slot to place it.`);
    this.trySwap(moveId);
  }

  private selectEquipped(slot: number) {
    this.selectedEquippedSlot = slot;

    this.equippedButtons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle)
        .setStrokeStyle(2, i === slot ? BORDER_GOLD_BRIGHT : BORDER_LOCKED);
    });

    if (this.selectedLearnedIndex >= 0) {
      const moveId = GameState.hero.learnedMoves[this.selectedLearnedIndex];
      this.trySwap(moveId);
    }
  }

  private trySwap(moveId: string) {
    if (this.selectedEquippedSlot < 0) return;

    const targetSlot   = this.selectedEquippedSlot;
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
