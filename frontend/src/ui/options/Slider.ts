import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";

export interface SliderCallbacks {
  read: () => number;
  onChange: (v: number) => void;
}

export class Slider {
  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    title: string,
    description: string,
    cb: SliderCallbacks,
  ) {
    const trackW = 360;
    const trackH = 10;
    const trackX = cx - 240;
    const trackY = cy + 8;

    scene.add
      .text(trackX, cy - 16, title, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
      })
      .setOrigin(0, 0.5);

    const track = scene.add
      .rectangle(trackX, trackY, trackW, trackH, BG.BLACK)
      .setStrokeStyle(2, BORDER.GOLD)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    const fill = scene.add
      .rectangle(trackX, trackY, trackW * cb.read(), trackH - 4, 0xc8a035, 1)
      .setOrigin(0, 0.5);

    const handle = scene.add
      .circle(trackX + trackW * cb.read(), trackY, 12, 0xe8c060)
      .setStrokeStyle(2, 0x000000)
      .setInteractive({ useHandCursor: true, draggable: true });
    scene.input.setDraggable(handle, true);

    const valueText = scene.add
      .text(trackX + trackW + 18, trackY, `${Math.round(cb.read() * 100)}%`, {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);

    scene.add
      .text(trackX, cy + 36, description, {
        fontSize: FONT.BODY,
        color: TXT.GOLD_LIGHT,
        wordWrap: { width: 540 },
      })
      .setOrigin(0, 0);

    const apply = (rawX: number) => {
      const ratio = Math.max(0, Math.min(1, (rawX - trackX) / trackW));
      cb.onChange(ratio);
      fill.width = trackW * ratio;
      handle.x = trackX + trackW * ratio;
      valueText.setText(`${Math.round(ratio * 100)}%`);
    };

    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => apply(pointer.x));
    handle.on("drag", (_p: Phaser.Input.Pointer, dragX: number) => apply(dragX));
  }
}
