import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createButton, BTN_SM } from "../ui/Button";

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
    this.add.rectangle(0, 0, width, height, 0x0d0905, 0.96).setOrigin(0);
    this.add.text(width / 2, 30, "MOVE MANAGEMENT", {
      fontSize: "30px", color: "#c8a035", fontStyle: "bold", stroke: "#4a3010", strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(120, 72, "ALL LEARNED MOVES", { fontSize: "16px", color: "#c8a035" }).setOrigin(0.5);
    this.add.text(width - 200, 72, "EQUIPPED (4 slots)", { fontSize: "16px", color: "#c8a035" }).setOrigin(0.5);

    this.add.text(width / 2, 96, "Click a learned move, then click an equipped slot to swap.", {
      fontSize: "13px", color: "#8a7a5a",
    }).setOrigin(0.5);

    this.infoText = this.add.text(width / 2, height - 70, "", {
      fontSize: "14px", color: "#d4b483", wordWrap: { width: width - 40 }, align: "center",
    }).setOrigin(0.5);

    this.buildLearnedPanel(width, height);
    this.buildEquippedPanel(width, height);

    createButton(this, width / 2, height - 30, { ...BTN_SM, label: "CLOSE", color: 0x2a2a4a, onClick: () => this.scene.stop() });
  }

  private buildLearnedPanel(_width: number, _height: number) {
    const startY = 120;
    const learned = GameState.hero.learnedMoves;
    const panelX = 110;

    learned.forEach((moveId, i) => {
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;
      const y = startY + i * 54;
      const isEquipped = GameState.hero.equippedMoves.includes(moveId);

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, 210, 48, isEquipped ? 0x1e1a10 : 0x1c1408, 0.9)
        .setStrokeStyle(1, isEquipped ? 0x7a5828 : 0x4a3818);
      const nameTxt = this.add.text(-98, -12, move.name, { fontSize: "14px", color: "#d4b483", fontStyle: "bold" });
      const typeTxt = this.add.text(-98, 6, `[${move.moveType}]  ${move.description.slice(0, 28)}…`, { fontSize: "11px", color: "#8a7a5a" });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectLearned(i, moveId, container));
      bg.on("pointerover", () => { bg.setAlpha(0.7); this.infoText.setText(move.description); });
      bg.on("pointerout", () => bg.setAlpha(1));

      container.add([bg, nameTxt, typeTxt]);
      this.learnedButtons.push(container);
    });
  }

  private buildEquippedPanel(width: number, _height: number) {
    const startY = 120;
    const equipped = GameState.hero.equippedMoves;
    const panelX = width - 200;

    for (let slot = 0; slot < 4; slot++) {
      const moveId = equipped[slot];
      const move = moveId ? GameState.runConfig!.moves[moveId] : null;
      const y = startY + slot * 54;

      const container = this.add.container(panelX, y);
      const bg = this.add.rectangle(0, 0, 210, 48, 0x1c1408, 0.9).setStrokeStyle(1, 0x4a3818);
      const slotLabel = this.add.text(-98, -14, `Slot ${slot + 1}: ${move ? move.name : "(empty)"}`, {
        fontSize: "14px", color: move ? "#a8c888" : "#4a3818", fontStyle: "bold",
      });
      const typeTxt = this.add.text(-98, 6, move ? `[${move.moveType}]` : "", { fontSize: "11px", color: "#8a7a5a" });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => this.selectEquipped(slot, container));
      bg.on("pointerover", () => { bg.setAlpha(0.7); if (move) this.infoText.setText(move.description); });
      bg.on("pointerout", () => bg.setAlpha(1));

      container.add([bg, slotLabel, typeTxt]);
      this.equippedButtons.push(container);
    }
  }

  private selectLearned(index: number, moveId: string, _container: Phaser.GameObjects.Container) {
    this.selectedLearnedIndex = index;
    this.selectedEquippedSlot = -1;

    // Highlight selection
    this.learnedButtons.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === index ? 0xb88820 : 0x4a3818);
    });

    this.infoText.setText(`Selected: ${GameState.runConfig!.moves[moveId]?.name} — now click an equipped slot to swap.`);
    this.trySwap(moveId);
  }

  private selectEquipped(slot: number, _container: Phaser.GameObjects.Container) {
    this.selectedEquippedSlot = slot;

    this.equippedButtons.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === slot ? 0xb88820 : 0x4a3818);
    });

    if (this.selectedLearnedIndex >= 0) {
      const moveId = GameState.hero.learnedMoves[this.selectedLearnedIndex];
      this.trySwap(moveId);
    }
  }

  private trySwap(moveId: string) {
    if (this.selectedEquippedSlot < 0) return;
    GameState.equipMove(this.selectedEquippedSlot, moveId);
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    // Rebuild panels to reflect new state
    this.children.removeAll(true);
    this.create({ returnScene: this.returnScene });
  }

}

