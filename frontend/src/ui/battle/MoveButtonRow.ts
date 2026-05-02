import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";
import type { MoveConfig } from "../../types/game";

export interface MoveButtonRowCallbacks {
  onClick: (moveId: string) => void;
  onHover: (moveId: string) => void;
  onHoverEnd: () => void;
}

interface Btn {
  moveId: string;
  cost: number;
  bg: Phaser.GameObjects.Rectangle;
  nameTxt: Phaser.GameObjects.Text;
  costTxt: Phaser.GameObjects.Text;
}

// Row of equipped-move buttons across the bottom of the battle panel.
// Owns its own hover/click visuals; scene drives the affordability + busy
// gates via setMana() and setEnabled().
export class MoveButtonRow {
  private buttons: Btn[] = [];
  private currentMana = 0;
  private isEnabled = true;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    moves: { id: string; config: MoveConfig }[],
    cb: MoveButtonRowCallbacks,
  ) {
    const btnW = 240;
    const btnH = 54;
    const gap = 14;
    const totalW = moves.length * btnW + (moves.length - 1) * gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const y = height * 0.77;

    moves.forEach(({ id, config }, i) => {
      const x = startX + i * (btnW + gap);
      const container = scene.add.container(x, y);
      const cost = config.manaCost ?? 0;

      const bg = scene.add
        .rectangle(0, 0, btnW, btnH, BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, BORDER.LOCKED);
      const nameTxt = scene.add
        .text(0, -12, config.name, {
          fontSize: FONT.MD,
          fontFamily: "EnchantedLand",
          color: TXT.GOLD_LIGHT,
        })
        .setOrigin(0.5);
      const typeTxt = scene.add
        .text(cost > 0 ? -20 : 0, 10, `[${config.moveType}]`, {
          fontSize: FONT.SM,
          color: TXT.GOLD_MID,
        })
        .setOrigin(0.5);
      const costTxt = scene.add
        .text(cost > 0 ? 32 : 0, 10, cost > 0 ? `${cost} MP` : "", {
          fontSize: FONT.SM,
          color: TXT.MANA,
        })
        .setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => {
        if (!this.isEnabled) return;
        if (this.currentMana < cost) return;
        bg.setFillStyle(BG.BTN_HOVER);
        bg.setStrokeStyle(1, BORDER.GOLD_BRIGHT);
        nameTxt.setColor(TXT.GOLD);
        cb.onHover(id);
      });
      bg.on("pointerout", () => {
        bg.setFillStyle(BG.MOVE_CARD);
        bg.setStrokeStyle(1, BORDER.LOCKED);
        nameTxt.setColor(TXT.GOLD_LIGHT);
        cb.onHoverEnd();
      });
      bg.on("pointerdown", () => {
        if (!this.isEnabled) return;
        if (this.currentMana < cost) return;
        cb.onClick(id);
      });

      container.add([bg, nameTxt, typeTxt, costTxt]);
      this.buttons.push({ moveId: id, cost, bg, nameTxt, costTxt });
    });
  }

  setMana(currentMana: number): void {
    this.currentMana = currentMana;
    this.buttons.forEach((btn) => {
      const canAfford = currentMana >= btn.cost;
      btn.bg.setAlpha(canAfford && this.isEnabled ? 1 : 0.45);
      btn.costTxt.setColor(canAfford ? TXT.MANA : TXT.MANA_LOW);
    });
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.buttons.forEach((btn) => {
      const canAfford = this.currentMana >= btn.cost;
      btn.bg.setAlpha(enabled && canAfford ? 1 : 0.4);
      if (enabled) {
        btn.bg.setInteractive({ useHandCursor: true });
      } else {
        btn.bg.setFillStyle(BG.MOVE_CARD);
        btn.bg.setStrokeStyle(1, BORDER.LOCKED);
        btn.nameTxt.setColor(TXT.GOLD_LIGHT);
        btn.bg.disableInteractive();
      }
    });
  }
}
