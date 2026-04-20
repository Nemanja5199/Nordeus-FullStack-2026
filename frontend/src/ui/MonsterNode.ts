import Phaser from "phaser";
import type { MonsterConfig } from "../types/game";
import { MONSTER_FRAMES } from "../utils/spriteFrames";
import {
    BG_NODE_DEFEATED, BG_NODE_ACTIVE, BG_NODE_LOCKED,
    BORDER_DEFEATED, BORDER_GOLD_BRIGHT, BORDER_LOCKED,
    BAR_HP_FILL, BG_ROW_MID,
    TXT_GOLD, TXT_DEFEATED, TXT_LOCKED, TXT_LOCKED_NAME,
} from "./colors";

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
    const isNext     = state === "next";
    const isLocked   = state === "locked";

    const fillColor   = isDefeated ? BG_NODE_DEFEATED : isNext ? BG_NODE_ACTIVE : BG_NODE_LOCKED;
    const strokeColor = isDefeated ? BORDER_DEFEATED  : isNext ? BORDER_GOLD_BRIGHT : BORDER_LOCKED;

    const node = scene.add.rectangle(x, y, w, h, fillColor, 0.92)
        .setStrokeStyle(isNext ? 3 : 2, strokeColor);

    if (!isLocked) {
        node.setInteractive({ useHandCursor: true });
        node.on("pointerover", () => node.setAlpha(0.75));
        node.on("pointerout",  () => node.setAlpha(1));
        node.on("pointerdown", onFight);
    }

    // Name
    const nameColor = isDefeated ? TXT_DEFEATED : isNext ? TXT_GOLD : TXT_LOCKED_NAME;
    scene.add.text(x, y - h * 0.42, m.name, {
        fontSize: "18px", fontFamily: "EnchantedLand", color: nameColor,
    }).setOrigin(0.5);

    // Monster sprite
    const mFrame = MONSTER_FRAMES[m.id];
    if (mFrame) {
        scene.add.image(x, y - h * 0.1, mFrame.key, mFrame.frame)
            .setScale(3).setOrigin(0.5)
            .setAlpha(isDefeated ? 0.4 : isLocked ? 0.3 : 1);
    }

    // HP bar (decorative — shows monster has HP, not current value)
    const hpBarW = w - 20;
    scene.add.rectangle(x, y + h * 0.28, hpBarW, 8, BG_ROW_MID, 0.9).setOrigin(0.5);
    scene.add.image(x - hpBarW / 2 - 8, y + h * 0.28, "stat_hp")
        .setScale(0.38).setAlpha(isLocked ? 0.3 : 0.9);
    scene.add.rectangle(x - hpBarW / 2, y + h * 0.28, hpBarW, 8, BAR_HP_FILL).setOrigin(0, 0.5);

    // Stats
    scene.add.text(x, y + h * 0.37, `ATK ${m.stats.attack}   DEF ${m.stats.defense}`, {
        fontSize: "14px", color: isLocked ? "#3a2818" : "#a09060", align: "center",
    }).setOrigin(0.5);

    // Status label
    const statusLabel = isDefeated ? "Defeated" : isNext ? "Fight!" : "Locked";
    const statusColor = isDefeated ? TXT_DEFEATED : isNext ? TXT_GOLD : TXT_LOCKED;
    scene.add.text(x, y + h * 0.46, statusLabel, {
        fontSize: "17px", fontFamily: "EnchantedLand", color: statusColor,
    }).setOrigin(0.5);
}
