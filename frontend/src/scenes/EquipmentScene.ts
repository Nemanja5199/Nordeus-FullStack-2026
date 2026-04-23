import Phaser from "phaser";
import { FONT_TITLE, FONT_MD, FONT_BODY, FONT_SM } from "../ui/typography";
import { EQ_CARD_W, EQ_CARD_H, EQ_CARD_GAP, EQ_START_Y, EQ_ICON_SIZE as EQ_ICON, INV_GRID_CELL as GRID_CELL, INV_GRID_GAP as GRID_GAP, INV_GRID_COLS as GRID_COLS, INV_GRID_START_Y as GRID_START_Y } from "../ui/layout";
import { GameState, getGearBonuses } from "../utils/gameState";
import type { GearItem, GearSlot } from "../types/game";
import { createModalFooter } from "../ui/ModalFooter";
import { itemFrames } from "../utils/itemFrames";
import {
  BG_DARKEST,
  BG_MOVE_CARD,
  BG_MOVE_EQUIPPED,
  BORDER_GOLD,
  BORDER_GOLD_BRIGHT,
  BORDER_LOCKED,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_MID,
  TXT_MUTED,
  TXT_LOCKED,
  TXT_STROKE_HEADER,
} from "../ui/colors";

const SLOTS: GearSlot[] = ["weapon", "helmet", "chestplate", "gloves", "ring"];
const SLOT_LABELS: Record<GearSlot, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  chestplate: "Chestplate",
  gloves: "Gloves",
  ring: "Ring",
};
const RARITY_COLOR: Record<string, string> = {
  common: TXT_GOLD_MID,
  rare: "#a78bfa",
  epic: "#f97316",
};
const STAT_COLOR = {
  attack: "#ef4444",
  defense: "#9ca3af",
  magic: "#a78bfa",
  maxHp: "#4ade80",
};

// Equipped column

// Inventory grid

interface EquipmentData {
  returnScene: string;
}

