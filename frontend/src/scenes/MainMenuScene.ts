import Phaser from "phaser";
import { api } from "../services/api";
import { GameState } from "../utils/gameState";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0a0a1e).setOrigin(0);

    // Stars
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Math.random() < 0.3 ? 2 : 1;
      this.add.circle(x, y, size, 0xffffff, Math.random() * 0.8 + 0.2);
    }

    this.add
      .text(width / 2, height * 0.22, "RPG GAUNTLET", {
        fontSize: "64px",
        color: "#ffd700",
        fontStyle: "bold",
        stroke: "#8b6914",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.36, "Five monsters. One hero.\nCan you survive the gauntlet?", {
        fontSize: "20px",
        color: "#c0c0c0",
        align: "center",
      })
      .setOrigin(0.5);

    this.makeButton(width / 2, height * 0.55, "NEW GAME", 0x2e6b2e, () => this.startNewGame());
    this.makeButton(width / 2, height * 0.67, "CONTINUE", 0x1e3f6b, () => this.continueGame());
    this.makeButton(width / 2, height * 0.79, "RESET PROGRESS", 0x5a1a1a, () => this.resetProgress());
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void) {
    const bg = this.add.rectangle(x, y, 280, 52, color, 0.9).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontSize: "22px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

    bg.on("pointerover", () => { bg.setAlpha(1); txt.setColor("#ffd700"); });
    bg.on("pointerout", () => { bg.setAlpha(0.9); txt.setColor("#ffffff"); });
    bg.on("pointerdown", cb);
  }

  private async startNewGame() {
    const loading = this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Loading...", { fontSize: "18px", color: "#aaa" })
      .setOrigin(0.5);

    try {
      const config = await api.getRunConfig();
      GameState.runConfig = config;
      GameState.initHero(config);
      GameState.clearRun();
      this.scene.start("MapScene", { monsterIndex: 0, defeatedIds: [] });
    } catch {
      loading.setText("Failed to connect to server. Is it running?").setColor("#ff4444");
    }
  }

  private async continueGame() {
    const loading = this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Loading save...", { fontSize: "18px", color: "#aaa" })
      .setOrigin(0.5);

    try {
      const config = await api.getRunConfig();
      GameState.runConfig = config;
      GameState.initHero(config);
      const runSave = GameState.loadRun();
      if (runSave) {
        this.scene.start("MapScene", {
          monsterIndex: runSave.currentMonsterIndex,
          defeatedIds: runSave.defeatedMonsterIds,
        });
      } else {
        loading.setText("No save found — starting new game.").setColor("#ffcc00");
        this.time.delayedCall(1500, () => this.startNewGame());
      }
    } catch {
      loading.setText("Failed to connect to server.").setColor("#ff4444");
    }
  }

  private resetProgress() {
    if (GameState.runConfig) GameState.resetHero(GameState.runConfig);
    GameState.clearRun();
    localStorage.removeItem("rpg_hero");
    this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Progress reset!", { fontSize: "18px", color: "#ff8888" })
      .setOrigin(0.5);
  }
}
