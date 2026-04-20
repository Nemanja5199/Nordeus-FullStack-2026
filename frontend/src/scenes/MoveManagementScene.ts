import Phaser from "phaser";
import { GameState } from "../utils/gameState";

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
    this.add.rectangle(0, 0, width, height, 0x08081a, 0.96).setOrigin(0);
    this.add.text(width / 2, 30, "MOVE MANAGEMENT", {
      fontSize: "30px", color: "#ffd700", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(120, 72, "ALL LEARNED MOVES", { fontSize: "16px", color: "#88aaff" }).setOrigin(0.5);
    this.add.text(width - 200, 72, "EQUIPPED (4 slots)", { fontSize: "16px", color: "#aaffaa" }).setOrigin(0.5);

    this.add.text(width / 2, 96, "Click a learned move, then click an equipped slot to swap.", {
      fontSize: "13px", color: "#888888",
    }).setOrigin(0.5);

    this.infoText = this.add.text(width / 2, height - 70, "", {
      fontSize: "14px", color: "#cccccc", wordWrap: { width: width - 40 }, align: "center",
    }).setOrigin(0.5);

    this.buildLearnedPanel(width, height);
    this.buildEquippedPanel(width, height);

    this.makeButton(width / 2, height - 30, "CLOSE", 0x2a2a4a, () => {
      this.scene.stop();
    });
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
      const bg = this.add.rectangle(0, 0, 210, 48, isEquipped ? 0x1a2a3a : 0x1a1a2a, 0.9)
        .setStrokeStyle(1, isEquipped ? 0x4488cc : 0x334466);
      const nameTxt = this.add.text(-98, -12, move.name, { fontSize: "14px", color: "#ffffff", fontStyle: "bold" });
      const typeTxt = this.add.text(-98, 6, `[${move.moveType}]  ${move.description.slice(0, 28)}…`, { fontSize: "11px", color: "#8899aa" });

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
      const bg = this.add.rectangle(0, 0, 210, 48, 0x1a2a1a, 0.9).setStrokeStyle(1, 0x447744);
      const slotLabel = this.add.text(-98, -14, `Slot ${slot + 1}: ${move ? move.name : "(empty)"}`, {
        fontSize: "14px", color: move ? "#aaffaa" : "#556655", fontStyle: "bold",
      });
      const typeTxt = this.add.text(-98, 6, move ? `[${move.moveType}]` : "", { fontSize: "11px", color: "#669966" });

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
      bg.setStrokeStyle(2, i === index ? 0xffd700 : 0x334466);
    });

    this.infoText.setText(`Selected: ${GameState.runConfig!.moves[moveId]?.name} — now click an equipped slot to swap.`);
    this.trySwap(moveId);
  }

  private selectEquipped(slot: number, _container: Phaser.GameObjects.Container) {
    this.selectedEquippedSlot = slot;

    this.equippedButtons.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === slot ? 0xffd700 : 0x447744);
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

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void) {
    const bg = this.add.rectangle(x, y, 180, 42, color, 0.9).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontSize: "18px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    bg.on("pointerover", () => { bg.setAlpha(1); txt.setColor("#ffd700"); });
    bg.on("pointerout", () => { bg.setAlpha(0.9); txt.setColor("#ffffff"); });
    bg.on("pointerdown", cb);
  }
}
