import Phaser from "phaser";
import { BG, FONT, TXT } from "../../constants";

export interface ToggleCallbacks {
  read: () => boolean;
  onToggle: () => void;
}

export class Toggle {
  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    title: string,
    description: string,
    cb: ToggleCallbacks,
  ) {
    const boxSize = 32;
    const boxX = cx - 240;

    const label = scene.add
      .text(boxX + 50, cy, title, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: cb.read() ? TXT.GOLD : TXT.MUTED,
      })
      .setOrigin(0, 0.5);

    scene.add
      .rectangle(boxX, cy, boxSize, boxSize, BG.BLACK)
      .setStrokeStyle(2, 0xb0b0b0)
      .setOrigin(0.5);

    const check = scene.add
      .text(boxX, cy, "✓", { fontSize: FONT.LG, color: TXT.GOLD })
      .setOrigin(0.5)
      .setVisible(cb.read());

    scene.add
      .text(boxX, cy + 36, description, {
        fontSize: FONT.BODY,
        color: TXT.GOLD_LIGHT,
        wordWrap: { width: 540 },
      })
      .setOrigin(0, 0);

    const hitWidth = 480;
    const hitHeight = 48;
    scene.add
      .zone(boxX - boxSize / 2 - 6, cy - hitHeight / 2, hitWidth, hitHeight)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        cb.onToggle();
        const on = cb.read();
        check.setVisible(on);
        label.setColor(on ? TXT.GOLD : TXT.MUTED);
      });
  }
}
