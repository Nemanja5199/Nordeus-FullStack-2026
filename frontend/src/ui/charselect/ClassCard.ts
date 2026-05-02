import Phaser from "phaser";
import { BG, BORDER, FONT, TINT_GOLD, TXT } from "../../constants";
import type { HeroClass } from "../../types/game";

export interface ClassCardData {
  id: HeroClass;
  name: string;
  description: string;
  stats: { hp: number; atk: number; def: number; mag: number };
  moves: string[];
  spriteKey: string;
  spriteFrame: number;
  locked: boolean;
}

export interface ClassCardStatDef {
  key: string;
  label: string;
  desc: string;
}

export interface ClassCardCallbacks {
  onSelect: (index: number) => void;
  onStatHover: (text: string) => void;
  onStatHoverEnd: () => void;
}

export class ClassCard {
  readonly container: Phaser.GameObjects.Container;
  readonly bg: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    cls: ClassCardData,
    statDefs: readonly ClassCardStatDef[],
    index: number,
    cb: ClassCardCallbacks,
  ) {
    this.container = scene.add.container(x, y);

    this.bg = scene.add
      .rectangle(0, 0, w, h, cls.locked ? BG.CARD_LOCKED : BG.MOVE_CARD, 0.95)
      .setStrokeStyle(2, cls.locked ? BORDER.CARD_LOCKED : BORDER.GOLD);

    const sprite = scene.add
      .image(0, -h * 0.3, cls.spriteKey, cls.spriteFrame)
      .setScale(cls.locked ? 3 : 4)
      .setAlpha(cls.locked ? 0.3 : 1);

    const nameText = scene.add
      .text(0, -h * 0.13, cls.name, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: cls.locked ? TXT.CLASS_LOCKED : TXT.GOLD,
      })
      .setOrigin(0.5);

    const statObjs: Phaser.GameObjects.GameObject[] = [];
    const statValues = [cls.stats.hp, cls.stats.atk, cls.stats.def, cls.stats.mag, 60];
    const iconScale = 0.72;
    const iconHalf = 16 * iconScale;
    const rowSpacing = 28;
    const statsStartY = -h * 0.06;
    const blockW = iconHalf * 2 + 8 + 70;
    const iconX = -blockW / 2 + iconHalf;
    const textX = iconX + iconHalf + 8;

    statDefs.forEach((stat, i) => {
      const sy = statsStartY + i * rowSpacing;
      const alpha = cls.locked ? 0.15 : 1;

      const icon = scene.add.image(iconX, sy, stat.key).setScale(iconScale).setAlpha(alpha);
      const valueText = scene.add
        .text(textX, sy, `${stat.label}  ${statValues[i]}`, {
          fontSize: FONT.SM,
          color: cls.locked ? TXT.CARD_LOCKED : TXT.GOLD_LIGHT,
        })
        .setOrigin(0, 0.5);

      if (!cls.locked) {
        const hitW = blockW + 20;
        const hit = scene.add
          .rectangle(0, sy, hitW, 24, 0xffffff, 0)
          .setInteractive({ useHandCursor: false });

        hit.on("pointerover", () => {
          icon.setTint(TINT_GOLD);
          valueText.setColor(TXT.GOLD);
          cb.onStatHover(`${stat.label} — ${stat.desc}`);
        });
        hit.on("pointerout", () => {
          icon.clearTint();
          valueText.setColor(TXT.GOLD_LIGHT);
          cb.onStatHoverEnd();
        });
        statObjs.push(icon, valueText, hit);
      } else {
        statObjs.push(icon, valueText);
      }
    });

    const descText = scene.add
      .text(0, h * 0.22, cls.description, {
        fontSize: FONT.SM,
        color: cls.locked ? TXT.CARD_LOCKED : TXT.GOLD_LIGHT,
        align: "center",
        wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);

    const movesLabel = scene.add
      .text(0, h * 0.35, "Moves", {
        fontSize: FONT.SM,
        fontFamily: "EnchantedLand",
        color: cls.locked ? TXT.CARD_LOCKED : TXT.MUTED,
      })
      .setOrigin(0.5);

    const movesText = scene.add
      .text(0, h * 0.42, cls.moves.join("  ·  "), {
        fontSize: FONT.XS,
        color: cls.locked ? TXT.CARD_LOCKED : TXT.GOLD_WARM,
        align: "center",
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    if (cls.locked) {
      const lockText = scene.add
        .text(0, 0, "COMING\nSOON", {
          fontSize: FONT.LG,
          fontFamily: "EnchantedLand",
          color: TXT.COMING_SOON,
          align: "center",
          stroke: "#000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      this.container.add([this.bg, sprite, nameText, ...statObjs, descText, movesLabel, movesText, lockText]);
    } else {
      this.container.add([this.bg, sprite, nameText, ...statObjs, descText, movesLabel, movesText]);
      this.bg.setInteractive({ useHandCursor: true });
      this.bg.on("pointerdown", () => cb.onSelect(index));
      this.bg.on("pointerover", () => this.bg.setAlpha(0.8));
      this.bg.on("pointerout", () => this.bg.setAlpha(0.95));
    }
  }

  setSelected(selected: boolean, locked: boolean): void {
    if (locked) return;
    if (selected) {
      this.bg.setStrokeStyle(3, BORDER.GOLD_BRIGHT);
      this.bg.setFillStyle(BG.CARD_SELECTED);
    } else {
      this.bg.setStrokeStyle(2, BORDER.GOLD);
      this.bg.setFillStyle(BG.MOVE_CARD);
    }
  }
}
