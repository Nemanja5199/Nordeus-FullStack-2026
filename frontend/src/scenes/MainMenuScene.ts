import Phaser from "phaser";
import { FONT_MD, FONT_GAME_TITLE, FONT_TAGLINE, FONT_SM } from "../ui/typography";
import { api } from "../services/api";
import { GameState } from "../utils/gameState";
import { TestMode } from "../utils/testMode";
import { Audio, TrackGroup } from "../utils/audio";
import { createButton, BTN_LG } from "../ui/Button";
import {
  BG_BLACK,
  BG_BTN_SUCCESS,
  BG_BTN_NEUTRAL,
  BG_BTN_DANGER,
  DUST_MOTE_COLOR,
  TXT_GOLD,
  TXT_STROKE_TITLE,
  TXT_TAGLINE,
  TXT_MUTED,
  TXT_BOSS,
} from "../ui/colors";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create() {
    const { width, height } = this.scale;

    Audio.play(this, TrackGroup.Menu);

    this.add.tileSprite(0, 0, width, height, "bg_brick").setOrigin(0);
    this.add.rectangle(0, 0, width, height, BG_BLACK, 0.62).setOrigin(0);

    // Dust motes
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Math.random() < 0.3 ? 2 : 1;
      this.add.circle(x, y, size, DUST_MOTE_COLOR, Math.random() * 0.35 + 0.05);
    }

    this.add
      .text(width / 2, height * 0.22, "RPG Gauntlet", {
        fontSize: FONT_GAME_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_TITLE,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.36, "Five monsters. One hero.\nCan you survive the gauntlet?", {
        fontSize: FONT_TAGLINE,
        fontFamily: "EnchantedLand",
        color: TXT_TAGLINE,
        align: "center",
      })
      .setOrigin(0.5);

    const hasSave = !!localStorage.getItem("rpg_tree_state");
    const btnY = height * 0.5;
    const btnGap = 72;
    let row = 0;
    createButton(this, width / 2, btnY + btnGap * row++, {
      ...BTN_LG,
      label: "NEW GAME",
      color: BG_BTN_SUCCESS,
      onClick: () => this.startNewGame(),
    });
    if (hasSave) {
      createButton(this, width / 2, btnY + btnGap * row++, {
        ...BTN_LG,
        label: "CONTINUE",
        color: BG_BTN_NEUTRAL,
        onClick: () => this.continueGame(),
      });
      createButton(this, width / 2, btnY + btnGap * row++, {
        ...BTN_LG,
        label: "RESET PROGRESS",
        color: BG_BTN_DANGER,
        onClick: () => this.resetProgress(),
      });
    }
    createButton(this, width / 2, btnY + btnGap * row++, {
      ...BTN_LG,
      label: "OPTIONS",
      color: BG_BTN_NEUTRAL,
      onClick: () => this.scene.start("OptionsScene", { returnScene: "MainMenuScene" }),
    });

    this.createTestModeToggle();
  }

  // Bottom-right dev toggle: gives the next-started run god stats + a full kit.
  // Clears the persisted hero on flip so changes apply on the next NEW GAME
  // without the player having to reset progress manually.
  private createTestModeToggle() {
    const { width, height } = this.scale;
    const padX = 24;
    const padY = 24;
    const boxSize = 18;

    const labelText = this.add
      .text(width - padX, height - padY, "Test Mode", {
        fontSize: FONT_SM,
        color: TestMode.isOn() ? TXT_GOLD : TXT_MUTED,
      })
      .setOrigin(1, 0.5);

    const boxX = labelText.x - labelText.width - 14;
    this.add
      .rectangle(boxX, height - padY, boxSize, boxSize, BG_BLACK)
      .setStrokeStyle(2, 0xb0b0b0)
      .setOrigin(0.5);

    const check = this.add
      .text(boxX, height - padY, "✓", {
        fontSize: FONT_SM,
        color: TXT_GOLD,
      })
      .setOrigin(0.5)
      .setVisible(TestMode.isOn());

    const hitWidth = labelText.width + boxSize + 24;
    const hitX = width - padX - hitWidth;
    this.add
      .zone(hitX, height - padY - 16, hitWidth, 32)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        const on = TestMode.toggle();
        check.setVisible(on);
        labelText.setColor(on ? TXT_GOLD : TXT_MUTED);
        // Drop the saved hero so the next NEW GAME picks up the new defaults.
        localStorage.removeItem("rpg_hero");
      });
  }

  private async startNewGame() {
    const loading = this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Loading...", {
        fontSize: FONT_MD,
        color: TXT_MUTED,
      })
      .setOrigin(0.5);

    try {
      const config = await api.getRunConfig();
      this.scene.start("CharacterSelectScene", { runConfig: config });
    } catch {
      loading.setText("Failed to connect to server. Is it running?").setColor(TXT_BOSS);
    }
  }

  private async continueGame() {
    const loading = this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Loading save...", {
        fontSize: FONT_MD,
        color: TXT_MUTED,
      })
      .setOrigin(0.5);

    try {
      GameState.loadTreeState();
      const config = await api.getRunConfig(GameState.runSeed ?? undefined);
      GameState.runConfig = config;
      GameState.initHero(config);
      if (localStorage.getItem("rpg_tree_state")) {
        this.scene.start("TreeMapScene");
      } else {
        loading.setText("No save found — starting new game.").setColor(TXT_GOLD);
        this.time.delayedCall(1500, () => this.startNewGame());
      }
    } catch {
      loading.setText("Failed to connect to server.").setColor(TXT_BOSS);
    }
  }

  private resetProgress() {
    if (GameState.runConfig) GameState.resetHero(GameState.runConfig);
    GameState.clearRun();
    localStorage.removeItem("rpg_hero");
    this.add
      .text(this.scale.width / 2, this.scale.height * 0.91, "Progress reset.", {
        fontSize: FONT_MD,
        color: TXT_BOSS,
      })
      .setOrigin(0.5);
  }
}
