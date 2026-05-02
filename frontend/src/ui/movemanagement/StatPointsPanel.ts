import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";

export type StatPointKey = "attack" | "defense" | "magic" | "maxHp";

export interface StatPointsPanelStats {
  attack: number;
  defense: number;
  magic: number;
  maxHp: number;
  skillPoints: number;
}

export interface StatPointsPanelCallbacks {
  onSpend: (key: StatPointKey) => void;
}

const STATS: { label: string; key: StatPointKey; gain: string; sub: string }[] = [
  { label: "ATTACK", key: "attack", gain: "+2", sub: "Physical damage" },
  { label: "DEFENSE", key: "defense", gain: "+2", sub: "Damage reduction" },
  { label: "MAGIC", key: "magic", gain: "+3", sub: "Spell power" },
  { label: "MAX HP", key: "maxHp", gain: "+8", sub: "Max health" },
];

export class StatPointsPanel {
  constructor(
    scene: Phaser.Scene,
    panelX: number,
    stats: StatPointsPanelStats,
    cb: StatPointsPanelCallbacks,
  ) {
    const pts = stats.skillPoints;
    const cardW = 200;
    const cardH = 80;
    const gap = 16;

    scene.add
      .text(panelX, 112, pts > 0 ? `✦ ${pts} to spend` : "no points", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: pts > 0 ? TXT.SKILL_POINTS : TXT.MUTED,
      })
      .setOrigin(0.5);

    const cardsStartY = 156;

    STATS.forEach(({ label, key, gain, sub }, i) => {
      const y = cardsStartY + cardH / 2 + i * (cardH + gap);
      const haspts = pts > 0;
      const val = stats[key];

      scene.add
        .rectangle(panelX, y, cardW, cardH, haspts ? BG.STAT_CARD_AVAIL : BG.STAT_CARD, 0.95)
        .setStrokeStyle(haspts ? 2 : 1, haspts ? BORDER.STAT_AVAIL : BORDER.LOCKED);

      scene.add.text(panelX - cardW / 2 + 14, y - 22, label, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
      });
      scene.add.text(panelX - cardW / 2 + 14, y - 2, sub, {
        fontSize: FONT.SM,
        color: TXT.MUTED,
      });
      scene.add.text(panelX - cardW / 2 + 14, y + 16, String(val), {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_LIGHT,
      });
      scene.add.text(panelX - cardW / 2 + 66, y + 16, gain, {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: haspts ? TXT.SKILL_POINTS : TXT.MUTED,
      });

      if (haspts) {
        const btnX = panelX + cardW / 2 - 36;
        const btn = scene.add
          .rectangle(btnX, y, 56, 36, BG.BTN_STAT, 0.95)
          .setStrokeStyle(1, BORDER.STAT_AVAIL)
          .setInteractive({ useHandCursor: true });
        scene.add
          .text(btnX, y, "+ Add", {
            fontSize: FONT.SM,
            fontFamily: "EnchantedLand",
            color: TXT.SKILL_POINTS,
          })
          .setOrigin(0.5);

        btn.on("pointerover", () => btn.setFillStyle(BG.BTN_STAT_HOVER));
        btn.on("pointerout", () => btn.setFillStyle(BG.BTN_STAT));
        btn.on("pointerdown", () => cb.onSpend(key));
      }
    });
  }
}
