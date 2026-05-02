import Phaser from "phaser";
import { BG, BORDER, FONT, MOVE_CARD, TXT } from "../../constants";
import type { MoveConfig } from "../../types/game";

export interface EquippedMovesPanelCallbacks {
  onSelect: (slot: number) => void;
  onHover: (move: MoveConfig) => void;
  onHoverEnd: () => void;
}

export class EquippedMovesPanel {
  private buttons: Phaser.GameObjects.Container[] = [];

  constructor(
    scene: Phaser.Scene,
    panelX: number,
    equippedMoves: string[],
    moveConfigs: Record<string, MoveConfig>,
    cb: EquippedMovesPanelCallbacks,
  ) {
    for (let slot = 0; slot < 4; slot++) {
      const moveId = equippedMoves[slot];
      const move = moveId ? moveConfigs[moveId] : null;
      const y = MOVE_CARD.START_Y + slot * (MOVE_CARD.H + MOVE_CARD.GAP);

      const container = scene.add.container(panelX, y);
      const bg = scene.add
        .rectangle(0, 0, MOVE_CARD.W, MOVE_CARD.H, BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER.LOCKED);

      const slotTxt = scene.add.text(-MOVE_CARD.W / 2 + 14, -18, `SLOT ${slot + 1}`, {
        fontSize: FONT.XS,
        color: TXT.MUTED,
      });
      const nameTxt = scene.add.text(-MOVE_CARD.W / 2 + 14, 4, move ? move.name : "(empty)", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: move ? TXT.HERO : TXT.LOCKED,
      });

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerdown", () => cb.onSelect(slot));
      bg.on("pointerover", () => { bg.setAlpha(0.7); if (move) cb.onHover(move); });
      bg.on("pointerout", () => { bg.setAlpha(1); cb.onHoverEnd(); });

      container.add([bg, slotTxt, nameTxt]);
      this.buttons.push(container);
    }
  }

  highlightSelected(slot: number): void {
    this.buttons.forEach((c, i) => {
      (c.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
        2,
        i === slot ? BORDER.GOLD_BRIGHT : BORDER.LOCKED,
      );
    });
  }
}
