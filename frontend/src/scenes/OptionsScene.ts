import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import { createModalFooter } from "../ui";
import { Settings } from "../state";
import { Audio, SfxPlayer, Sfx } from "../audio";
import { BG, BORDER, TXT } from "../constants";

interface OptionsData {
  returnScene?: SceneKey;
}

interface ToggleRow {
  label: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text;
  desc: Phaser.GameObjects.Text;
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

    this.buildSliderRow(
      width / 2,
      startY,
      "Music Volume",
      "Adjusts background music.",
      () => Settings.musicVolume(),
      (v) => {
        Settings.setMusicVolume(v);
        Audio.applyMasterVolume();
      },
    );

    // ~150ms throttle — playing on every drag event would machine-gun click.
    let lastSfxPreview = 0;
    this.buildSliderRow(
      width / 2,
      startY + rowGap,
      "SFX Volume",
      "Adjusts sound effects.",
      () => Settings.sfxVolume(),
      (v) => {
        Settings.setSfxVolume(v);
        const now = performance.now();
        if (now - lastSfxPreview > 150) {
          lastSfxPreview = now;
          SfxPlayer.play(this, Sfx.ButtonClick);
        }
      },
    );

    this.buildToggleRow(
      width / 2,
      startY + rowGap * 2,
      "Fast Animations",
      "Speeds up battle animations (lunges, hits, HP bars) for quicker turns.",
      () => Settings.fastAnimations(),
      () => Settings.toggleFastAnimations(),
    );

    this.buildToggleRow(
      width / 2,
      startY + rowGap * 3,
      "Screen Shake",
      "Camera shake on heavy hits. Disable if it bothers you.",
      () => Settings.screenShake(),
      () => Settings.toggleScreenShake(),
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

  private buildToggleRow(
    cx: number,
    cy: number,
    title: string,
    description: string,
    read: () => boolean,
    onToggle: () => void,
  ): ToggleRow {
    const boxSize = 32;
    const boxX = cx - 240;

    const label = this.add
      .text(boxX + 50, cy, title, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: read() ? TXT.GOLD : TXT.MUTED,
      })
      .setOrigin(0, 0.5);

    this.add
      .rectangle(boxX, cy, boxSize, boxSize, BG.BLACK)
      .setStrokeStyle(2, 0xb0b0b0)
      .setOrigin(0.5);

    const check = this.add
      .text(boxX, cy, "✓", {
        fontSize: FONT.LG,
        color: TXT.GOLD,
      })
      .setOrigin(0.5)
      .setVisible(read());

    const desc = this.add
      .text(boxX, cy + 36, description, {
        fontSize: FONT.BODY,
        color: TXT.GOLD_LIGHT,
        wordWrap: { width: 540 },
      })
      .setOrigin(0, 0);

    const hitWidth = 480;
    const hitHeight = 48;
    this.add
      .zone(boxX - boxSize / 2 - 6, cy - hitHeight / 2, hitWidth, hitHeight)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        onToggle();
        const on = read();
        check.setVisible(on);
        label.setColor(on ? TXT.GOLD : TXT.MUTED);
      });

    return { label, check, desc };
  }

  // Click-to-set track + draggable handle. onChange fires every drag tick
  // so music volume reacts live, not only on release.
  private buildSliderRow(
    cx: number,
    cy: number,
    title: string,
    description: string,
    read: () => number,
    onChange: (v: number) => void,
  ): void {
    const trackW = 360;
    const trackH = 10;
    const trackX = cx - 240;
    const trackY = cy + 8;

    this.add
      .text(trackX, cy - 16, title, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
      })
      .setOrigin(0, 0.5);

    const track = this.add
      .rectangle(trackX, trackY, trackW, trackH, BG.BLACK)
      .setStrokeStyle(2, BORDER.GOLD)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    const fill = this.add
      .rectangle(trackX, trackY, trackW * read(), trackH - 4, 0xc8a035, 1)
      .setOrigin(0, 0.5);

    const handle = this.add
      .circle(trackX + trackW * read(), trackY, 12, 0xe8c060)
      .setStrokeStyle(2, 0x000000)
      .setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(handle, true);

    const valueText = this.add
      .text(trackX + trackW + 18, trackY, `${Math.round(read() * 100)}%`, {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(trackX, cy + 36, description, {
        fontSize: FONT.BODY,
        color: TXT.GOLD_LIGHT,
        wordWrap: { width: 540 },
      })
      .setOrigin(0, 0);

    const apply = (rawX: number) => {
      const ratio = Math.max(0, Math.min(1, (rawX - trackX) / trackW));
      onChange(ratio);
      fill.width = trackW * ratio;
      handle.x = trackX + trackW * ratio;
      valueText.setText(`${Math.round(ratio * 100)}%`);
    };

    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => apply(pointer.x));
    handle.on("drag", (_p: Phaser.Input.Pointer, dragX: number) => apply(dragX));
  }
}
