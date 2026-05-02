import Phaser from "phaser";
import { Scene } from "./sceneKeys";
import { MetaProgress } from "../state/metaProgress";
import type { MetaUpgrade } from "../types/game";
import { GameState } from "../state/gameState";
import { Audio, TrackGroup } from "../audio/audio";
import { SfxPlayer, Sfx } from "../audio/sfx";
import { api } from "../services/api";
import { FONT_TITLE, FONT_LG, FONT_MD, FONT_BODY } from "../ui/typography";
import {
  BG_DARKEST,
  BG_UPGRADE_AVAILABLE,
  BG_UPGRADE_PURCHASED,
  BG_UPGRADE_LOCKED,
  BG_BTN_SUCCESS,
  BG_BTN_NEUTRAL,
  BORDER_LOCKED,
  BORDER_SHARD,
  BORDER_UPGRADE_OWNED,
  BG_BTN_BUY,
  BG_BTN_BUY_HOVER,
  TXT_GOLD,
  TXT_GOLD_MID,
  TXT_GOLD_LIGHT,
  TXT_MUTED,
  TXT_LOCKED,
  TXT_SHARD,
  TXT_STROKE_HEADER,
  TXT_STAT_ATTACK,
  TXT_STAT_MAGIC,
  TXT_STAT_HP,
  TXT_STAT_DEFENSE,
} from "../ui/colors";
import { UPGRADE_CARD_W as CARD_W, UPGRADE_CARD_H as CARD_H, UPGRADE_CARD_GAP as CARD_GAP } from "../ui/layout";
import { createButton, BTN_MD } from "../ui/Button";

const CATEGORIES = [
  { key: "vitality", label: "VITALITY", color: TXT_STAT_HP },
  { key: "strength", label: "STRENGTH", color: TXT_STAT_ATTACK },
  { key: "arcane",   label: "ARCANE",   color: TXT_STAT_MAGIC },
  { key: "guard",    label: "GUARD",    color: TXT_STAT_DEFENSE },
] as const;

const SPECIALS = ["scholar", "hoarder"];

export class UpgradesScene extends Phaser.Scene {
  private fightAgainPending = false;

  constructor() {
    super(Scene.Upgrades);
  }

