import Phaser from "phaser";
import { GameState, getGearBonuses } from "../utils/gameState";
import type { GearItem, GearSlot } from "../types/game";
import { createModalFooter } from "../ui/ModalFooter";
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

const CARD_W = 260;
const CARD_H = 60;
const CARD_GAP = 10;
const START_Y = 200;

interface EquipmentData {
  returnScene: string;
}

export class EquipmentScene extends Phaser.Scene {
  private returnScene!: string;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super("EquipmentScene");
  }

  create(data: EquipmentData) {
    this.returnScene = data.returnScene ?? "TreeMapScene";

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "EQUIPMENT", {
        fontSize: "36px",
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const colLeft = width * 0.28;
    const colRight = width * 0.72;

    this.add
      .text(colLeft, 90, "EQUIPPED", { fontSize: "16px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID })
      .setOrigin(0.5);
    this.add
      .text(colRight, 90, "INVENTORY", { fontSize: "16px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID })
      .setOrigin(0.5);

    // Divider
    this.add.rectangle(width / 2, (90 + height - 80) / 2, 1, height - 170, BORDER_GOLD, 0.25);

    // Gear stat summary
    const bonuses = getGearBonuses(GameState.hero.equipment ?? {});
    const bonusParts: string[] = [];
    if (bonuses.attack) bonusParts.push(`ATK +${bonuses.attack}`);
    if (bonuses.defense) bonusParts.push(`DEF +${bonuses.defense}`);
    if (bonuses.magic) bonusParts.push(`MAG +${bonuses.magic}`);
    if (bonuses.maxHp) bonusParts.push(`HP +${bonuses.maxHp}`);
    this.add
      .text(colLeft, 108, bonusParts.length ? `Bonuses: ${bonusParts.join("  ")}` : "No gear equipped", {
        fontSize: "13px",
        color: bonusParts.length ? TXT_GOLD_LIGHT : TXT_MUTED,
      })
      .setOrigin(0.5);

    this.infoText = createModalFooter(this, {
      hint: "Click an inventory item to equip it. Click an equipped slot to unequip.",
      onClose: () => this.scene.stop(),
    });

    this.buildEquippedSlots(colLeft);
    this.buildInventory(colRight);
  }

  private buildEquippedSlots(panelX: number) {
    SLOTS.forEach((slot, i) => {
      const item = GameState.hero.equipment?.[slot];
      const y = START_Y + i * (CARD_H + CARD_GAP);
      this.drawCard(panelX, y, slot, item, true);
    });
  }

  private buildInventory(panelX: number) {
    const inv = GameState.hero.inventory ?? [];
    if (inv.length === 0) {
      this.add
        .text(panelX, START_Y + 30, "No items in inventory.", { fontSize: "16px", color: TXT_MUTED })
        .setOrigin(0.5);
      return;
    }
    inv.forEach((item, i) => {
      const y = START_Y + i * (CARD_H + CARD_GAP);
      this.drawCard(panelX, y, null, item, false);
    });
  }

  private drawCard(
    panelX: number,
    y: number,
    slot: GearSlot | null,
    item: GearItem | undefined,
    isSlot: boolean,
  ) {
    const hasItem = !!item;
    const bg = this.add
      .rectangle(panelX, y, CARD_W, CARD_H, hasItem ? BG_MOVE_EQUIPPED : BG_MOVE_CARD, 0.92)
      .setStrokeStyle(1, hasItem ? BORDER_GOLD : BORDER_LOCKED)
      .setInteractive({ useHandCursor: true });

    // Slot label or item name
    if (isSlot) {
      this.add.text(panelX - CARD_W / 2 + 12, y - 20, SLOT_LABELS[slot!], {
        fontSize: "11px",
        color: TXT_MUTED,
      });
    }
    this.add.text(
      panelX - CARD_W / 2 + 12,
      isSlot ? y - 2 : y - 12,
      item ? item.name : "(empty)",
      { fontSize: "17px", fontFamily: "EnchantedLand", color: item ? RARITY_COLOR[item.rarity] ?? TXT_GOLD : TXT_LOCKED },
    );
    if (item) {
      this.add.text(panelX - CARD_W / 2 + 12, y + 16, item.description, {
        fontSize: "11px",
        color: TXT_MUTED,
      });
    }

    bg.on("pointerover", () => {
      bg.setAlpha(0.7);
      if (item) this.infoText.setText(item.description);
    });
    bg.on("pointerout", () => {
      bg.setAlpha(1);
      this.infoText.setText(
        "Click an inventory item to equip it. Click an equipped slot to unequip.",
      );
    });

    if (isSlot && item) {
      bg.on("pointerdown", () => {
        GameState.unequipItem(slot!);
        this.children.removeAll(true);
        this.create({ returnScene: this.returnScene });
      });
      bg.setStrokeStyle(1, BORDER_GOLD_BRIGHT);
    } else if (!isSlot && item) {
      bg.on("pointerdown", () => {
        GameState.equipItem(item);
        this.children.removeAll(true);
        this.create({ returnScene: this.returnScene });
      });
    }
  }
}
