import Phaser from "phaser";
import { Scene, type SceneKey, FONT, MOVE_CARD } from "../constants";
import { createModalFooter, TooltipManager, createScrollableArea, type ScrollableArea } from "../ui";
import { GameState } from "../state";
import type { MoveConfig } from "../types/game";
import { buildMoveStatLines } from "../combat";
import { BG, BORDER, TXT } from "../constants";

interface MoveManagementData {
  returnScene: SceneKey;
}

export class MoveManagementScene extends Phaser.Scene {
  private selectedLearnedIndex = -1;
  private selectedEquippedSlot = -1;
  private learnedButtons: Phaser.GameObjects.Container[] = [];
  private equippedButtons: Phaser.GameObjects.Container[] = [];
  private infoText!: Phaser.GameObjects.Text;
  private tooltip!: TooltipManager;
  private returnScene!: SceneKey;
  private learnedScroll?: ScrollableArea;

  constructor() {
    super(Scene.MoveManagement);
  }

  create(data: MoveManagementData) {
    this.returnScene = data.returnScene ?? Scene.TreeMap;
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.learnedButtons = [];
    this.equippedButtons = [];
    this.learnedScroll?.destroy();
    this.learnedScroll = undefined;

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "MOVE MANAGEMENT", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const colLearnedX = width * 0.22;
    const colEquippedX = width * 0.5;
    const colStatsX = width * 0.78;

    this.add
      .text(colLearnedX, 90, "LEARNED MOVES", {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);
    this.add
      .text(colEquippedX, 90, "EQUIPPED SLOTS", {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);
    this.add
      .text(colStatsX, 90, "STAT POINTS", {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);

    const divAlpha = 0.25;
    const divTop = 90;
    const divBot = height - 80;
    this.add.rectangle(
      width * 0.36,
      (divTop + divBot) / 2,
      1,
      divBot - divTop,
      BORDER.GOLD,
      divAlpha,
    );
    this.add.rectangle(
      width * 0.64,
      (divTop + divBot) / 2,
      1,
      divBot - divTop,
      BORDER.GOLD,
      divAlpha,
    );

    this.infoText = createModalFooter(this, {
      hint: "Hover a move to see its description.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });
    this.tooltip = new TooltipManager(this, this.infoText);

    this.buildLearnedPanel(colLearnedX);
    this.buildEquippedPanel(colEquippedX);
    this.buildStatPanel(colStatsX);
  }

  private showMoveTooltip(move: MoveConfig): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 148;

    this.tooltip.begin();
    this.tooltip.addText(cx, baseY, move.description, {
      fontSize: FONT.SM,
      color: TXT.MUTED,
      wordWrap: { width: width * 0.75 },
      align: "center",
    });
    this.tooltip.addHorizontalRow(buildMoveStatLines(move), baseY + 26, FONT.LG);
  }

  private clearMoveTooltip(): void {
    this.tooltip.clear();
  }

  private buildLearnedPanel(panelX: number) {
    const learned = GameState.hero.learnedMoves;
    const rowStep = MOVE_CARD.H + MOVE_CARD.GAP;
    const contentH = learned.length * rowStep - MOVE_CARD.GAP;
    const { width: scaleW, height: scaleH } = this.scale;
    const viewportH = Math.max(120, scaleH - MOVE_CARD.START_Y - 160);

    this.learnedScroll = createScrollableArea(this, {
      x: 0,
      y: MOVE_CARD.START_Y - MOVE_CARD.H / 2,
      width: scaleW,
      height: viewportH + MOVE_CARD.H,
      contentHeight: contentH + MOVE_CARD.H,
    });

    learned.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const isEquipped = GameState.hero.equippedMoves.includes(moveId);
      const cardCenterY = i * rowStep + MOVE_CARD.H / 2;

      const container = this.add.container(panelX, cardCenterY);
      const bg = this.add
        .rectangle(0, 0, MOVE_CARD.W, MOVE_CARD.H, isEquipped ? BG.MOVE_EQUIPPED : BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, isEquipped ? BORDER.GOLD : BORDER.LOCKED);

      const nameTxt = this.add.text(-MOVE_CARD.W / 2 + 14, -12, move.name, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      });
      const typeTxt = this.add.text(-MOVE_CARD.W / 2 + 14, 10, `[${move.moveType}]`, {
        fontSize: FONT.SM,
        color: TXT.MUTED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectLearned(i, moveId));
      bg.on("pointerover", () => { bg.setAlpha(0.7); this.showMoveTooltip(move); });
      bg.on("pointerout", () => { bg.setAlpha(1); this.clearMoveTooltip(); });

      container.add([bg, nameTxt, typeTxt]);
      this.learnedButtons.push(container);
      this.learnedScroll!.container.add(container);
    });

    this.learnedScroll.refreshInputState();
  }

  private buildEquippedPanel(panelX: number) {
    for (let slot = 0; slot < 4; slot++) {
      const moveId = GameState.hero.equippedMoves[slot];
      const move = moveId ? GameState.runConfig!.moves[moveId] : null;
      const y = MOVE_CARD.START_Y + slot * (MOVE_CARD.H + MOVE_CARD.GAP);

      const container = this.add.container(panelX, y);
      const bg = this.add
        .rectangle(0, 0, MOVE_CARD.W, MOVE_CARD.H, BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER.LOCKED);

      const slotTxt = this.add.text(-MOVE_CARD.W / 2 + 14, -18, `SLOT ${slot + 1}`, {
        fontSize: FONT.XS,
        color: TXT.MUTED,
      });
      const nameTxt = this.add.text(-MOVE_CARD.W / 2 + 14, 4, move ? move.name : "(empty)", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: move ? TXT.HERO : TXT.LOCKED,
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

    this.add
      .text(panelX, 112, pts > 0 ? `✦ ${pts} to spend` : "no points", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: pts > 0 ? TXT.SKILL_POINTS : TXT.MUTED,
      })
      .setOrigin(0.5);

    const stats: {
      label: string;
      key: "attack" | "defense" | "magic" | "maxHp";
      gain: string;
      sub: string;
    }[] = [
      { label: "ATTACK", key: "attack", gain: "+2", sub: "Physical damage" },
      { label: "DEFENSE", key: "defense", gain: "+2", sub: "Damage reduction" },
      { label: "MAGIC", key: "magic", gain: "+3", sub: "Spell power" },
      { label: "MAX HP", key: "maxHp", gain: "+8", sub: "Max health" },
    ];

    const cardsStartY = 156;

    stats.forEach(({ label, key, gain, sub }, i) => {
      const y = cardsStartY + cardH / 2 + i * (cardH + gap);
      const haspts = pts > 0;
      const val = key === "maxHp" ? GameState.hero.maxHp : GameState.hero[key];

      this.add
        .rectangle(panelX, y, cardW, cardH, haspts ? BG.STAT_CARD_AVAIL : BG.STAT_CARD, 0.95)
        .setStrokeStyle(haspts ? 2 : 1, haspts ? BORDER.STAT_AVAIL : BORDER.LOCKED);

      this.add.text(panelX - cardW / 2 + 14, y - 22, label, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
      });
      this.add.text(panelX - cardW / 2 + 14, y - 2, sub, {
        fontSize: FONT.SM,
        color: TXT.MUTED,
      });

      this.add.text(panelX - cardW / 2 + 14, y + 16, String(val), {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      });

      this.add.text(panelX - cardW / 2 + 66, y + 16, gain, {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: haspts ? TXT.SKILL_POINTS : TXT.MUTED,
      });

      if (haspts) {
        const btnX = panelX + cardW / 2 - 36;
        const btn = this.add
          .rectangle(btnX, y, 56, 36, BG.BTN_STAT, 0.95)
          .setStrokeStyle(1, BORDER.STAT_AVAIL)
          .setInteractive({ useHandCursor: true });

        this.add
          .text(btnX, y, "+ Add", {
            fontSize: FONT.SM,
            fontFamily: "EnchantedLand",
            color: TXT.SKILL_POINTS,
          })
          .setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(BG.BTN_STAT_HOVER));
        btn.on("pointerout", () => btn.setFillStyle(BG.BTN_STAT));
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
        i === index ? BORDER.GOLD_BRIGHT : BORDER.LOCKED,
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
        i === slot ? BORDER.GOLD_BRIGHT : BORDER.LOCKED,
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