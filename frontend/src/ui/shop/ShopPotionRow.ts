import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";

const POTION_ROW_H = 60;
const POTION_ICON_SIZE = 40;
const POTION_ROW_W = 580;

export interface ShopPotionRowCallbacks {
  onBuy: () => void;
  onDenied: () => void;
}

export class ShopPotionRow {
  static readonly HEIGHT = POTION_ROW_H;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    iconKey: string,
    name: string,
    desc: string,
    cost: number,
    canAfford: boolean,
    cb: ShopPotionRowCallbacks,
  ) {
    const bg = scene.add
      .rectangle(x, y, POTION_ROW_W, POTION_ROW_H, BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER.LOCKED)
      .setInteractive({ useHandCursor: canAfford });

    const iconLeft = x - POTION_ROW_W / 2 + POTION_ICON_SIZE / 2 + 10;
    if (scene.textures.exists(iconKey)) {
      scene.add.image(iconLeft, y, iconKey).setDisplaySize(POTION_ICON_SIZE, POTION_ICON_SIZE);
    }
    const textLeft = x - POTION_ROW_W / 2 + POTION_ICON_SIZE + 20;
    scene.add
      .text(textLeft, y - 12, name, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);
    scene.add
      .text(textLeft, y + 12, desc, { fontSize: FONT.BODY, color: TXT.MUTED })
      .setOrigin(0, 0.5);

    scene.add
      .text(x + POTION_ROW_W / 2 - 16, y, `${cost}g`, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: canAfford ? TXT.GOLD : TXT.DEFEAT,
      })
      .setOrigin(1, 0.5);

    bg.on("pointerover", () => {
      bg.setFillStyle(canAfford ? BG.BTN_HOVER : BG.MOVE_CARD);
      bg.setStrokeStyle(1, canAfford ? BORDER.GOLD_BRIGHT : BORDER.LOCKED);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(BG.MOVE_CARD);
      bg.setStrokeStyle(1, BORDER.LOCKED);
    });
    if (canAfford) {
      bg.on("pointerdown", cb.onBuy);
    } else {
      bg.setAlpha(0.8);
      bg.on("pointerdown", cb.onDenied);
    }
  }
}
