import Phaser from "phaser";
import { BG, BORDER, FONT, INV_GRID, RARITY_COLOR_NUM, TXT } from "../../constants";
import { itemFrames } from "../../sprites";
import type { GearItem } from "../../types/game";
import { createScrollableArea, type ScrollableArea } from "../ScrollableArea";

export interface InventoryGridCallbacks {
  onEquip: (itemId: string) => void;
  onHover: (item: GearItem) => void;
  onHoverEnd: () => void;
}

export class InventoryGrid {
  readonly scroll?: ScrollableArea;

  constructor(
    scene: Phaser.Scene,
    originX: number,
    inventory: string[],
    items: Record<string, GearItem>,
    cb: InventoryGridCallbacks,
  ) {
    if (inventory.length === 0) {
      scene.add
        .text(originX, INV_GRID.START_Y + 30, "Inventory empty.", {
          fontSize: FONT.BODY,
          color: TXT.MUTED,
        })
        .setOrigin(0.5);
      return;
    }

    const step = INV_GRID.CELL + INV_GRID.GAP;
    const gridW = INV_GRID.COLS * step - INV_GRID.GAP;
    const gridLeft = originX - gridW / 2 + INV_GRID.CELL / 2;

    const rowCount = Math.ceil(inventory.length / INV_GRID.COLS);
    const contentH = rowCount * step - INV_GRID.GAP;
    const { width: scaleW, height: scaleH } = scene.scale;
    const viewportH = Math.max(120, scaleH - INV_GRID.START_Y - 160);

    this.scroll = createScrollableArea(scene, {
      x: 0,
      y: INV_GRID.START_Y,
      width: scaleW,
      height: viewportH,
      contentHeight: contentH,
    });

    inventory.forEach((itemId, i) => {
      const item: GearItem | undefined = items[itemId];
      if (!item) return;

      const col = i % INV_GRID.COLS;
      const row = Math.floor(i / INV_GRID.COLS);
      const cx = gridLeft + col * step;
      const cy = row * step + INV_GRID.CELL / 2;

      const bg = scene.add
        .rectangle(cx, cy, INV_GRID.CELL, INV_GRID.CELL, BG.MOVE_EQUIPPED, 0.9)
        .setStrokeStyle(1, BORDER.GOLD)
        .setInteractive({ useHandCursor: true });

      const frameKey = itemFrames[itemId];
      const icon = frameKey && scene.textures.exists(frameKey)
        ? scene.add.image(cx, cy - 6, frameKey).setDisplaySize(INV_GRID.CELL - 16, INV_GRID.CELL - 16)
        : null;

      const rarityStrip = scene.add.rectangle(
        cx,
        cy + INV_GRID.CELL / 2 - 6,
        INV_GRID.CELL - 4,
        8,
        RARITY_COLOR_NUM[item.rarity] ?? 0xc8a035,
        0.8,
      );

      bg.on("pointerover", () => {
        bg.setAlpha(0.7);
        cb.onHover(item);
      });
      bg.on("pointerout", () => {
        bg.setAlpha(1);
        cb.onHoverEnd();
      });
      bg.on("pointerdown", () => cb.onEquip(itemId));

      this.scroll!.container.add([bg, ...(icon ? [icon] : []), rarityStrip]);
    });

    this.scroll.refreshInputState();
  }
}
