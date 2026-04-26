import Phaser from "phaser";
import type { GearItem, HeroState, MoveConfig } from "../types/game";
import { getGearBonuses } from "../utils/gameState";
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
  BAR_XP_FILL,
  TXT_SKILL_POINTS,
  TXT_MANA,
} from "./colors";

export interface HeroPanelOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  hero: HeroState;
  xpToNextLevel: number;
  moves: Record<string, MoveConfig>;
  items?: Record<string, GearItem>;
  onManageMoves: () => void;
  onManageEquipment?: () => void;
}

export function createHeroPanel(scene: Phaser.Scene, opts: HeroPanelOptions): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => { container.add(obj); return obj; };

  const { x: panelX, y: panelY, width: w, height: h, hero, xpToNextLevel, moves, items, onManageMoves, onManageEquipment } = opts;
  const cx = panelX + w / 2;
  const pad = panelX + 16;
  const barW = w - 20;

  const gear = items ? getGearBonuses(hero.equipment ?? {}, items) : { attack: 0, defense: 0, magic: 0, maxHp: 0 };
  const effAtk = hero.attack + (gear.attack ?? 0);
  const effDef = hero.defense + (gear.defense ?? 0);
  const effMag = hero.magic + (gear.magic ?? 0);
  const effMaxHp = hero.maxHp + (gear.maxHp ?? 0);

  // Background
  add(scene.add.rectangle(panelX, panelY, w, h, BG_PANEL, 0.88).setOrigin(0).setStrokeStyle(2, BORDER_GOLD));

  // Title
  add(scene.add.text(cx, panelY + 26, `Knight  Lv.${hero.level}`, {
    fontSize: FONT_LG, fontFamily: "EnchantedLand", color: TXT_GOLD,
  }).setOrigin(0.5));

  // Hero sprite
  add(scene.add.image(cx, panelY + 96, HERO_FRAME.key, HERO_FRAME.frame).setScale(3.2).setOrigin(0.5));

  // Stats 2×2 grid + MP row
  const stats = [
    { key: "stat_hp",  val: `${hero.currentHp ?? hero.maxHp}/${effMaxHp}`, color: TXT_GOLD_LIGHT },
    { key: "stat_atk", val: `${effAtk}`,  color: TXT_GOLD_LIGHT },
    { key: "stat_def", val: `${effDef}`,  color: TXT_GOLD_LIGHT },
    { key: "stat_mag", val: `${effMag}`,  color: TXT_GOLD_LIGHT },
    { key: "stat_mp",  val: "60",         color: TXT_MANA },
  ];
  const col1X = cx - 72;
  const col2X = cx + 36;
  stats.forEach((s, i) => {
    if (i < 4) {
      const sx = i % 2 === 0 ? col1X : col2X;
      const sy = panelY + 158 + Math.floor(i / 2) * 34;
      add(scene.add.image(sx, sy, s.key).setScale(0.68).setOrigin(0.5));
      add(scene.add.text(sx + 18, sy, s.val, { fontSize: FONT_BODY, color: s.color }).setOrigin(0, 0.5));
    } else {
      // MP centered on its own row
      const sy = panelY + 226;
      add(scene.add.image(col1X, sy, s.key).setScale(0.68).setOrigin(0.5));
      add(scene.add.text(col1X + 18, sy, `${s.val} MP`, { fontSize: FONT_BODY, color: s.color }).setOrigin(0, 0.5));
    }
  });

  // Gold
  add(scene.add.text(cx, panelY + 252, `Gold: ${hero.gold ?? 0}`, {
    fontSize: FONT_BODY, fontFamily: "EnchantedLand", color: TXT_GOLD,
  }).setOrigin(0.5));

  // XP bar
  const xpPct = Math.min(1, hero.xp / xpToNextLevel);
  add(scene.add.text(cx, panelY + 272, `XP  ${hero.xp} / ${xpToNextLevel}`, {
    fontSize: FONT_SM, color: TXT_GOLD_MID,
  }).setOrigin(0.5));
  add(scene.add.rectangle(panelX + 10, panelY + 288, barW, 11, BG_ROW_MID).setOrigin(0));
  add(scene.add.rectangle(panelX + 10, panelY + 288, barW * xpPct, 11, BAR_XP_FILL).setOrigin(0));

  // Divider
  add(scene.add.rectangle(cx, panelY + 312, barW, 1, BORDER_GOLD, 0.6).setOrigin(0.5));

  // Equipped moves header
  add(scene.add.text(cx, panelY + 328, "Equipped Moves", {
    fontSize: FONT_MD, fontFamily: "EnchantedLand", color: TXT_GOLD,
  }).setOrigin(0.5));

  hero.equippedMoves.forEach((moveId, i) => {
    const move = moves[moveId];
    if (!move) return;
    const rowY = panelY + 348 + i * 50;
    add(scene.add.rectangle(cx, rowY + 18, w - 16, 40, BG_ROW, 0.85).setOrigin(0.5).setStrokeStyle(1, BORDER_ROW));
    add(scene.add.text(pad, rowY + 18, move.name, { fontSize: FONT_BODY, fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT }).setOrigin(0, 0.5));
  });

  // Equipment button
  if (onManageEquipment) {
    const eqBtnY = panelY + h - 68;
    const eqBg = add(scene.add.rectangle(cx, eqBtnY, w - 20, 38, BG_BTN, 0.9).setStrokeStyle(1, BORDER_GOLD).setInteractive({ useHandCursor: true }));
    const eqTxt = add(scene.add.text(cx, eqBtnY, "Equipment", { fontSize: FONT_MD, fontFamily: "EnchantedLand", color: TXT_GOLD_MID }).setOrigin(0.5));
    eqBg.on("pointerover", () => { eqBg.setFillStyle(BG_BTN_HOVER); eqTxt.setColor(TXT_GOLD); });
    eqBg.on("pointerout", () => { eqBg.setFillStyle(BG_BTN); eqTxt.setColor(TXT_GOLD_MID); });
    eqBg.on("pointerdown", onManageEquipment);
  }

  // Manage Moves button
  const btnY = panelY + h - 22;
  const hasPoints = (hero.skillPoints ?? 0) > 0;
  const btnBg = add(scene.add.rectangle(cx, btnY, w - 20, 38, BG_BTN, 0.9).setStrokeStyle(1, hasPoints ? BORDER_STAT_AVAIL : BORDER_GOLD).setInteractive({ useHandCursor: true }));
  const btnLabel = hasPoints ? `Manage Moves  ✦ ${hero.skillPoints}` : "Manage Moves";
  const btnTxt = add(scene.add.text(cx, btnY, btnLabel, {
    fontSize: FONT_MD, fontFamily: "EnchantedLand", color: hasPoints ? TXT_SKILL_POINTS : TXT_GOLD_MID,
  }).setOrigin(0.5));
  btnBg.on("pointerover", () => { btnBg.setFillStyle(BG_BTN_HOVER); btnTxt.setColor(TXT_GOLD); });
  btnBg.on("pointerout", () => { btnBg.setFillStyle(BG_BTN); btnTxt.setColor(hasPoints ? TXT_SKILL_POINTS : TXT_GOLD_MID); });
  btnBg.on("pointerdown", onManageMoves);

  return container;
}
