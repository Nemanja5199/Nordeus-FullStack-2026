import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../constants";

export interface PotionRowCallbacks {
  onUseHp: () => void;
  onUseMana: () => void;
  onHoverHp: () => void;
  onHoverMana: () => void;
  onHoverEnd: () => void;
}

interface Btn {
  bg: Phaser.GameObjects.Rectangle;
  txt: Phaser.GameObjects.Text;
}

// Two horizontal potion buttons (HP + MP) below the move row. Owns hover/click
// chrome; scene drives counts + enabled state via update().
export class PotionRow {
  private hp!: Btn;
  private mp!: Btn;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    cb: PotionRowCallbacks,
  ) {
    const btnW = 130;
    const btnH = 40;
    const gap = 18;
    const totalW = btnW * 2 + gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const y = height * 0.85;

    this.hp = this.makeBtn(scene, startX, y, btnW, btnH, "potion_hp", cb.onUseHp, cb.onHoverHp, cb.onHoverEnd);
    this.mp = this.makeBtn(scene, startX + btnW + gap, y, btnW, btnH, "potion_mp", cb.onUseMana, cb.onHoverMana, cb.onHoverEnd);
  }

  private makeBtn(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    iconKey: string,
    onUse: () => void,
    onHover: () => void,
    onHoverEnd: () => void,
  ): Btn {
    const container = scene.add.container(x, y);
    const bg = scene.add
      .rectangle(0, 0, w, h, BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER.LOCKED);
    const icon = scene.add.image(-w / 2 + 22, 0, iconKey).setScale(0.85).setOrigin(0.5);
    const txt = scene.add
      .text(8, 0, "× 0", {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => {
      bg.setFillStyle(BG.BTN_HOVER);
      bg.setStrokeStyle(1, BORDER.GOLD_BRIGHT);
      txt.setColor(TXT.GOLD);
      onHover();
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(BG.MOVE_CARD);
      bg.setStrokeStyle(1, BORDER.LOCKED);
      txt.setColor(TXT.GOLD_LIGHT);
      onHoverEnd();
    });
    bg.on("pointerdown", onUse);
    container.add([bg, icon, txt]);
    return { bg, txt };
  }

  update(hpCount: number, mpCount: number, canUseHp: boolean, canUseMp: boolean): void {
    this.applyState(this.hp, hpCount, canUseHp);
    this.applyState(this.mp, mpCount, canUseMp);
  }

  private applyState(btn: Btn, count: number, enabled: boolean): void {
    btn.txt.setText(`× ${count}`);
    btn.bg.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      btn.bg.setInteractive({ useHandCursor: true });
    } else {
      btn.bg.disableInteractive();
      btn.bg.setFillStyle(BG.MOVE_CARD);
      btn.bg.setStrokeStyle(1, BORDER.LOCKED);
      btn.txt.setColor(TXT.GOLD_LIGHT);
    }
  }
}
