import Phaser from "phaser";
import { BG, FONT, TXT } from "../../constants";

export interface TestModeToggleCallbacks {
  read: () => boolean;
  onToggle: () => boolean;
}

// Bottom-right "Test Mode" checkbox shown on the main menu.
export class TestModeToggle {
  constructor(scene: Phaser.Scene, cb: TestModeToggleCallbacks) {
    const { width, height } = scene.scale;
    const padX = 24;
    const padY = 24;
    const boxSize = 18;

    const labelText = scene.add
      .text(width - padX, height - padY, "Test Mode", {
        fontSize: FONT.SM,
        color: cb.read() ? TXT.GOLD : TXT.MUTED,
      })
      .setOrigin(1, 0.5);

    const boxX = labelText.x - labelText.width - 14;
    scene.add
      .rectangle(boxX, height - padY, boxSize, boxSize, BG.BLACK)
      .setStrokeStyle(2, 0xb0b0b0)
      .setOrigin(0.5);

    const check = scene.add
      .text(boxX, height - padY, "✓", { fontSize: FONT.SM, color: TXT.GOLD })
      .setOrigin(0.5)
      .setVisible(cb.read());

    const hitWidth = labelText.width + boxSize + 24;
    const hitX = width - padX - hitWidth;
    scene.add
      .zone(hitX, height - padY - 16, hitWidth, 32)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        const on = cb.onToggle();
        check.setVisible(on);
        labelText.setColor(on ? TXT.GOLD : TXT.MUTED);
      });
  }
}
