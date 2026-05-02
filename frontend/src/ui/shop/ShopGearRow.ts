import Phaser from "phaser";
import { BG, BORDER, FONT, RARITY_COLOR, TXT } from "../../constants";
import { itemFrames } from "../../sprites";
import type { GearItem } from "../../types/game";
import type { ScrollableArea } from "../ScrollableArea";

const ROW_H = 76;
const ICON_SIZE = 48;
const GEAR_ROW_W = 460;

export interface ShopGearRowState {
  owned: boolean;
  lockedByLv: boolean;
  canAfford: boolean;
  reqLevel: number;
}

export interface ShopGearRowCallbacks {
  onBuy: () => void;
  onDenied: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

// One gear listing in the shop (icon, name, stat chunks, badge).
// Caller determines `state` (owned/locked/affordability) since those rules
// belong to GameState, not the row.
export class ShopGearRow {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    item: GearItem,
    state: ShopGearRowState,
    scroll: ScrollableArea,
    cb: ShopGearRowCallbacks,
  ) {
    const { owned, lockedByLv, canAfford, reqLevel } = state;
    const buyable = !owned && !lockedByLv && canAfford;

    const bg = scene.add
      .rectangle(x, y, GEAR_ROW_W, ROW_H, BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER.LOCKED)
      .setInteractive({ useHandCursor: buyable });

    const iconKey = itemFrames[item.id];
    const iconLeft = x - GEAR_ROW_W / 2 + ICON_SIZE / 2 + 10;
    const icon = iconKey && scene.textures.exists(iconKey)
      ? scene.add.image(iconLeft, y, iconKey).setDisplaySize(ICON_SIZE, ICON_SIZE)
      : null;

    const textLeft = x - GEAR_ROW_W / 2 + ICON_SIZE + 22;
    const nameTxt = scene.add
      .text(textLeft, y - 16, item.name, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: RARITY_COLOR[item.rarity] ?? TXT.GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);

    const statTexts = this.buildStatChunks(scene, item, textLeft, y + 14);

    let badgeText: string;
    let badgeColor: string;
    if (owned) {
      badgeText = "OWNED";
      badgeColor = TXT.LOCKED;
    } else if (lockedByLv) {
      badgeText = `Req Lv ${reqLevel}`;
      badgeColor = TXT.LOCKED;
    } else {
      badgeText = `${item.cost}g`;
      badgeColor = canAfford ? TXT.GOLD : TXT.DEFEAT;
    }
    const badgeTxt = scene.add
      .text(x + GEAR_ROW_W / 2 - 16, y, badgeText, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: badgeColor,
      })
      .setOrigin(1, 0.5);

    bg.on("pointerover", () => {
      bg.setFillStyle(buyable ? BG.BTN_HOVER : BG.MOVE_CARD);
      bg.setStrokeStyle(1, buyable ? BORDER.GOLD_BRIGHT : BORDER.LOCKED);
      cb.onHover();
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(BG.MOVE_CARD);
      bg.setStrokeStyle(1, BORDER.LOCKED);
      cb.onHoverEnd();
    });
    if (buyable) {
      bg.on("pointerdown", cb.onBuy);
    } else if (!owned) {
      bg.on("pointerdown", cb.onDenied);
    }

    if (owned || lockedByLv) bg.setAlpha(0.55);
    else if (!canAfford) bg.setAlpha(0.8);

    scroll.container.add([bg, ...(icon ? [icon] : []), nameTxt, ...statTexts, badgeTxt]);
  }

  private buildStatChunks(
    scene: Phaser.Scene,
    item: GearItem,
    x: number,
    y: number,
  ): Phaser.GameObjects.Text[] {
    const chunks: Array<{ value: number; label: string; color: string }> = [];
    if (item.statBonuses.attack) chunks.push({ value: item.statBonuses.attack, label: "ATK", color: TXT.STAT_ATTACK });
    if (item.statBonuses.defense) chunks.push({ value: item.statBonuses.defense, label: "DEF", color: TXT.STAT_DEFENSE });
    if (item.statBonuses.magic) chunks.push({ value: item.statBonuses.magic, label: "MAG", color: TXT.STAT_MAGIC });
    if (item.statBonuses.maxHp) chunks.push({ value: item.statBonuses.maxHp, label: "HP", color: TXT.STAT_HP });

    const out: Phaser.GameObjects.Text[] = [];
    let cursor = x;
    for (const c of chunks) {
      const sign = c.value >= 0 ? "+" : "";
      const txt = scene.add
        .text(cursor, y, `${sign}${c.value} ${c.label}`, {
          fontSize: FONT.BODY,
          fontFamily: "EnchantedLand",
          color: c.color,
        })
        .setOrigin(0, 0.5);
      out.push(txt);
      cursor += txt.width + 12;
    }
    return out;
  }
}
