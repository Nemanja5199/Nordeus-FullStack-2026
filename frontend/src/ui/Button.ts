import Phaser from "phaser";
import { TXT_GOLD, TXT_GOLD_LIGHT } from "./colors";
import { FONT_LG, FONT_MD } from "./typography";

export interface ButtonOptions {
  label: string;
  color: number;
  onClick: () => void;
  width?: number;
  height?: number;
  fontSize?: string;
  lineSpacing?: number;
  letterSpacing?: number;
}

// Size presets
export const BTN_LG: Partial<ButtonOptions> = { width: 280, height: 52, fontSize: FONT_LG };
export const BTN_MD: Partial<ButtonOptions> = { width: 240, height: 48, fontSize: FONT_LG };
export const BTN_SM: Partial<ButtonOptions> = { width: 180, height: 42, fontSize: FONT_MD };

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: ButtonOptions,
): Phaser.GameObjects.Container {
  const w = opts.width ?? 240;
  const h = opts.height ?? 48;
  const fs = opts.fontSize ?? FONT_LG;

  const bg = scene.add
    .rectangle(0, 0, w, h, opts.color, 0.9)
    .setInteractive({ useHandCursor: true });
  const txt = scene.add
    .text(0, 0, opts.label, {
      fontSize: fs,
      color: TXT_GOLD_LIGHT,
      fontFamily: "EnchantedLand",
      lineSpacing: opts.lineSpacing ?? 0,
      letterSpacing: opts.letterSpacing ?? 4,
    })
    .setOrigin(0.5);

  bg.on("pointerover", () => {
    bg.setAlpha(1);
    txt.setColor(TXT_GOLD);
  });
  bg.on("pointerout", () => {
    bg.setAlpha(0.9);
    txt.setColor(TXT_GOLD_LIGHT);
  });
  bg.on("pointerdown", opts.onClick);

  const container = scene.add.container(x, y, [bg, txt]);
  return container;
}
