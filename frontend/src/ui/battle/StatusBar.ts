import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";

// Top status bar + the description line that hover-previews show under it.
// One owner for both makes "clear on action" easier to reason about.
export class StatusBar {
  private statusText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const statusY = height * 0.66;
    const descY = height * 0.71;

    scene.add.rectangle(width / 2, statusY, width - 20, 38, BG.PANEL, 0.92).setStrokeStyle(1, BORDER.GOLD);
    this.statusText = scene.add
      .text(width / 2, statusY, "", {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
      })
      .setOrigin(0.5);

    this.descText = scene.add
      .text(width / 2, descY, "", {
        fontSize: FONT.BODY,
        color: TXT.GOLD_MID,
        wordWrap: { width: width - 40 },
        align: "center",
      })
      .setOrigin(0.5);
  }

  setStatus(msg: string): void {
    this.statusText.setText(msg);
  }

  setDescription(msg: string): void {
    this.descText.setText(msg);
  }
}
