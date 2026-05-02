import Phaser from "phaser";
import { BG, BORDER, EQ_CARD, FONT, RARITY_COLOR, TXT } from "../../constants";
import { itemFrames } from "../../sprites";
import type { GearItem, GearSlot } from "../../types/game";

export interface EquippedSlotCallbacks {
  onUnequip: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

export class EquippedSlot {
  constructor(
    scene: Phaser.Scene,
    panelX: number,
    y: number,
    slot: GearSlot,
    label: string,
    item: GearItem | undefined,
    itemId: string | undefined,
    cb: EquippedSlotCallbacks,
  ) {
    void slot;
    const bg = scene.add
      .rectangle(panelX, y, EQ_CARD.W, EQ_CARD.H, item ? BG.MOVE_EQUIPPED : BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, item ? BORDER.GOLD_BRIGHT : BORDER.LOCKED)
      .setInteractive({ useHandCursor: !!item });

    scene.add.text(panelX - EQ_CARD.W / 2 + 10, y - EQ_CARD.H / 2 + 7, label, {
      fontSize: FONT.SM,
      color: TXT.MUTED,
    });

    const iconX = panelX - EQ_CARD.W / 2 + EQ_CARD.ICON_SIZE / 2 + 10;
    const contentY = y + 12;
    if (item && itemId) {
      const frameKey = itemFrames[itemId];
      if (frameKey && scene.textures.exists(frameKey)) {
        scene.add.image(iconX, contentY, frameKey).setDisplaySize(EQ_CARD.ICON_SIZE, EQ_CARD.ICON_SIZE);
      }
    }

    const nameX = panelX - EQ_CARD.W / 2 + EQ_CARD.ICON_SIZE + 24;
    scene.add.text(nameX, contentY, item ? item.name : "(empty)", {
      fontSize: FONT.BODY,
      fontFamily: "EnchantedLand",
      color: item ? RARITY_COLOR[item.rarity] ?? TXT.GOLD : TXT.LOCKED,
    }).setOrigin(0, 0.5);

    if (item) {
      bg.on("pointerover", () => {
        bg.setAlpha(0.75);
        cb.onHover();
      });
      bg.on("pointerout", () => {
        bg.setAlpha(1);
        cb.onHoverEnd();
      });
      bg.on("pointerdown", cb.onUnequip);
    }
  }
}
