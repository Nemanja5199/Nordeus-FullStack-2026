import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import { createModalFooter, Toggle, Slider } from "../ui";
import { Settings } from "../state";
import { Audio, SfxPlayer, Sfx } from "../audio";
import { BG, TXT } from "../constants";

interface OptionsData {
  returnScene?: SceneKey;
}

export class OptionsScene extends Phaser.Scene {
  private returnScene: SceneKey = Scene.MainMenu;

  constructor() {
    super(Scene.Options);
  }

  create(data: OptionsData = {}) {
    this.returnScene = data.returnScene ?? Scene.MainMenu;
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 60, "OPTIONS", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const startY = height * 0.22;
    const rowGap = 120;

    new Slider(this, width / 2, startY, "Music Volume", "Adjusts background music.", {
      read: () => Settings.musicVolume(),
      onChange: (v) => {
        Settings.setMusicVolume(v);
        Audio.applyMasterVolume();
      },
    });

    // ~150ms throttle — playing on every drag event would machine-gun click.
    let lastSfxPreview = 0;
    new Slider(this, width / 2, startY + rowGap, "SFX Volume", "Adjusts sound effects.", {
      read: () => Settings.sfxVolume(),
      onChange: (v) => {
        Settings.setSfxVolume(v);
        const now = performance.now();
        if (now - lastSfxPreview > 150) {
          lastSfxPreview = now;
          SfxPlayer.play(this, Sfx.ButtonClick);
        }
      },
    });

    new Toggle(
      this,
      width / 2,
      startY + rowGap * 2,
      "Fast Animations",
      "Speeds up battle animations (lunges, hits, HP bars) for quicker turns.",
      {
        read: () => Settings.fastAnimations(),
        onToggle: () => Settings.toggleFastAnimations(),
      },
    );

    new Toggle(
      this,
      width / 2,
      startY + rowGap * 3,
      "Screen Shake",
      "Camera shake on heavy hits. Disable if it bothers you.",
      {
        read: () => Settings.screenShake(),
        onToggle: () => Settings.toggleScreenShake(),
      },
    );

    createModalFooter(this, {
      hint: "",
      onClose: () => this.close(),
    });

    this.input.keyboard?.once("keydown-ESC", () => this.close());
  }

  private close() {
    this.scene.start(this.returnScene);
  }
}
