import Phaser from "phaser";
import { createButton, BTN_SM } from "./Button";
import { BG_BTN_CLOSE, TXT_MUTED } from "./colors";

export interface ModalFooterOptions {
  hint: string;
  onClose: () => void;
}

export function createModalFooter(
  scene: Phaser.Scene,
  opts: ModalFooterOptions,
): Phaser.GameObjects.Text {
  const { width, height } = scene.scale;

  const infoText = scene.add
    .text(width / 2, height - 130, opts.hint, {
      fontSize: "14px",
      color: TXT_MUTED,
      wordWrap: { width: width * 0.8 },
      align: "center",
    })
    .setOrigin(0.5);

  createButton(scene, width / 2, height - 55, {
    ...BTN_SM,
    label: "CLOSE",
    color: BG_BTN_CLOSE,
    onClick: opts.onClose,
  });

  return infoText;
}
