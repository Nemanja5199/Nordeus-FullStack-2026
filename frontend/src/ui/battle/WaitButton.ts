import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";

export interface WaitButtonCallbacks {
  onWait: () => void;
}

// "Wait" button at the right of the potion row. Passes the player's turn
// without acting — exists so a player who can't afford any move (or wants
// to scout the monster's intent + regen mana) isn't soft-locked.
export class WaitButton {
  private bg: Phaser.GameObjects.Rectangle;
  private txt: Phaser.GameObjects.Text;
  private isEnabled = true;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    cb: WaitButtonCallbacks,
  ) {
    const btnW = 110;
    const btnH = 40;
    const x = width - btnW / 2 - 24;
    const y = height * 0.85;

    const container = scene.add.container(x, y);
    this.bg = scene.add
      .rectangle(0, 0, btnW, btnH, BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER.LOCKED);
    this.txt = scene.add
      .text(0, 0, "Wait", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      })
      .setOrigin(0.5);

    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => {
      if (!this.isEnabled) return;
      this.bg.setFillStyle(BG.BTN_HOVER);
      this.bg.setStrokeStyle(1, BORDER.GOLD_BRIGHT);
      this.txt.setColor(TXT.GOLD);
    });
    this.bg.on("pointerout", () => {
      this.bg.setFillStyle(BG.MOVE_CARD);
      this.bg.setStrokeStyle(1, BORDER.LOCKED);
      this.txt.setColor(TXT.GOLD_LIGHT);
    });
    this.bg.on("pointerdown", () => {
      if (!this.isEnabled) return;
      cb.onWait();
    });

    container.add([this.bg, this.txt]);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.bg.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      this.bg.setInteractive({ useHandCursor: true });
    } else {
      this.bg.disableInteractive();
      this.bg.setFillStyle(BG.MOVE_CARD);
      this.bg.setStrokeStyle(1, BORDER.LOCKED);
      this.txt.setColor(TXT.GOLD_LIGHT);
    }
  }
}