export class EquipmentScene extends Phaser.Scene {
  private returnScene!: string;
  private hintText!: Phaser.GameObjects.Text;
  private tooltipObjects: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("EquipmentScene");
  }

  create(data: EquipmentData) {
    this.returnScene = data.returnScene ?? "TreeMapScene";
    this.tooltipObjects = [];

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "EQUIPMENT", {
        fontSize: FONT_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const colLeft = width * 0.26;
    const colRight = width * 0.66;

    this.add
      .text(colLeft, 90, "EQUIPPED", { fontSize: FONT_BODY, fontFamily: "EnchantedLand", color: TXT_GOLD_MID })
      .setOrigin(0.5);
    this.add
      .text(colRight, 90, "INVENTORY", { fontSize: FONT_BODY, fontFamily: "EnchantedLand", color: TXT_GOLD_MID })
      .setOrigin(0.5);

    this.add.rectangle(width / 2, (90 + height - 80) / 2, 1, height - 170, BORDER_GOLD, 0.25);

    // Gear bonus summary
    const items = GameState.runConfig!.items;
    const bonuses = getGearBonuses(GameState.hero.equipment ?? {}, items);
    const bonusParts: string[] = [];
    if (bonuses.attack) bonusParts.push(`ATK +${bonuses.attack}`);
    if (bonuses.defense) bonusParts.push(`DEF +${bonuses.defense}`);
    if (bonuses.magic) bonusParts.push(`MAG +${bonuses.magic}`);
    if (bonuses.maxHp) bonusParts.push(`HP +${bonuses.maxHp}`);
    this.add
      .text(colLeft, 110, bonusParts.length ? bonusParts.join("   ") : "No gear equipped", {
        fontSize: FONT_SM,
        color: bonusParts.length ? TXT_GOLD_LIGHT : TXT_MUTED,
      })
      .setOrigin(0.5);

    this.hintText = createModalFooter(this, {
      hint: "Hover an item to inspect. Click to equip / unequip.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });

    this.buildEquippedSlots(colLeft);
    this.buildInventoryGrid(colRight);
  }

  private showItemTooltip(item: GearItem) {
    this.tooltipObjects.forEach((t) => t.destroy());
    this.tooltipObjects = [];
    this.hintText.setVisible(false);

    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 150;

    // Item name
    this.tooltipObjects.push(
      this.add
        .text(cx, baseY, item.name, {
          fontSize: FONT_MD,
          fontFamily: "EnchantedLand",
          color: RARITY_COLOR[item.rarity] ?? TXT_GOLD,
        })
        .setOrigin(0.5),
    );

    // Stat bonuses — each colored, laid out horizontally
    const statParts: { label: string; color: string }[] = [];
    if (item.statBonuses.attack) statParts.push({ label: `ATK +${item.statBonuses.attack}`, color: STAT_COLOR.attack });
    if (item.statBonuses.defense) statParts.push({ label: `DEF +${item.statBonuses.defense}`, color: STAT_COLOR.defense });
    if (item.statBonuses.magic) statParts.push({ label: `MAG +${item.statBonuses.magic}`, color: STAT_COLOR.magic });
    if (item.statBonuses.maxHp) statParts.push({ label: `HP +${item.statBonuses.maxHp}`, color: STAT_COLOR.maxHp });

    if (statParts.length > 0) {
      const spacing = 90;
      const startX = cx - ((statParts.length - 1) * spacing) / 2;
      statParts.forEach((p, i) => {
        this.tooltipObjects.push(
          this.add
            .text(startX + i * spacing, baseY + 22, p.label, {
              fontSize: FONT_BODY,
              fontFamily: "EnchantedLand",
              color: p.color,
            })
            .setOrigin(0.5),
        );
      });
    }

    // Description
    this.tooltipObjects.push(
      this.add
        .text(cx, baseY + 44, item.description, {
          fontSize: FONT_SM,
          color: TXT_MUTED,
        })
        .setOrigin(0.5),
    );
  }

  private clearItemTooltip() {
    this.tooltipObjects.forEach((t) => t.destroy());
    this.tooltipObjects = [];
    this.hintText.setVisible(true);
  }

  private buildEquippedSlots(panelX: number) {
    const items = GameState.runConfig!.items;
    SLOTS.forEach((slot, i) => {
      const itemId = GameState.hero.equipment?.[slot];
      const item = itemId ? items[itemId] : undefined;
      const y = EQ_START_Y + i * (EQ_CARD_H + EQ_CARD_GAP);

      const bg = this.add
        .rectangle(panelX, y, EQ_CARD_W, EQ_CARD_H, item ? BG_MOVE_EQUIPPED : BG_MOVE_CARD, 0.92)
        .setStrokeStyle(1, item ? BORDER_GOLD_BRIGHT : BORDER_LOCKED)
        .setInteractive({ useHandCursor: !!item });

      // Slot label — top-left, clearly separated from content
      this.add.text(panelX - EQ_CARD_W / 2 + 10, y - EQ_CARD_H / 2 + 7, SLOT_LABELS[slot], {
        fontSize: FONT_SM,
        color: TXT_MUTED,
      });

      // Icon + item name — lower half of card
      const iconX = panelX - EQ_CARD_W / 2 + EQ_ICON / 2 + 10;
      const contentY = y + 12;
      if (item && itemId) {
        const frameKey = itemFrames[itemId];
        if (frameKey && this.textures.exists(frameKey)) {
          this.add.image(iconX, contentY, frameKey).setDisplaySize(EQ_ICON, EQ_ICON);
        }
      }

      const nameX = panelX - EQ_CARD_W / 2 + EQ_ICON + 24;
      this.add.text(nameX, contentY, item ? item.name : "(empty)", {
        fontSize: FONT_BODY,
        fontFamily: "EnchantedLand",
        color: item ? RARITY_COLOR[item.rarity] ?? TXT_GOLD : TXT_LOCKED,
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
        .text(originX, GRID_START_Y + 30, "Inventory empty.", { fontSize: FONT_BODY, color: TXT_MUTED })
        .setOrigin(0.5);
      return;
    }

    const step = GRID_CELL + GRID_GAP;
    const gridW = GRID_COLS * step - GRID_GAP;
    const gridLeft = originX - gridW / 2 + GRID_CELL / 2;

    inv.forEach((itemId, i) => {
      const item: GearItem | undefined = items[itemId];
      if (!item) return;

      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = gridLeft + col * step;
      const cy = GRID_START_Y + row * step;

      const bg = this.add
        .rectangle(cx, cy, GRID_CELL, GRID_CELL, BG_MOVE_EQUIPPED, 0.9)
        .setStrokeStyle(1, BORDER_GOLD)
        .setInteractive({ useHandCursor: true });

      const frameKey = itemFrames[itemId];
      if (frameKey && this.textures.exists(frameKey)) {
        this.add.image(cx, cy - 6, frameKey).setDisplaySize(GRID_CELL - 16, GRID_CELL - 16);
      }

      // Rarity strip at bottom
      this.add.rectangle(
        cx,
        cy + GRID_CELL / 2 - 6,
        GRID_CELL - 4,
        8,
        parseInt((RARITY_COLOR[item.rarity] ?? TXT_GOLD).replace("#", ""), 16),
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
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.children.removeAll(true);
        this.create({ returnScene: this.returnScene });
      });
    });
  }
}
