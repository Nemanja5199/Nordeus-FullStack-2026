import Phaser from "phaser";
import { Scene, FONT, UPGRADE_CARD } from "../constants";
import { MetaProgress, GameState } from "../state";
import type { MetaUpgrade } from "../types/game";
import { Audio, TrackGroup, SfxPlayer, Sfx } from "../audio";
import { api } from "../services/api";
import { createButton, BTN_MD, UpgradeCard } from "../ui";
import { BG, TXT } from "../constants";

const CATEGORIES = [
  { key: "vitality", label: "VITALITY", color: TXT.STAT_HP },
  { key: "strength", label: "STRENGTH", color: TXT.STAT_ATTACK },
  { key: "arcane",   label: "ARCANE",   color: TXT.STAT_MAGIC },
  { key: "guard",    label: "GUARD",    color: TXT.STAT_DEFENSE },
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
    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "UPGRADES", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 72, `◆ ${MetaProgress.shards} Shards available`, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.SHARD,
      })
      .setOrigin(0.5);

    const upgradeDefs = GameState.runConfig?.upgrades ?? [];

    // 4-column × 3-tier upgrade grid
    const totalGridW = 4 * UPGRADE_CARD.W + 3 * UPGRADE_CARD.GAP;
    const gridLeft = (width - totalGridW) / 2 + UPGRADE_CARD.W / 2;
    const gridTop = 120;

    CATEGORIES.forEach(({ key, label, color }, col) => {
      const cx = gridLeft + col * (UPGRADE_CARD.W + UPGRADE_CARD.GAP);

      this.add
        .text(cx, gridTop, label, {
          fontSize: FONT.MD,
          fontFamily: "EnchantedLand",
          color,
        })
        .setOrigin(0.5);

      const tiers = upgradeDefs.filter((u) => u.id.startsWith(key));
      tiers.forEach((upgrade, row) => {
        const cy = gridTop + 32 + row * (UPGRADE_CARD.H + UPGRADE_CARD.GAP) + UPGRADE_CARD.H / 2;
        this.drawCard(cx, cy, upgrade, color);
      });
    });

    const specialY = gridTop + 32 + 3 * (UPGRADE_CARD.H + UPGRADE_CARD.GAP) + UPGRADE_CARD.H / 2 + 24;
    this.add
      .text(width / 2, specialY - UPGRADE_CARD.H / 2 - 8, "SPECIAL", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);

    const specialSpacing = UPGRADE_CARD.W + UPGRADE_CARD.GAP;
    SPECIALS.forEach((id, i) => {
      const upgrade = upgradeDefs.find((u) => u.id === id)!;
      const cx = width / 2 + (i - 0.5) * specialSpacing;
      this.drawCard(cx, specialY, upgrade, TXT.GOLD_MID);
    });

    const canFightAgain = !!GameState.runConfig;
    createButton(this, width / 2 - 140, height - 40, {
      ...BTN_MD,
      label: "FIGHT AGAIN",
      color: canFightAgain ? BG.BTN_SUCCESS : 0x2a2a2a,
      onClick: () => { if (canFightAgain) this.fightAgain(); },
    });
    createButton(this, width / 2 + 140, height - 40, {
      ...BTN_MD,
      label: "MAIN MENU",
      color: BG.BTN_NEUTRAL,
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

    new UpgradeCard(
      this,
      cx,
      cy,
      upgrade,
      accentColor,
      { purchased, available, locked, affordable: available, shardsHeld: MetaProgress.shards },
      {
        onBuy: () => {
          MetaProgress.buy(upgrade.id);
          SfxPlayer.play(this, Sfx.ShardPickup);
          this.scene.restart();
        },
      },
    );
  }
}