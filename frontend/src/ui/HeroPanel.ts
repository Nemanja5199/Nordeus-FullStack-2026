import Phaser from "phaser";
import type { GearItem, HeroState, MoveConfig } from "../types/game";
import { GameState, getGearBonuses } from "../state/gameState";
import { heroFrameFor, heroNameFor } from "../sprites/spriteFrames";
import { FONT } from "../constants";
import { BG, BORDER, TXT, BAR } from "../constants";

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
  onShop?: () => void;
}

export function createHeroPanel(scene: Phaser.Scene, opts: HeroPanelOptions): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => { container.add(obj); return obj; };

  const { x: panelX, y: panelY, width: w, height: h, hero, xpToNextLevel, moves, items, onManageMoves, onManageEquipment, onShop } = opts;
  const cx = panelX + w / 2;
  const pad = panelX + 16;
  const barW = w - 20;

  const gear = items ? getGearBonuses(hero.equipment ?? {}, items) : { attack: 0, defense: 0, magic: 0, maxHp: 0 };
  const effAtk = hero.attack + (gear.attack ?? 0);
  const effDef = hero.defense + (gear.defense ?? 0);
  const effMag = hero.magic + (gear.magic ?? 0);
  const effMaxHp = hero.maxHp + (gear.maxHp ?? 0);

  add(scene.add.rectangle(panelX, panelY, w, h, BG.PANEL, 0.88).setOrigin(0).setStrokeStyle(2, BORDER.GOLD));

  add(scene.add.text(cx, panelY + 26, `${heroNameFor(GameState.selectedClass)}  Lv.${hero.level}`, {
    fontSize: FONT.LG, fontFamily: "EnchantedLand", color: TXT.GOLD,
  }).setOrigin(0.5));

  const heroFrame = heroFrameFor(GameState.selectedClass);
  add(scene.add.image(cx, panelY + 96, heroFrame.key, heroFrame.frame).setScale(3.2).setOrigin(0.5));

  const stats = [
    { key: "stat_hp",  val: `${hero.currentHp ?? hero.maxHp}/${effMaxHp}`, color: TXT.GOLD_LIGHT },
    { key: "stat_atk", val: `${effAtk}`,  color: TXT.GOLD_LIGHT },
    { key: "stat_def", val: `${effDef}`,  color: TXT.GOLD_LIGHT },
    { key: "stat_mag", val: `${effMag}`,  color: TXT.GOLD_LIGHT },
    { key: "stat_mp",  val: "60",         color: TXT.MANA },
  ];
  const col1X = cx - 72;
  const col2X = cx + 36;
  stats.forEach((s, i) => {
    if (i < 4) {
      const sx = i % 2 === 0 ? col1X : col2X;
      const sy = panelY + 158 + Math.floor(i / 2) * 34;
      add(scene.add.image(sx, sy, s.key).setScale(0.68).setOrigin(0.5));
      add(scene.add.text(sx + 18, sy, s.val, { fontSize: FONT.BODY, color: s.color }).setOrigin(0, 0.5));
    } else {
      const sy = panelY + 226;
      add(scene.add.image(col1X, sy, s.key).setScale(0.68).setOrigin(0.5));
      add(scene.add.text(col1X + 18, sy, `${s.val} MP`, { fontSize: FONT.BODY, color: s.color }).setOrigin(0, 0.5));
    }
  });

  add(scene.add.text(cx, panelY + 252, `Gold: ${hero.gold ?? 0}`, {
    fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD,
  }).setOrigin(0.5));
  add(scene.add.text(cx, panelY + 270, `HP × ${hero.hpPotions ?? 0}   MP × ${hero.manaPotions ?? 0}`, {
    fontSize: FONT.SM, fontFamily: "EnchantedLand", color: TXT.GOLD_MID,
  }).setOrigin(0.5));

  const xpPct = Math.min(1, hero.xp / xpToNextLevel);
  add(scene.add.text(cx, panelY + 290, `XP  ${hero.xp} / ${xpToNextLevel}`, {
    fontSize: FONT.SM, color: TXT.GOLD_MID,
  }).setOrigin(0.5));
  add(scene.add.rectangle(panelX + 10, panelY + 306, barW, 11, BG.ROW_MID).setOrigin(0));
  add(scene.add.rectangle(panelX + 10, panelY + 306, barW * xpPct, 11, BAR.XP_FILL).setOrigin(0));

  add(scene.add.rectangle(cx, panelY + 330, barW, 1, BORDER.GOLD, 0.6).setOrigin(0.5));

  add(scene.add.text(cx, panelY + 346, "Equipped Moves", {
    fontSize: FONT.MD, fontFamily: "EnchantedLand", color: TXT.GOLD,
  }).setOrigin(0.5));

  hero.equippedMoves.forEach((moveId, i) => {
    const move = moves[moveId];
    if (!move) return;
    const rowY = panelY + 366 + i * 50;
    add(scene.add.rectangle(cx, rowY + 18, w - 16, 40, BG.ROW, 0.85).setOrigin(0.5).setStrokeStyle(1, BORDER.ROW));
    add(scene.add.text(pad, rowY + 18, move.name, { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_LIGHT }).setOrigin(0, 0.5));
  });

  if (onShop) {
    const shopBtnY = panelY + h - 114;
    const shopBg = add(scene.add.rectangle(cx, shopBtnY, w - 20, 38, BG.BTN, 0.9).setStrokeStyle(1, BORDER.GOLD).setInteractive({ useHandCursor: true }));
    const shopTxt = add(scene.add.text(cx, shopBtnY, "Shop", { fontSize: FONT.MD, fontFamily: "EnchantedLand", color: TXT.GOLD_MID }).setOrigin(0.5));
    shopBg.on("pointerover", () => { shopBg.setFillStyle(BG.BTN_HOVER); shopTxt.setColor(TXT.GOLD); });
    shopBg.on("pointerout", () => { shopBg.setFillStyle(BG.BTN); shopTxt.setColor(TXT.GOLD_MID); });
    shopBg.on("pointerdown", onShop);
  }

  if (onManageEquipment) {
    const eqBtnY = panelY + h - 68;
    const eqBg = add(scene.add.rectangle(cx, eqBtnY, w - 20, 38, BG.BTN, 0.9).setStrokeStyle(1, BORDER.GOLD).setInteractive({ useHandCursor: true }));
    const eqTxt = add(scene.add.text(cx, eqBtnY, "Equipment", { fontSize: FONT.MD, fontFamily: "EnchantedLand", color: TXT.GOLD_MID }).setOrigin(0.5));
    eqBg.on("pointerover", () => { eqBg.setFillStyle(BG.BTN_HOVER); eqTxt.setColor(TXT.GOLD); });
    eqBg.on("pointerout", () => { eqBg.setFillStyle(BG.BTN); eqTxt.setColor(TXT.GOLD_MID); });
    eqBg.on("pointerdown", onManageEquipment);
  }

  const btnY = panelY + h - 22;
  const hasPoints = (hero.skillPoints ?? 0) > 0;
  const btnBg = add(scene.add.rectangle(cx, btnY, w - 20, 38, BG.BTN, 0.9).setStrokeStyle(1, hasPoints ? BORDER.STAT_AVAIL : BORDER.GOLD).setInteractive({ useHandCursor: true }));
  const btnLabel = hasPoints ? `Manage Moves  ✦ ${hero.skillPoints}` : "Manage Moves";
  const btnTxt = add(scene.add.text(cx, btnY, btnLabel, {
    fontSize: FONT.MD, fontFamily: "EnchantedLand", color: hasPoints ? TXT.SKILL_POINTS : TXT.GOLD_MID,
  }).setOrigin(0.5));
  btnBg.on("pointerover", () => { btnBg.setFillStyle(BG.BTN_HOVER); btnTxt.setColor(TXT.GOLD); });
  btnBg.on("pointerout", () => { btnBg.setFillStyle(BG.BTN); btnTxt.setColor(hasPoints ? TXT.SKILL_POINTS : TXT.GOLD_MID); });
  btnBg.on("pointerdown", onManageMoves);

  return container;
}
