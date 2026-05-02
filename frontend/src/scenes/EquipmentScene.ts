import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import {
  createModalFooter,
  TooltipManager,
  EquippedSlot,
  InventoryGrid,
} from "../ui";
import { GameState, getGearBonuses } from "../state";
import { SfxPlayer, Sfx } from "../audio";
import type { GearItem, GearSlot } from "../types/game";
import { BG, BORDER, TXT, RARITY_COLOR, STAT_COLOR, EQ_CARD } from "../constants";

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
  private inventory?: InventoryGrid;

  constructor() {
    super(Scene.Equipment);
  }

  create(data: EquipmentData) {
    this.returnScene = data.returnScene ?? Scene.TreeMap;
    this.inventory?.scroll?.destroy();
    this.inventory = undefined;

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

    this.buildEquippedSlots(colLeft, items);
    this.inventory = new InventoryGrid(
      this,
      colRight,
      GameState.hero.inventory ?? [],
      items,
      {
        onEquip: (itemId) => {
          GameState.equipItem(itemId);
          SfxPlayer.play(this, Sfx.Equip);
          this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        },
        onHover: (item) => this.showItemTooltip(item),
        onHoverEnd: () => this.tooltip.clear(),
      },
    );
  }

  private buildEquippedSlots(panelX: number, items: Record<string, GearItem>) {
    SLOTS.forEach((slot, i) => {
      const itemId = GameState.hero.equipment?.[slot];
      const item = itemId ? items[itemId] : undefined;
      const y = EQ_CARD.START_Y + i * (EQ_CARD.H + EQ_CARD.GAP);
      new EquippedSlot(this, panelX, y, slot, SLOT_LABELS[slot], item, itemId, {
        onUnequip: () => {
          GameState.unequipItem(slot);
          SfxPlayer.play(this, Sfx.Unequip);
          this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
          this.children.removeAll(true);
          this.create({ returnScene: this.returnScene });
        },
        onHover: () => item && this.showItemTooltip(item),
        onHoverEnd: () => this.tooltip.clear(),
      });
    });
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
}
