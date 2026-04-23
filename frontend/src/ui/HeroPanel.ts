import Phaser from "phaser";
import type { HeroState, MoveConfig } from "../types/game";
import { HERO_FRAME } from "../utils/spriteFrames";
import { FONT_LG, FONT_MD, FONT_BODY, FONT_SM } from "./typography";
import {
  BG_PANEL,
  BG_ROW,
  BG_ROW_MID,
  BG_BTN,
  BG_BTN_HOVER,
  BORDER_GOLD,
  BORDER_ROW,
  BORDER_STAT_AVAIL,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_MID,
  TXT_MUTED,
  BAR_XP_FILL,
  TXT_SKILL_POINTS,
} from "./colors";

export interface HeroPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  hero: HeroState;
  xpToNextLevel: number;
  moves: Record<string, MoveConfig>;
  onManageMoves: () => void;
  onManageEquipment?: () => void;
}

export function createHeroPanel(scene: Phaser.Scene, opts: HeroPanelOptions): void {
  const {
    x: panelX,
    y: panelY,
    width: w,
    height: h,
    hero,
    xpToNextLevel,
    moves,
    onManageMoves,
    onManageEquipment,
  } = opts;
  const cx = panelX + w / 2;
  const pad = panelX + 16;
  const barW = w - 20;

  // Background
  scene.add
    .rectangle(panelX, panelY, w, h, BG_PANEL, 0.88)
    .setOrigin(0)
    .setStrokeStyle(2, BORDER_GOLD);

  // Title
  scene.add
    .text(cx, panelY + 26, `Knight  Lv.${hero.level}`, {
      fontSize: FONT_LG,
      fontFamily: "EnchantedLand",
      color: TXT_GOLD,
    })
    .setOrigin(0.5);

  // Hero sprite
  scene.add
    .image(cx, panelY + 96, HERO_FRAME.key, HERO_FRAME.frame)
    .setScale(3.2)
    .setOrigin(0.5);

  // Stats 2×2 grid
  const stats = [
    { key: "stat_hp", val: `${hero.currentHp ?? hero.maxHp}/${hero.maxHp}` },
    { key: "stat_atk", val: hero.attack },
    { key: "stat_def", val: hero.defense },
    { key: "stat_mag", val: hero.magic },
  ];
  const col1X = cx - 72;
  const col2X = cx + 36;
  stats.forEach((s, i) => {
    const sx = i % 2 === 0 ? col1X : col2X;
    const sy = panelY + 158 + Math.floor(i / 2) * 34;
    scene.add.image(sx, sy, s.key).setScale(0.68).setOrigin(0.5);
    scene.add
      .text(sx + 18, sy, `${s.val}`, { fontSize: FONT_BODY, color: TXT_GOLD_LIGHT })
      .setOrigin(0, 0.5);
  });

  // Gold
  scene.add
    .text(cx, panelY + 230, `Gold: ${hero.gold ?? 0}`, {
      fontSize: FONT_BODY,
      fontFamily: "EnchantedLand",
      color: TXT_GOLD,
    })
    .setOrigin(0.5);

  // XP bar
  const xpPct = Math.min(1, hero.xp / xpToNextLevel);
  scene.add
    .text(cx, panelY + 254, `XP  ${hero.xp} / ${xpToNextLevel}`, {
      fontSize: FONT_SM,
      color: TXT_GOLD_MID,
    })
    .setOrigin(0.5);
  scene.add.rectangle(panelX + 10, panelY + 270, barW, 11, BG_ROW_MID).setOrigin(0);
  scene.add.rectangle(panelX + 10, panelY + 270, barW * xpPct, 11, BAR_XP_FILL).setOrigin(0);

  // Divider
  scene.add.rectangle(cx, panelY + 294, barW, 1, BORDER_GOLD, 0.6).setOrigin(0.5);

  // Equipped moves header
  scene.add
    .text(cx, panelY + 312, "Equipped Moves", {
      fontSize: FONT_MD,
      fontFamily: "EnchantedLand",
      color: TXT_GOLD,
    })
    .setOrigin(0.5);

  hero.equippedMoves.forEach((moveId, i) => {
    const move = moves[moveId];
    if (!move) return;
    const rowY = panelY + 332 + i * 56;

    scene.add
      .rectangle(cx, rowY + 18, w - 16, 44, BG_ROW, 0.85)
      .setOrigin(0.5)
      .setStrokeStyle(1, BORDER_ROW);

    scene.add.text(pad, rowY + 6, move.name, {
      fontSize: FONT_BODY,
      fontFamily: "EnchantedLand",
      color: TXT_GOLD_LIGHT,
    });
    scene.add.text(
      pad,
      rowY + 26,
      `[${move.moveType}]  ${move.description.slice(0, 20)}${move.description.length > 20 ? "…" : ""}`,
      { fontSize: FONT_SM, color: TXT_MUTED },
    );
  });

  // Equipment button
  if (onManageEquipment) {
    const eqBtnY = panelY + h - 68;
    const eqBg = scene.add
      .rectangle(cx, eqBtnY, w - 20, 38, BG_BTN, 0.9)
      .setStrokeStyle(1, BORDER_GOLD)
      .setInteractive({ useHandCursor: true });
    const eqTxt = scene.add
      .text(cx, eqBtnY, "Equipment", { fontSize: FONT_MD, fontFamily: "EnchantedLand", color: TXT_GOLD_MID })
      .setOrigin(0.5);
    eqBg.on("pointerover", () => { eqBg.setFillStyle(BG_BTN_HOVER); eqTxt.setColor(TXT_GOLD); });
    eqBg.on("pointerout", () => { eqBg.setFillStyle(BG_BTN); eqTxt.setColor(TXT_GOLD_MID); });
    eqBg.on("pointerdown", onManageEquipment);
  }

  // Manage Moves button
  const btnY = panelY + h - 22;
  const hasPoints = (hero.skillPoints ?? 0) > 0;
  const btnBg = scene.add
    .rectangle(cx, btnY, w - 20, 38, BG_BTN, 0.9)
    .setStrokeStyle(1, hasPoints ? BORDER_STAT_AVAIL : BORDER_GOLD)
    .setInteractive({ useHandCursor: true });
  const btnLabel = hasPoints ? `Manage Moves  ✦ ${hero.skillPoints}` : "Manage Moves";
  const btnTxt = scene.add
    .text(cx, btnY, btnLabel, {
      fontSize: FONT_MD,
      fontFamily: "EnchantedLand",
      color: hasPoints ? TXT_SKILL_POINTS : TXT_GOLD_MID,
    })
    .setOrigin(0.5);

  btnBg.on("pointerover", () => {
    btnBg.setFillStyle(BG_BTN_HOVER);
    btnTxt.setColor(TXT_GOLD);
  });
  btnBg.on("pointerout", () => {
    btnBg.setFillStyle(BG_BTN);
    btnTxt.setColor(hasPoints ? TXT_SKILL_POINTS : TXT_GOLD_MID);
  });
  btnBg.on("pointerdown", onManageMoves);
}
