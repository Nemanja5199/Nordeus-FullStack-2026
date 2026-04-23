import Phaser from "phaser";

export interface TooltipItem {
  text: string;
  color: string;
}

export class TooltipManager {
  private objects: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    private hintText: Phaser.GameObjects.Text,
  ) {}

  /** Call at the start of every show — clears previous tooltip and hides hint. */
  begin(): void {
    this.objects.forEach((t) => t.destroy());
    this.objects = [];
    this.hintText.setVisible(false);
  }

  /** Destroy tooltip objects and restore the hint text. */
  clear(): void {
    this.objects.forEach((t) => t.destroy());
    this.objects = [];
    this.hintText.setVisible(true);
  }

  /** Add a single centered text line. */
  addText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): void {
    this.objects.push(this.scene.add.text(x, y, text, style).setOrigin(0.5));
  }

  /** Lay out an array of colored items spread horizontally around the screen centre. */
  addHorizontalRow(items: TooltipItem[], y: number, fontSize: string, fixedSpacing?: number): void {
    if (items.length === 0) return;
    const { width } = this.scene.scale;
    const cx = width / 2;
    const spacing = fixedSpacing ?? Math.min(200, (width * 0.8) / items.length);
    const startX = cx - ((items.length - 1) * spacing) / 2;
    items.forEach((item, i) => {
      this.objects.push(
        this.scene.add
          .text(startX + i * spacing, y, item.text, {
            fontSize,
            fontFamily: "EnchantedLand",
            color: item.color,
          })
          .setOrigin(0.5),
      );
    });
  }
}
