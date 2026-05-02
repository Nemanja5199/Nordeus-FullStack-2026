import Phaser from "phaser";
import { Scene, type SceneKey, FONT, EQ_CARD, INV_GRID } from "../constants";
import { createModalFooter, TooltipManager, createScrollableArea, type ScrollableArea } from "../ui";
import { GameState, getGearBonuses } from "../state";
import { SfxPlayer, Sfx } from "../audio";
import type { GearItem, GearSlot } from "../types/game";
import { itemFrames } from "../sprites";
import { BG, BORDER, TXT, RARITY_COLOR, RARITY_COLOR_NUM, STAT_COLOR } from "../constants";

const SLOTS: GearSlot[] = ["weapon", "helmet", "chestplate", "gloves", "ring"];
const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  chestplate: "Chestplate",
  gloves: "Gloves",
  ring: "Ring",
};

interface EquipmentData {
  returnScene: SceneKey;
}

export class EquipmentScene extends Phaser.Scene {
  private returnScene!: SceneKey;
  private hintText!: Phaser.GameObjects.Text;
  private tooltip!: TooltipManager;
  private inventoryScroll?: ScrollableArea;

  constructor() {
    super(Scene.Equipment);
  }

  create(data: EquipmentData) {
    this.returnScene = data.returnScene ?? Scene.TreeMap;
    this.inventoryScroll?.destroy();
    this.inventoryScroll = undefined;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "EQUIPMENT", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const colLeft = width * 0.26;
    const colRight = width * 0.66;

    this.add
      .text(colLeft, 90, "EQUIPPED", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_MID })
      .setOrigin(0.5);
    this.add
      .text(colRight, 90, "INVENTORY", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_MID })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, (90 + height - 80) / 2, 1, height - 170, BORDER.GOLD, 0.25);

    const items = GameState.runConfig!.items;
    const bonuses = getGearBonuses(GameState.hero.equipment ?? {}, items);
    const bonusParts: string[] = [];
    if (bonuses.attack) bonusParts.push(`ATK +${bonuses.attack}`);
    if (bonuses.defense) bonusParts.push(`DEF +${bonuses.defense}`);
    if (bonuses.magic) bonusParts.push(`MAG +${bonuses.magic}`);
    if (bonuses.maxHp) bonusParts.push(`HP +${bonuses.maxHp}`);
    this.add
      .text(colLeft, 110, bonusParts.length ? bonusParts.join("   ") : "No gear equipped", {
        fontSize: FONT.SM,
        color: bonusParts.length ? TXT.GOLD_LIGHT : TXT.MUTED,
      })
      .setOrigin(0.5);

    this.hintText = createModalFooter(this, {
      hint: "Hover an item to inspect. Click to equip / unequip.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });
    this.tooltip = new TooltipManager(this, this.hintText);

    this.buildEquippedSlots(colLeft);
    this.buildInventoryGrid(colRight);
  }

  private showItemTooltip(item: GearItem): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 150;

    this.tooltip.begin();

    this.tooltip.addText(cx, baseY, item.name, {
      fontSize: FONT.MD,
      fontFamily: "EnchantedLand",
      color: RARITY_COLOR[item.rarity] ?? TXT.GOLD,
    });

    const statParts: { text: string; color: string }[] = [];
    if (item.statBonuses.attack) statParts.push({ text: `ATK +${item.statBonuses.attack}`, color: STAT_COLOR.attack });
    if (item.statBonuses.defense) statParts.push({ text: `DEF +${item.statBonuses.defense}`, color: STAT_COLOR.defense });
    if (item.statBonuses.magic) statParts.push({ text: `MAG +${item.statBonuses.magic}`, color: STAT_COLOR.magic });
    if (item.statBonuses.maxHp) statParts.push({ text: `HP +${item.statBonuses.maxHp}`, color: STAT_COLOR.maxHp });
    this.tooltip.addHorizontalRow(statParts, baseY + 22, FONT.BODY, 90);

    this.tooltip.addText(cx, baseY + 44, item.description, {
      fontSize: FONT.SM,
      color: TXT.MUTED,
    });
  }

  private clearItemTooltip(): void {
    this.tooltip.clear();
  }

  private buildEquippedSlots(panelX: number) {
    const items = GameState.runConfig!.items;
    SLOTS.forEach((slot, i) => {
      const itemId = GameState.hero.equipment?.[slot];
      const item = itemId ? items[itemId] : undefined;
      const y = EQ_CARD.START_Y + i * (EQ_CARD.H + EQ_CARD.GAP);

      const bg = this.add
        .rectangle(panelX, y, EQ_CARD.W, EQ_CARD.H, item ? BG.MOVE_EQUIPPED : BG.MOVE_CARD, 0.92)
        .setStrokeStyle(1, item ? BORDER.GOLD_BRIGHT : BORDER.LOCKED)
        .setInteractive({ useHandCursor: !!item });

      this.add.text(panelX - EQ_CARD.W / 2 + 10, y - EQ_CARD.H / 2 + 7, SLOT_LABELS[slot], {
        fontSize: FONT.SM,
        color: TXT.MUTED,
      });

      const iconX = panelX - EQ_CARD.W / 2 + EQ_CARD.ICON_SIZE / 2 + 10;
      const contentY = y + 12;
      if (item && itemId) {
        const frameKey = itemFrames[itemId];
        if (frameKey && this.textures.exists(frameKey)) {
          this.add.image(iconX, contentY, frameKey).setDisplaySize(EQ_CARD.ICON_SIZE, EQ_CARD.ICON_SIZE);
        }
      }

      const nameX = panelX - EQ_CARD.W / 2 + EQ_CARD.ICON_SIZE + 24;
      this.add.text(nameX, contentY, item ? item.name : "(empty)", {
        fontSize: FONT.BODY,
        fontFamily: "EnchantedLand",
        color: item ? RARITY_COLOR[item.rarity] ?? TXT.GOLD : TXT.LOCKED,
      }).setOrigin(0, 0.5);

      if (item) {
        bg.on("pointerover", () => {
          bg.setAlpha(0.75);
          this.showItemTooltip(item);
        });
        bg.on("pointerout", () => {
          bg.setAlpha(1);
          this.clearItemTooltip();
        });
        bg.on("pointerdown", () => {
          GameState.unequipItem(slot);
          SfxPlayer.play(this, Sfx.Unequip);
          this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        });
      }
    });
  }

  private buildInventoryGrid(originX: number) {
    const items = GameState.runConfig!.items;
    const inv = GameState.hero.inventory ?? [];

    if (inv.length === 0) {
      this.add
        .text(originX, INV_GRID.START_Y + 30, "Inventory empty.", { fontSize: FONT.BODY, color: TXT.MUTED })
        .setOrigin(0.5);
      return;
    }

    const step = INV_GRID.CELL + INV_GRID.GAP;
    const gridW = INV_GRID.COLS * step - INV_GRID.GAP;
    const gridLeft = originX - gridW / 2 + INV_GRID.CELL / 2;

    const rowCount = Math.ceil(inv.length / INV_GRID.COLS);
    const contentH = rowCount * step - INV_GRID.GAP;
    const { width: scaleW, height: scaleH } = this.scale;
    const viewportH = Math.max(120, scaleH - INV_GRID.START_Y - 160);

    this.inventoryScroll = createScrollableArea(this, {
      x: 0,
      y: INV_GRID.START_Y,
      width: scaleW,
      height: viewportH,
      contentHeight: contentH,
    });

    inv.forEach((itemId, i) => {
      const item: GearItem | undefined = items[itemId];
      if (!item) return;

      const col = i % INV_GRID.COLS;
      const row = Math.floor(i / INV_GRID.COLS);
      const cx = gridLeft + col * step;
      const cy = row * step + INV_GRID.CELL / 2;

      const bg = this.add
        .rectangle(cx, cy, INV_GRID.CELL, INV_GRID.CELL, BG.MOVE_EQUIPPED, 0.9)
        .setStrokeStyle(1, BORDER.GOLD)
        .setInteractive({ useHandCursor: true });

      const frameKey = itemFrames[itemId];
      const icon = frameKey && this.textures.exists(frameKey)
        ? this.add.image(cx, cy - 6, frameKey).setDisplaySize(INV_GRID.CELL - 16, INV_GRID.CELL - 16)
        : null;

      const rarityStrip = this.add.rectangle(
        cx,
        cy + INV_GRID.CELL / 2 - 6,
        INV_GRID.CELL - 4,
        8,
        RARITY_COLOR_NUM[item.rarity] ?? 0xc8a035,
        0.8,
      );

      bg.on("pointerover", () => {
        bg.setAlpha(0.7);
        this.showItemTooltip(item);
      });
      bg.on("pointerout", () => {
        bg.setAlpha(1);
        this.clearItemTooltip();
      });
      bg.on("pointerdown", () => {
        GameState.equipItem(itemId);
        SfxPlayer.play(this, Sfx.Equip);
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.children.removeAll(true);
        this.create({ returnScene: this.returnScene });
      });

      this.inventoryScroll!.container.add([bg, ...(icon ? [icon] : []), rarityStrip]);
    });

    this.inventoryScroll.refreshInputState();
  }
}