import Phaser from "phaser";
import type { MonsterConfig } from "../types/game";
import { MONSTER_FRAMES } from "../sprites/spriteFrames";
import { FONT } from "../constants";
import { BG, BORDER, BAR, TXT } from "../constants";

export type NodeState = "defeated" | "next" | "locked";

export interface MonsterNodeOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  monster: MonsterConfig;
  state: NodeState;
  onFight: () => void;
}

export function createMonsterNode(scene: Phaser.Scene, opts: MonsterNodeOptions): void {
  const { x, y, width: w, height: h, monster: m, state, onFight } = opts;

  const isDefeated = state === "defeated";
  const isNext = state === "next";
  const isLocked = state === "locked";

  const fillColor = isDefeated ? BG.NODE_DEFEATED : isNext ? BG.NODE_ACTIVE : BG.NODE_LOCKED;
  const strokeColor = isDefeated ? BORDER.DEFEATED : isNext ? BORDER.GOLD_BRIGHT : BORDER.LOCKED;

  const node = scene.add
    .rectangle(x, y, w, h, fillColor, 0.92)
    .setStrokeStyle(isNext ? 3 : 2, strokeColor);

  if (!isLocked) {
    node.setInteractive({ useHandCursor: true });
    node.on("pointerover", () => node.setAlpha(0.75));
    node.on("pointerout", () => node.setAlpha(1));
    node.on("pointerdown", onFight);
  }

  const nameColor = isDefeated ? TXT.DEFEATED : isNext ? TXT.GOLD : TXT.LOCKED_NAME;
  scene.add
    .text(x, y - h * 0.42, m.name, {
      fontSize: FONT.MD,
      fontFamily: "EnchantedLand",
      color: nameColor,
    })
    .setOrigin(0.5);

  const mFrame = MONSTER_FRAMES[m.id];
  if (mFrame) {
    scene.add
      .image(x, y - h * 0.1, mFrame.key, mFrame.frame)
      .setScale(3)
      .setOrigin(0.5)
      .setAlpha(isDefeated ? 0.4 : isLocked ? 0.3 : 1);
  }

  // Decorative HP bar — always full, doesn't reflect current HP.
  const hpBarW = w - 20;
  scene.add.rectangle(x, y + h * 0.28, hpBarW, 8, BG.ROW_MID, 0.9).setOrigin(0.5);
  scene.add
    .image(x - hpBarW / 2 - 8, y + h * 0.28, "stat_hp")
    .setScale(0.38)
    .setAlpha(isLocked ? 0.3 : 0.9);
  scene.add.rectangle(x - hpBarW / 2, y + h * 0.28, hpBarW, 8, BAR.HP_FILL).setOrigin(0, 0.5);

  scene.add
    .text(x, y + h * 0.37, `ATK ${m.stats.attack}   DEF ${m.stats.defense}`, {
      fontSize: FONT.SM,
      color: isLocked ? "#3a2818" : "#a09060",
      align: "center",
    })
    .setOrigin(0.5);

  const statusLabel = isDefeated ? "Defeated" : isNext ? "Fight!" : "Locked";
  const statusColor = isDefeated ? TXT.DEFEATED : isNext ? TXT.GOLD : TXT.LOCKED;
  scene.add
    .text(x, y + h * 0.46, statusLabel, {
      fontSize: FONT.MD,
      fontFamily: "EnchantedLand",
      color: statusColor,
    })
    .setOrigin(0.5);
}
