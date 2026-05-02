import Phaser from "phaser";
import { Scene, type SceneKey } from "./sceneKeys";
import { FONT_TITLE, FONT_MD, FONT_BODY, FONT_SM } from "../ui/typography";
import { GameState, HP_POTION_PRICE, MANA_POTION_PRICE } from "../utils/gameState";
import { SfxPlayer, Sfx } from "../utils/sfx";
import type { GearItem } from "../types/game";
import { createModalFooter } from "../ui/ModalFooter";
import { TooltipManager } from "../ui/TooltipManager";
import { createScrollableArea, type ScrollableArea } from "../ui/ScrollableArea";
import { itemFrames } from "../utils/itemFrames";
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
  RARITY_COLOR,
} from "../ui/colors";

interface ShopData {
  returnScene: SceneKey;
}

const ROW_H = 56;
const GEAR_ROW_W = 380;
const POTION_ROW_W = 500;
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
    // children.removeAll(true) doesn't tear down our wheel listener — destroy explicitly before re-creating.
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
      .text(width / 2, 76, `Gold: ${GameState.hero.gold ?? 0}g`, {
        fontSize: FONT_MD,
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

  private buildGearSection(width: number, height: number) {
    this.add
      .text(width / 2, 110, "GEAR", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    const items = Object.values(GameState.runConfig!.items).sort(
      (a, b) => a.tier - b.tier || a.slot.localeCompare(b.slot),
    );

    const colLeft = width * 0.27;
    const colRight = width * 0.73;
    const startY = 138;
    const rowGap = 6;

    // Reserve space at the bottom for the potion section + close button (~250 px).
    const viewportH = Math.max(180, Math.min(height - 270, 470) - startY);
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
      // Position relative to the scroll viewport (y=0 == top of viewport).
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
    const icon = iconKey && this.textures.exists(iconKey)
      ? this.add.image(x - GEAR_ROW_W / 2 + 26, y, iconKey).setDisplaySize(36, 36)
      : null;

    const nameTxt = this.add
      .text(x - GEAR_ROW_W / 2 + 52, y - 12, item.name, {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: RARITY_COLOR[item.rarity] ?? TXT_GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);

    const statTxt = this.add
      .text(x - GEAR_ROW_W / 2 + 52, y + 10, this.formatStatSummary(item), {
        fontSize: FONT_SM,
        color: TXT_MUTED,
      })
      .setOrigin(0, 0.5);

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
      .text(x + GEAR_ROW_W / 2 - 14, y, badgeText, {
        fontSize: FONT_BODY,
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
      // Card is shown but un-buyable (insufficient gold or locked tier).
      // Don't be silent — give a denied tick so the click registers as
      // intentional rather than a dead area.
      bg.on("pointerdown", () => SfxPlayer.play(this, Sfx.Denied));
    }

    if (owned || lockedByLv) bg.setAlpha(0.55);
    else if (!canAfford) bg.setAlpha(0.8);

    scroll.container.add([bg, ...(icon ? [icon] : []), nameTxt, statTxt, badgeTxt]);
  }

  private formatStatSummary(item: GearItem): string {
    const parts: string[] = [];
    if (item.statBonuses.attack) parts.push(`+${item.statBonuses.attack} ATK`);
    if (item.statBonuses.defense) parts.push(`+${item.statBonuses.defense} DEF`);
    if (item.statBonuses.magic) parts.push(`+${item.statBonuses.magic} MAG`);
    if (item.statBonuses.maxHp) parts.push(`+${item.statBonuses.maxHp} HP`);
    return parts.join("  ");
  }

  private showItemTooltip(item: GearItem) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 200;
    this.tooltip.begin();
    this.tooltip.addText(cx, baseY, item.name, {
      fontSize: FONT_MD,
      fontFamily: "EnchantedLand",
      color: RARITY_COLOR[item.rarity] ?? TXT_GOLD,
    });
    this.tooltip.addText(cx, baseY + 22, item.description, {
      fontSize: FONT_SM,
      color: TXT_MUTED,
    });
  }

  private buildPotionSection(width: number, height: number) {
    const startY = Math.min(height - 220, 470);
    this.add
      .text(width / 2, startY, "POTIONS", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    this.buildPotionRow(
      width / 2,
      startY + 36,
      "potion_hp",
      "HP Potion",
      "Heals 40 HP",
      HP_POTION_PRICE,
      () => GameState.buyHpPotion(),
    );
    this.buildPotionRow(
      width / 2,
      startY + 36 + ROW_H + 6,
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
      .rectangle(x, y, POTION_ROW_W, ROW_H - 4, BG_MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER_LOCKED)
      .setInteractive({ useHandCursor: canAfford });

    if (this.textures.exists(iconKey)) {
      this.add.image(x - POTION_ROW_W / 2 + 26, y, iconKey).setDisplaySize(36, 36);
    }
    this.add
      .text(x - POTION_ROW_W / 2 + 52, y - 12, name, {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_LIGHT,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(x - POTION_ROW_W / 2 + 52, y + 10, desc, {
        fontSize: FONT_SM,
        color: TXT_MUTED,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(x + POTION_ROW_W / 2 - 14, y, `${cost}g`, {
        fontSize: FONT_BODY,
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
