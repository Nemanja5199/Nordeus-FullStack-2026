import Phaser from "phaser";
import { BG, BORDER, FONT, MOVE_CARD, TXT } from "../../constants";
import type { MoveConfig } from "../../types/game";
import { createScrollableArea, type ScrollableArea } from "../ScrollableArea";

export interface LearnedMovesPanelCallbacks {
  onSelect: (index: number, moveId: string) => void;
  onHover: (move: MoveConfig) => void;
  onHoverEnd: () => void;
}

export class LearnedMovesPanel {
  readonly scroll: ScrollableArea;
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor(
    scene: Phaser.Scene,
    panelX: number,
    learnedMoves: string[],
    moveConfigs: Record<string, MoveConfig>,
    equippedMoves: string[],
    cb: LearnedMovesPanelCallbacks,
  ) {
    const rowStep = MOVE_CARD.H + MOVE_CARD.GAP;
    const contentH = learnedMoves.length * rowStep - MOVE_CARD.GAP;
    const { width: scaleW, height: scaleH } = scene.scale;
    const viewportH = Math.max(120, scaleH - MOVE_CARD.START_Y - 160);

    this.scroll = createScrollableArea(scene, {
      x: 0,
      y: MOVE_CARD.START_Y - MOVE_CARD.H / 2,
      width: scaleW,
      height: viewportH + MOVE_CARD.H,
      contentHeight: contentH + MOVE_CARD.H,
    });

    learnedMoves.forEach((moveId, i) => {
      const move = moveConfigs[moveId];
      if (!move) return;

      const isEquipped = equippedMoves.includes(moveId);
      const cardCenterY = i * rowStep + MOVE_CARD.H / 2;

      const container = scene.add.container(panelX, cardCenterY);
      const bg = scene.add
        .rectangle(0, 0, MOVE_CARD.W, MOVE_CARD.H, isEquipped ? BG.MOVE_EQUIPPED : BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, isEquipped ? BORDER.GOLD : BORDER.LOCKED);

      const nameTxt = scene.add.text(-MOVE_CARD.W / 2 + 14, -12, move.name, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      });
      const typeTxt = scene.add.text(-MOVE_CARD.W / 2 + 14, 10, `[${move.moveType}]`, {
        fontSize: FONT.SM,
        color: TXT.MUTED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => cb.onSelect(i, moveId));
      bg.on("pointerover", () => { bg.setAlpha(0.7); cb.onHover(move); });
      bg.on("pointerout", () => { bg.setAlpha(1); cb.onHoverEnd(); });

      container.add([bg, nameTxt, typeTxt]);
      this.buttons.push(container);
      this.scroll.container.add(container);
    });

    this.scroll.refreshInputState();
  }

  highlightSelected(index: number): void {
    this.buttons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
        2,
        i === index ? BORDER.GOLD_BRIGHT : BORDER.LOCKED,
      );
    });
  }
}
