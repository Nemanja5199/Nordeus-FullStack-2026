import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import {
  createModalFooter,
  TooltipManager,
  createScrollableArea,
  type ScrollableArea,
  ShopGearRow,
  ShopPotionRow,
} from "../ui";
import { GameState, POTION_PRICE } from "../state";
import { SfxPlayer, Sfx } from "../audio";
import type { GearItem } from "../types/game";
import { BG, TXT, RARITY_COLOR } from "../constants";

interface ShopData {
  returnScene: SceneKey;
}

const ROW_GAP = 8;
const ROW_H = 76;
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
    this.gearScroll?.destroy();
    this.gearScroll = undefined;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "SHOP", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 78, `Gold: ${GameState.hero.gold ?? 0}g`, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
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
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);

    const items = Object.values(GameState.runConfig!.items).sort(
      (a, b) => a.tier - b.tier || a.slot.localeCompare(b.slot),
    );

    const colLeft = width * 0.27;
    const colRight = width * 0.73;
    const startY = 148;

    const GEAR_VIEWPORT_BOTTOM = 440;
    const viewportH = Math.max(220, GEAR_VIEWPORT_BOTTOM - startY);
    const rowCount = Math.ceil(items.length / 2);
    const contentH = rowCount * (ROW_H + ROW_GAP);

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
      const y = row * (ROW_H + ROW_GAP) + ROW_H / 2;
      const owned = GameState.isItemOwned(item.id);
      const lockedByLv = item.tier > GameState.unlockedTier();
      const canAfford = (GameState.hero.gold ?? 0) >= item.cost;
      new ShopGearRow(
        this,
        x,
        y,
        item,
        { owned, lockedByLv, canAfford, reqLevel: TIER_UNLOCK_LEVEL[item.tier] },
        this.gearScroll!,
        {
          onBuy: () => this.onBuyItem(item.id),
          onDenied: () => SfxPlayer.play(this, Sfx.Denied),
          onHover: () => this.showItemTooltip(item),
          onHoverEnd: () => this.tooltip.clear(),
        },
      );
    });

    this.gearScroll.refreshInputState();
  }

  private onBuyItem(itemId: string) {
    if (GameState.buyItem(itemId)) {
      SfxPlayer.play(this, Sfx.GoldPickup);
      this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
      this.children.removeAll(true);
      this.create({ returnScene: this.returnScene });
    } else {
      SfxPlayer.play(this, Sfx.Denied);
    }
  }

  private showItemTooltip(item: GearItem) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 195;
    this.tooltip.begin();
    this.tooltip.addText(cx, baseY, item.name, {
      fontSize: FONT.LG,
      fontFamily: "EnchantedLand",
      color: RARITY_COLOR[item.rarity] ?? TXT.GOLD,
    });
    this.tooltip.addText(cx, baseY + 28, item.description, {
      fontSize: FONT.BODY,
      color: TXT.MUTED,
    });
  }

  private buildPotionSection(width: number, height: number) {
    const sectionH = 38 + ShopPotionRow.HEIGHT + 6 + ShopPotionRow.HEIGHT / 2;
    const startY = Math.min(470, height - 205 - sectionH);
    this.add
      .text(width / 2, startY, "POTIONS", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);

    new ShopPotionRow(
      this,
      width / 2,
      startY + 38,
      "potion_hp",
      "HP Potion",
      "Heals 40 HP",
      POTION_PRICE.HP,
      (GameState.hero.gold ?? 0) >= POTION_PRICE.HP,
      {
        onBuy: () => this.onBuyPotion(GameState.buyHpPotion()),
        onDenied: () => SfxPlayer.play(this, Sfx.Denied),
      },
    );
    new ShopPotionRow(
      this,
      width / 2,
      startY + 38 + ShopPotionRow.HEIGHT + 6,
      "potion_mp",
      "Mana Potion",
      "Restores 30 MP",
      POTION_PRICE.MANA,
      (GameState.hero.gold ?? 0) >= POTION_PRICE.MANA,
      {
        onBuy: () => this.onBuyPotion(GameState.buyManaPotion()),
        onDenied: () => SfxPlayer.play(this, Sfx.Denied),
      },
    );
  }

  private onBuyPotion(success: boolean) {
    if (success) {
      SfxPlayer.play(this, Sfx.GoldPickup);
      this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
      this.children.removeAll(true);
      this.create({ returnScene: this.returnScene });
    } else {
      SfxPlayer.play(this, Sfx.Denied);
    }
  }
}
