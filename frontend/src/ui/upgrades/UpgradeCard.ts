import Phaser from "phaser";
import { BG, BORDER, FONT, TXT, UPGRADE_CARD } from "../../constants";
import type { MetaUpgrade } from "../../types/game";

export interface UpgradeCardState {
  purchased: boolean;
  available: boolean;
  locked: boolean;
  affordable: boolean;
  shardsHeld: number;
}

export interface UpgradeCardCallbacks {
  onBuy: () => void;
}

export class UpgradeCard {
  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    upgrade: MetaUpgrade,
    accentColor: string,
    state: UpgradeCardState,
    cb: UpgradeCardCallbacks,
  ) {
    const { purchased, available, locked, affordable, shardsHeld } = state;

    const bgColor = purchased ? BG.UPGRADE_PURCHASED : available ? BG.UPGRADE_AVAILABLE : BG.UPGRADE_LOCKED;
    const borderColor = purchased ? BORDER.UPGRADE_OWNED : available ? BORDER.SHARD : BORDER.LOCKED;

    const bg = scene.add
      .rectangle(cx, cy, UPGRADE_CARD.W, UPGRADE_CARD.H, bgColor, 0.95)
      .setStrokeStyle(purchased ? 2 : 1, borderColor);

    if (available) bg.setInteractive({ useHandCursor: true });

    scene.add
      .text(cx, cy - 52, upgrade.name, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: purchased ? TXT.STAT_HP : available ? accentColor : TXT.LOCKED,
      })
      .setOrigin(0.5);

    scene.add
      .text(cx, cy - 18, upgrade.description.replace("Start each run with ", ""), {
        fontSize: FONT.BODY,
        color: purchased ? TXT.MUTED : available ? TXT.GOLD_LIGHT : TXT.LOCKED,
        wordWrap: { width: UPGRADE_CARD.W - 20 },
        align: "center",
      })
      .setOrigin(0.5);

    if (purchased) {
      scene.add.text(cx, cy + 28, "✓ Purchased", { fontSize: FONT.BODY, color: TXT.STAT_HP }).setOrigin(0.5);
    } else if (locked) {
      scene.add.text(cx, cy + 28, "🔒 Locked", { fontSize: FONT.BODY, color: TXT.LOCKED }).setOrigin(0.5);
    } else {
      const costColor = shardsHeld >= upgrade.cost ? TXT.SHARD : TXT.STAT_ATTACK;
      scene.add
        .text(cx, cy + 28, `◆ ${upgrade.cost} Shards`, {
          fontSize: FONT.BODY,
          fontFamily: "EnchantedLand",
          color: costColor,
        })
        .setOrigin(0.5);
    }

    if (affordable) {
      const btn = scene.add
        .rectangle(cx, cy + 56, UPGRADE_CARD.W - 28, 32, BG.BTN_BUY, 0.95)
        .setStrokeStyle(1, BORDER.SHARD)
        .setInteractive({ useHandCursor: true });
      scene.add
        .text(cx, cy + 56, "BUY", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.SHARD })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(BG.BTN_BUY_HOVER));
      btn.on("pointerout", () => btn.setFillStyle(BG.BTN_BUY));
      btn.on("pointerdown", cb.onBuy);
    }
  }
}
