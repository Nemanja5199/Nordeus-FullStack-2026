import Phaser from "phaser";
import type { HeroState, MoveConfig } from "../types/game";
import { HERO_FRAME } from "../utils/spriteFrames";
import {
    BG_PANEL, BG_ROW, BG_ROW_MID, BG_BTN, BG_BTN_HOVER,
    BORDER_GOLD, BORDER_ROW,
    TXT_GOLD, TXT_GOLD_LIGHT, TXT_GOLD_MID, TXT_MUTED,
    BAR_XP_FILL,
} from "./colors";

export interface HeroPanelOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    hero: HeroState;
    xpPerLevel: number;
    moves: Record<string, MoveConfig>;
    onManageMoves: () => void;
}

export function createHeroPanel(scene: Phaser.Scene, opts: HeroPanelOptions): void {
    const { x: panelX, y: panelY, width: w, height: h, hero, xpPerLevel, moves, onManageMoves } = opts;
    const cx  = panelX + w / 2;
    const pad = panelX + 16;
    const barW = w - 20;

    // Background
    scene.add.rectangle(panelX, panelY, w, h, BG_PANEL, 0.88)
        .setOrigin(0).setStrokeStyle(2, BORDER_GOLD);

    // Title
    scene.add.text(cx, panelY + 22, `Knight  Lv.${hero.level}`, {
        fontSize: "20px", fontFamily: "EnchantedLand", color: TXT_GOLD,
    }).setOrigin(0.5);

    // Hero sprite
    scene.add.image(cx, panelY + 92, HERO_FRAME.key, HERO_FRAME.frame)
        .setScale(3.2).setOrigin(0.5);

    // Stats 2×2 grid
    const stats = [
        { key: "stat_hp",  val: `${hero.currentHp ?? hero.maxHp}/${hero.maxHp}`  },
        { key: "stat_atk", val: hero.attack  },
        { key: "stat_def", val: hero.defense },
        { key: "stat_mag", val: hero.magic   },
    ];
    const col1X = cx - 72;
    const col2X = cx + 36;
    stats.forEach((s, i) => {
        const sx = i % 2 === 0 ? col1X : col2X;
        const sy = panelY + 152 + Math.floor(i / 2) * 32;
        scene.add.image(sx, sy, s.key).setScale(0.68).setOrigin(0.5);
        scene.add.text(sx + 18, sy, `${s.val}`, { fontSize: "16px", color: TXT_GOLD_LIGHT }).setOrigin(0, 0.5);
    });

    // XP bar
    const xpPct = Math.min(1, hero.xp / xpPerLevel);
    scene.add.text(cx, panelY + 230, `XP  ${hero.xp} / ${xpPerLevel}`, { fontSize: "14px", color: TXT_GOLD_MID }).setOrigin(0.5);
    scene.add.rectangle(panelX + 10, panelY + 246, barW, 11, BG_ROW_MID).setOrigin(0);
    scene.add.rectangle(panelX + 10, panelY + 246, barW * xpPct, 11, BAR_XP_FILL).setOrigin(0);

    // Divider
    scene.add.rectangle(cx, panelY + 272, barW, 1, BORDER_GOLD, 0.6).setOrigin(0.5);

    // Equipped moves header
    scene.add.text(cx, panelY + 288, "Equipped Moves", {
        fontSize: "17px", fontFamily: "EnchantedLand", color: TXT_GOLD,
    }).setOrigin(0.5);

    hero.equippedMoves.forEach((moveId, i) => {
        const move = moves[moveId];
        if (!move) return;
        const rowY = panelY + 312 + i * 54;

        scene.add.rectangle(cx, rowY + 20, w - 16, 48, BG_ROW, 0.85)
            .setOrigin(0.5).setStrokeStyle(1, BORDER_ROW);

        scene.add.text(pad, rowY + 8, move.name, {
            fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_LIGHT,
        });
        scene.add.text(pad, rowY + 28,
            `[${move.moveType}]  ${move.description.slice(0, 20)}${move.description.length > 20 ? "…" : ""}`,
            { fontSize: "12px", color: TXT_MUTED },
        );
    });

    // Manage Moves button
    const btnY = panelY + h - 24;
    const btnBg = scene.add.rectangle(cx, btnY, w - 20, 32, BG_BTN, 0.9)
        .setStrokeStyle(1, BORDER_GOLD)
        .setInteractive({ useHandCursor: true });
    const btnTxt = scene.add.text(cx, btnY, "Manage Moves", {
        fontSize: "15px", fontFamily: "EnchantedLand", color: TXT_GOLD_MID,
    }).setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(BG_BTN_HOVER); btnTxt.setColor(TXT_GOLD); });
    btnBg.on("pointerout",  () => { btnBg.setFillStyle(BG_BTN);       btnTxt.setColor(TXT_GOLD_MID); });
    btnBg.on("pointerdown", onManageMoves);

}
