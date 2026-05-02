import Phaser from "phaser";
import { Scene, type SceneKey } from "./sceneKeys";
import { FONT_TITLE, FONT_LG, FONT_MD, FONT_BODY, createModalFooter, TooltipManager, createScrollableArea, type ScrollableArea } from "../ui";
import { GameState, HP_POTION_PRICE, MANA_POTION_PRICE } from "../state";
import { SfxPlayer, Sfx } from "../audio";
import type { GearItem } from "../types/game";
import { itemFrames } from "../sprites";
import {
  BG_DARKEST,
  BG_MOVE_CARD,
  BG_BTN_HOVER,
  BORDER_GOLD_BRIGHT,
  BORDER_LOCKED,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_MID,
  TXT_MUTED,
  TXT_LOCKED,
  TXT_STROKE_HEADER,
  TXT_DEFEAT,
  TXT_STAT_ATTACK,
  TXT_STAT_DEFENSE,
  TXT_STAT_MAGIC,
  TXT_STAT_HP,
  RARITY_COLOR,
} from "../ui";

interface ShopData {
  returnScene: SceneKey;
}

const ROW_H = 76;
const POTION_ROW_H = 60;
const ICON_SIZE = 48;
const POTION_ICON_SIZE = 40;
const GEAR_ROW_W = 460;
const POTION_ROW_W = 580;
const TIER_UNLOCK_LEVEL: Record<1 | 2 | 3, number> = { 1: 1, 2: 3, 3: 6 };

export class ShopScene extends Phaser.Scene {
  private returnScene!: SceneKey;
  private hintText!: Phaser.GameObjects.Text;
  private tooltip!: TooltipManager;
  private gearScroll?: ScrollableArea;

  constructor() {
    super(Scene.Shop);
  }

  create(data: ShopData) {
    this.returnScene = data.returnScene ?? Scene.TreeMap;
    // children.removeAll doesn't drop the wheel listener — destroy explicitly.
    this.gearScroll?.destroy();
    this.gearScroll = undefined;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "SHOP", {
        fontSize: FONT_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 78, `Gold: ${GameState.hero.gold ?? 0}g`, {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
      })
      .setOrigin(0.5);

    this.hintText = createModalFooter(this, {
      hint: "Click to buy. Items unlock with hero level: tier 2 at Lv 3, tier 3 at Lv 6.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });
    this.tooltip = new TooltipManager(this, this.hintText);

    this.buildGearSection(width, height);
    this.buildPotionSection(width, height);
  }

  private buildGearSection(width: number, _height: number) {
    this.add
      .text(width / 2, 116, "GEAR", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    const items = Object.values(GameState.runConfig!.items).sort(
      (a, b) => a.tier - b.tier || a.slot.localeCompare(b.slot),
    );

    const colLeft = width * 0.27;
    const colRight = width * 0.73;
    const startY = 148;
    const rowGap = 8;

    // Layout (h=800): 148–440 gear viewport · 470–580 potions · 605–660 tooltip
    // · 670 hint · 745 close. Capping gear at 440 prevents bottom-row bleed
    // into the potion stripe while scrolling.
    const GEAR_VIEWPORT_BOTTOM = 440;
    const viewportH = Math.max(220, GEAR_VIEWPORT_BOTTOM - startY);
    const rowCount = Math.ceil(items.length / 2);
    const contentH = rowCount * (ROW_H + rowGap);

    this.gearScroll = createScrollableArea(this, {
      x: 0,
      y: startY,
      width,
      height: viewportH,
      contentHeight: contentH,
    });

    items.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col === 0 ? colLeft : colRight;
      const y = row * (ROW_H + rowGap) + ROW_H / 2;
      this.buildGearRow(x, y, item, this.gearScroll!);
    });

    this.gearScroll.refreshInputState();
  }

  private buildGearRow(x: number, y: number, item: GearItem, scroll: ScrollableArea) {
    const owned = GameState.isItemOwned(item.id);
    const lockedByLv = item.tier > GameState.unlockedTier();
    const canAfford = (GameState.hero.gold ?? 0) >= item.cost;
    const buyable = !owned && !lockedByLv && canAfford;

    const bg = this.add
      .rectangle(x, y, GEAR_ROW_W, ROW_H, BG_MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER_LOCKED)
      .setInteractive({ useHandCursor: buyable });

    const iconKey = itemFrames[item.id];
    const iconLeft = x - GEAR_ROW_W / 2 + ICON_SIZE / 2 + 10;
    const icon = iconKey && this.textures.exists(iconKey)
      ? this.add.image(iconLeft, y, iconKey).setDisplaySize(ICON_SIZE, ICON_SIZE)
      : null;

    const textLeft = x - GEAR_ROW_W / 2 + ICON_SIZE + 22;
    const nameTxt = this.add
      .text(textLeft, y - 16, item.name, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: RARITY_COLOR[item.rarity] ?? TXT_GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);

    // Per-stat colored chunks (Phaser.Text has no inline coloring).
    const statTexts = this.buildStatChunks(item, textLeft, y + 14);

    let badgeText: string;
    let badgeColor: string;
    if (owned) {
      badgeText = "OWNED";
      badgeColor = TXT_LOCKED;
    } else if (lockedByLv) {
      badgeText = `Req Lv ${TIER_UNLOCK_LEVEL[item.tier]}`;
      badgeColor = TXT_LOCKED;
    } else {
      badgeText = `${item.cost}g`;
      badgeColor = canAfford ? TXT_GOLD : TXT_DEFEAT;
    }
    const badgeTxt = this.add
      .text(x + GEAR_ROW_W / 2 - 16, y, badgeText, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: badgeColor,
      })
      .setOrigin(1, 0.5);

    bg.on("pointerover", () => {
      bg.setFillStyle(buyable ? BG_BTN_HOVER : BG_MOVE_CARD);
      bg.setStrokeStyle(1, buyable ? BORDER_GOLD_BRIGHT : BORDER_LOCKED);
      this.showItemTooltip(item);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(BG_MOVE_CARD);
      bg.setStrokeStyle(1, BORDER_LOCKED);
      this.tooltip.clear();
    });
    if (buyable) {
      bg.on("pointerdown", () => {
        if (GameState.buyItem(item.id)) {
          SfxPlayer.play(this, Sfx.GoldPickup);
          this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        } else {
          SfxPlayer.play(this, Sfx.Denied);
        }
      });
    } else if (!owned) {
      // Insufficient gold / locked tier — denied tick so the click isn't silent.
      bg.on("pointerdown", () => SfxPlayer.play(this, Sfx.Denied));
    }

    if (owned || lockedByLv) bg.setAlpha(0.55);
    else if (!canAfford) bg.setAlpha(0.8);

    scroll.container.add([bg, ...(icon ? [icon] : []), nameTxt, ...statTexts, badgeTxt]);
  }

