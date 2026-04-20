import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createButton, BTN_SM } from "../ui/Button";
import {
  BG_DARKEST, BG_MOVE_CARD, BG_MOVE_EQUIPPED, BG_BTN_CLOSE,
  BORDER_GOLD, BORDER_GOLD_BRIGHT, BORDER_LOCKED,
  TXT_GOLD, TXT_GOLD_LIGHT, TXT_GOLD_MID, TXT_MUTED, TXT_HERO, TXT_LOCKED,
} from "../ui/colors";

interface MoveManagementData {
  returnScene: string;
}

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

    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.96).setOrigin(0);

    this.add.text(width / 2, 32, "MOVE MANAGEMENT", {
      fontSize: "32px", fontFamily: "EnchantedLand", color: TXT_GOLD,
      stroke: "#4a3010", strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 4, 72, "LEARNED MOVES", {
      fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID,
    }).setOrigin(0.5);

    this.add.text((width * 3) / 4, 72, "EQUIPPED SLOTS", {
      fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID,
    }).setOrigin(0.5);

    this.infoText = this.add.text(width / 2, height - 68, "Hover a move to see its description.", {
      fontSize: "14px", color: TXT_MUTED, wordWrap: { width: width - 60 }, align: "center",
    }).setOrigin(0.5);

    this.buildLearnedPanel(width);
    this.buildEquippedPanel(width);

    createButton(this, width / 2, height - 28, {
      ...BTN_SM, label: "CLOSE", color: BG_BTN_CLOSE,
      onClick: () => this.scene.stop(),
    });
  }

  private buildLearnedPanel(width: number) {
    const startY = 110;
    const cardW  = 220;
    const cardH  = 44;
    const panelX = width / 4;

    GameState.hero.learnedMoves.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const isEquipped = GameState.hero.equippedMoves.includes(moveId);
      const y = startY + i * (cardH + 10);

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH,
        isEquipped ? BG_MOVE_EQUIPPED : BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, isEquipped ? BORDER_GOLD : BORDER_LOCKED);

      const nameTxt = this.add.text(-cardW / 2 + 12, -8, move.name, {
        fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT,
      });
      const typeTxt = this.add.text(-cardW / 2 + 12, 9, `[${move.moveType}]`, {
        fontSize: "11px", color: TXT_MUTED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectLearned(i, moveId));
      bg.on("pointerover", () => {
        bg.setAlpha(0.7);
        this.infoText.setText(move.description);
      });
      bg.on("pointerout", () => {
        bg.setAlpha(1);
        this.infoText.setText("Hover a move to see its description.");
      });

      container.add([bg, nameTxt, typeTxt]);
      this.learnedButtons.push(container);
    });
  }

  private buildEquippedPanel(width: number) {
    const startY = 110;
    const cardW  = 220;
    const cardH  = 44;
    const panelX = (width * 3) / 4;

    for (let slot = 0; slot < 4; slot++) {
      const moveId = GameState.hero.equippedMoves[slot];
      const move   = moveId ? GameState.runConfig!.moves[moveId] : null;
      const y = startY + slot * (cardH + 10);

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH, BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER_LOCKED);

      const slotTxt = this.add.text(-cardW / 2 + 12, -14, `SLOT ${slot + 1}`, {
        fontSize: "10px", color: TXT_MUTED,
      });
      const nameTxt = this.add.text(-cardW / 2 + 12, 3, move ? move.name : "(empty)", {
        fontSize: "15px", fontFamily: "EnchantedLand",
        color: move ? TXT_HERO : TXT_LOCKED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectEquipped(slot));
      bg.on("pointerover", () => {
        bg.setAlpha(0.7);
        if (move) this.infoText.setText(move.description);
      });
      bg.on("pointerout", () => {
        bg.setAlpha(1);
        this.infoText.setText("Hover a move to see its description.");
      });

      container.add([bg, slotTxt, nameTxt]);
      this.equippedButtons.push(container);
    }
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