  create() {
    this.fightAgainPending = false;

    const { width, height } = this.scale;
    Audio.play(this, TrackGroup.Death);
    this.add.rectangle(0, 0, width, height, BG_DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "UPGRADES", {
        fontSize: FONT_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 72, `◆ ${MetaProgress.shards} Shards available`, {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_SHARD,
      })
      .setOrigin(0.5);

    const upgradeDefs = GameState.runConfig?.upgrades ?? [];

    // 4-column × 3-tier upgrade grid
    const totalGridW = 4 * CARD_W + 3 * CARD_GAP;
    const gridLeft = (width - totalGridW) / 2 + CARD_W / 2;
    const gridTop = 120;

    CATEGORIES.forEach(({ key, label, color }, col) => {
      const cx = gridLeft + col * (CARD_W + CARD_GAP);

      this.add
        .text(cx, gridTop, label, {
          fontSize: FONT_MD,
          fontFamily: "EnchantedLand",
          color,
        })
        .setOrigin(0.5);

      const tiers = upgradeDefs.filter((u) => u.id.startsWith(key));
      tiers.forEach((upgrade, row) => {
        const cy = gridTop + 32 + row * (CARD_H + CARD_GAP) + CARD_H / 2;
        this.drawCard(cx, cy, upgrade, color);
      });
    });

    const specialY = gridTop + 32 + 3 * (CARD_H + CARD_GAP) + CARD_H / 2 + 24;
    this.add
      .text(width / 2, specialY - CARD_H / 2 - 8, "SPECIAL", {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    const specialSpacing = CARD_W + CARD_GAP;
    SPECIALS.forEach((id, i) => {
      const upgrade = upgradeDefs.find((u) => u.id === id)!;
      const cx = width / 2 + (i - 0.5) * specialSpacing;
      this.drawCard(cx, specialY, upgrade, TXT_GOLD_MID);
    });

    const canFightAgain = !!GameState.runConfig;
    createButton(this, width / 2 - 140, height - 40, {
      ...BTN_MD,
      label: "FIGHT AGAIN",
      color: canFightAgain ? BG_BTN_SUCCESS : 0x2a2a2a,
      onClick: () => { if (canFightAgain) this.fightAgain(); },
    });
    createButton(this, width / 2 + 140, height - 40, {
      ...BTN_MD,
      label: "MAIN MENU",
      color: BG_BTN_NEUTRAL,
      onClick: () => this.scene.start(Scene.MainMenu),
    });
  }

  private async fightAgain() {
    if (this.fightAgainPending) return;
    this.fightAgainPending = true;
    try {
      const newConfig = await api.getRunConfig();
      GameState.startFreshRun(newConfig);
      this.scene.start(Scene.TreeMap);
    } catch (err) {
      console.warn("[UpgradesScene] fightAgain failed:", err);
      this.fightAgainPending = false;
    }
  }

  private drawCard(cx: number, cy: number, upgrade: MetaUpgrade, accentColor: string) {
    const purchased = MetaProgress.purchased.has(upgrade.id);
    const available = MetaProgress.canBuy(upgrade.id);
    const locked = !purchased && !available && !!upgrade.requires && !MetaProgress.purchased.has(upgrade.requires);
    const affordable = available; // canBuy already checks shards

    const bgColor = purchased ? BG_UPGRADE_PURCHASED : available ? BG_UPGRADE_AVAILABLE : BG_UPGRADE_LOCKED;
    const borderColor = purchased ? BORDER_UPGRADE_OWNED : available ? BORDER_SHARD : BORDER_LOCKED;

    const bg = this.add
      .rectangle(cx, cy, CARD_W, CARD_H, bgColor, 0.95)
      .setStrokeStyle(purchased ? 2 : 1, borderColor);

    if (available) bg.setInteractive({ useHandCursor: true });

    this.add
      .text(cx, cy - 52, upgrade.name, {
        fontSize: FONT_MD,
        fontFamily: "EnchantedLand",
        color: purchased ? TXT_STAT_HP : available ? accentColor : TXT_LOCKED,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 18, upgrade.description.replace("Start each run with ", ""), {
        fontSize: FONT_BODY,
        color: purchased ? TXT_MUTED : available ? TXT_GOLD_LIGHT : TXT_LOCKED,
        wordWrap: { width: CARD_W - 20 },
        align: "center",
      })
      .setOrigin(0.5);

    if (purchased) {
      this.add.text(cx, cy + 28, "✓ Purchased", { fontSize: FONT_BODY, color: TXT_STAT_HP }).setOrigin(0.5);
    } else if (locked) {
      this.add.text(cx, cy + 28, "🔒 Locked", { fontSize: FONT_BODY, color: TXT_LOCKED }).setOrigin(0.5);
    } else {
      const costColor = MetaProgress.shards >= upgrade.cost ? TXT_SHARD : TXT_STAT_ATTACK;
      this.add
        .text(cx, cy + 28, `◆ ${upgrade.cost} Shards`, {
          fontSize: FONT_BODY,
          fontFamily: "EnchantedLand",
          color: costColor,
        })
        .setOrigin(0.5);
    }

    if (affordable) {
      const btn = this.add
        .rectangle(cx, cy + 56, CARD_W - 28, 32, BG_BTN_BUY, 0.95)
        .setStrokeStyle(1, BORDER_SHARD)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(cx, cy + 56, "BUY", { fontSize: FONT_BODY, fontFamily: "EnchantedLand", color: TXT_SHARD })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(BG_BTN_BUY_HOVER));
      btn.on("pointerout", () => btn.setFillStyle(BG_BTN_BUY));
      btn.on("pointerdown", () => {
        MetaProgress.buy(upgrade.id);
        SfxPlayer.play(this, Sfx.ShardPickup);
        this.scene.restart();
      });
    }
  }
}