  // Lays out +N STAT chunks left-to-right, each in its stat color.
  private buildStatChunks(item: GearItem, x: number, y: number): Phaser.GameObjects.Text[] {
    const chunks: Array<{ value: number; label: string; color: string }> = [];
    if (item.statBonuses.attack) chunks.push({ value: item.statBonuses.attack, label: "ATK", color: TXT_STAT_ATTACK });
    if (item.statBonuses.defense) chunks.push({ value: item.statBonuses.defense, label: "DEF", color: TXT_STAT_DEFENSE });
    if (item.statBonuses.magic) chunks.push({ value: item.statBonuses.magic, label: "MAG", color: TXT_STAT_MAGIC });
    if (item.statBonuses.maxHp) chunks.push({ value: item.statBonuses.maxHp, label: "HP",  color: TXT_STAT_HP });

    const out: Phaser.GameObjects.Text[] = [];
    let cursor = x;
    for (const c of chunks) {
      const sign = c.value >= 0 ? "+" : "";
      const txt = this.add
        .text(cursor, y, `${sign}${c.value} ${c.label}`, {
          fontSize: FONT_BODY,
          fontFamily: "EnchantedLand",
          color: c.color,
        })
        .setOrigin(0, 0.5);
      out.push(txt);
      cursor += txt.width + 12;
    }
    return out;
  }

  private showItemTooltip(item: GearItem) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 195;
    this.tooltip.begin();
    this.tooltip.addText(cx, baseY, item.name, {
      fontSize: FONT_LG,
      fontFamily: "EnchantedLand",
      color: RARITY_COLOR[item.rarity] ?? TXT_GOLD,
    });
    this.tooltip.addText(cx, baseY + 28, item.description, {
      fontSize: FONT_BODY,
      color: TXT_MUTED,
    });
  }

  private buildPotionSection(width: number, height: number) {
    // Sits just below the gear viewport. Falls back above the tooltip stripe on tiny screens.
    const sectionH = 38 + POTION_ROW_H + 6 + POTION_ROW_H / 2;
    const startY = Math.min(470, height - 205 - sectionH);
    this.add
      .text(width / 2, startY, "POTIONS", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    this.buildPotionRow(
      width / 2,
      startY + 38,
      "potion_hp",
      "HP Potion",
      "Heals 40 HP",
      HP_POTION_PRICE,
      () => GameState.buyHpPotion(),
    );
    this.buildPotionRow(
      width / 2,
      startY + 38 + POTION_ROW_H + 6,
      "potion_mp",
      "Mana Potion",
      "Restores 30 MP",
      MANA_POTION_PRICE,
      () => GameState.buyManaPotion(),
    );
  }

  private buildPotionRow(
    x: number,
    y: number,
    iconKey: string,
    name: string,
    desc: string,
    cost: number,
    onBuy: () => boolean,
  ) {
    const canAfford = (GameState.hero.gold ?? 0) >= cost;

    const bg = this.add
      .rectangle(x, y, POTION_ROW_W, POTION_ROW_H, BG_MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER_LOCKED)
      .setInteractive({ useHandCursor: canAfford });

    const iconLeft = x - POTION_ROW_W / 2 + POTION_ICON_SIZE / 2 + 10;
    if (this.textures.exists(iconKey)) {
      this.add.image(iconLeft, y, iconKey).setDisplaySize(POTION_ICON_SIZE, POTION_ICON_SIZE);
    }
    const textLeft = x - POTION_ROW_W / 2 + POTION_ICON_SIZE + 20;
    this.add
      .text(textLeft, y - 12, name, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(textLeft, y + 12, desc, {
        fontSize: FONT_BODY,
        color: TXT_MUTED,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(x + POTION_ROW_W / 2 - 16, y, `${cost}g`, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: canAfford ? TXT_GOLD : TXT_DEFEAT,
      })
      .setOrigin(1, 0.5);

    bg.on("pointerover", () => {
      bg.setFillStyle(canAfford ? BG_BTN_HOVER : BG_MOVE_CARD);
      bg.setStrokeStyle(1, canAfford ? BORDER_GOLD_BRIGHT : BORDER_LOCKED);
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(BG_MOVE_CARD);
      bg.setStrokeStyle(1, BORDER_LOCKED);
    });
    if (canAfford) {
      bg.on("pointerdown", () => {
        if (onBuy()) {
          SfxPlayer.play(this, Sfx.GoldPickup);
          this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        } else {
          SfxPlayer.play(this, Sfx.Denied);
        }
      });
    } else {
      bg.setAlpha(0.8);
      bg.on("pointerdown", () => SfxPlayer.play(this, Sfx.Denied));
    }
  }
}
