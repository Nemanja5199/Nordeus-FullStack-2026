import Phaser from "phaser";
import { BATTLE, BG, FONT, TXT } from "../constants";

// Bottom 3-line battle log. Newest message at the bottom; older lines
// scroll up as new ones arrive.
export class BattleLog {
  private lines: Phaser.GameObjects.Text[] = [];
  private colors: string[] = [];

  constructor(scene: Phaser.Scene, width: number, height: number) {
    const startY = height * 0.89;
    const lineH = 24;
    scene.add.rectangle(
      width / 2,
      startY + (BATTLE.LOG_LINES * lineH) / 2,
      width * 0.7,
      BATTLE.LOG_LINES * lineH + 14,
      BG.DARKEST,
      0.7,
    );

    for (let i = 0; i < BATTLE.LOG_LINES; i++) {
      this.lines.push(
        scene.add
          .text(width / 2, startY + i * lineH, "", {
            fontSize: FONT.MD,
            color: TXT.GOLD_LIGHT,
          })
          .setOrigin(0.5),
      );
      this.colors.push(TXT.GOLD_LIGHT);
    }
  }

  push(msg: string, color: string = TXT.GOLD_LIGHT): void {
    for (let i = 0; i < this.lines.length - 1; i++) {
      this.lines[i].setText(this.lines[i + 1].text);
      this.lines[i].setColor(this.colors[i + 1]);
      this.colors[i] = this.colors[i + 1];
    }
    const last = this.lines.length - 1;
    this.lines[last].setText(`> ${msg}`);
    this.lines[last].setColor(color);
    this.colors[last] = color;
  }
}
