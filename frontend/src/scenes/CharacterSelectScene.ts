import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { HERO_FRAME } from "../utils/spriteFrames";
import type { RunConfig } from "../types/game";
import { createButton, BTN_MD } from "../ui/Button";

interface CharacterSelectData {
    runConfig: RunConfig;
}

const CLASSES = [
    {
        id: "knight",
        name: "Knight",
        description: "A stalwart warrior clad in steel.\nTanks hits and overpowers enemies\nwith raw strength.",
        stats: { hp: 100, atk: 15, def: 10, mag: 8 },
        moves: ["Slash", "Shield Up", "Battle Cry", "Second Wind"],
        spriteKey: HERO_FRAME.key,
        spriteFrame: HERO_FRAME.frame,
        locked: false,
    },
    {
        id: "assassin",
        name: "Assassin",
        description: "A shadow in the night.\nStrips defenses and punishes\nvulnerable enemies.",
        stats: { hp: 80, atk: 18, def: 6, mag: 6 },
        moves: ["Shiv", "Cheap Shot", "Smoke Bomb", "Expose"],
        spriteKey: "rogues",
        spriteFrame: 3,
        locked: true,
    },
    {
        id: "mage",
        name: "Mage",
        description: "A wielder of arcane forces.\nIgnores Defense and drains\nlife with pure magic.",
        stats: { hp: 70, atk: 6, def: 5, mag: 20 },
        moves: ["Fireball", "Frost Nova", "Arcane Shield", "Drain"],
        spriteKey: "rogues",
        spriteFrame: 5,
        locked: true,
    },
];

const STAT_ROWS = [
    { key: "stat_hp", label: "HP" },
    { key: "stat_atk", label: "ATK" },
    { key: "stat_def", label: "DEF" },
    { key: "stat_mag", label: "MAG" },
] as const;

export class CharacterSelectScene extends Phaser.Scene {
    private selectedIndex = 0;
    private cardContainers: Phaser.GameObjects.Container[] = [];
    private runConfig!: RunConfig;

    constructor() {
        super("CharacterSelectScene");
    }

    create(data: CharacterSelectData) {
        this.runConfig = data.runConfig;
        this.selectedIndex = 0;
        this.cardContainers = [];

        const { width, height } = this.scale;

        this.add.tileSprite(0, 0, width, height, "bg_brick").setOrigin(0);
        this.add.rectangle(0, 0, width, height, 0x000000, 0.68).setOrigin(0);

        this.add
            .text(width / 2, height * 0.08, "Choose Your Hero", {
                fontSize: "56px",
                fontFamily: "EnchantedLand",
                color: "#c8a035",
                stroke: "#3a2008",
                strokeThickness: 6,
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height * 0.15, "Your choice defines your playstyle for the entire run.", {
                fontSize: "25px",
                fontFamily: "EnchantedLand",
                color: "#8a7a5a",
            })
            .setOrigin(0.5);

        const cardW = Math.min(240, (width - 80) / 3);
        const cardH = height * 0.54;
        const totalW = cardW * 3 + 40 * 2;
        const startX = width / 2 - totalW / 2 + cardW / 2;

        CLASSES.forEach((cls, i) => {
            const x = startX + i * (cardW + 40);
            const y = height * 0.49;
            const container = this.buildCard(cls, x, y, cardW, cardH, i);
            this.cardContainers.push(container);
        });

        this.highlightCard(0);

        createButton(this, width / 2 + 140, height * 0.9, { ...BTN_MD, label: "START RUN", color: 0x1c2e14, onClick: () => this.confirm() });
        createButton(this, width / 2 - 140, height * 0.9, { ...BTN_MD, label: "BACK", color: 0x1a1c20, onClick: () => this.scene.start("MainMenuScene") });
    }

    private buildCard(
        cls: (typeof CLASSES)[0],
        x: number,
        y: number,
        w: number,
        h: number,
        index: number
    ): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        const bg = this.add
            .rectangle(0, 0, w, h, cls.locked ? 0x100c08 : 0x1c1408, 0.95)
            .setStrokeStyle(2, cls.locked ? 0x2a2018 : 0x7a5828);

        // Sprite
        const sprite = this.add
            .image(0, -h * 0.3, cls.spriteKey, cls.spriteFrame)
            .setScale(cls.locked ? 3 : 4)
            .setAlpha(cls.locked ? 0.3 : 1);

        // Name
        const nameText = this.add
            .text(0, -h * 0.13, cls.name, {
                fontSize: "20px",
                fontFamily: "EnchantedLand",
                color: cls.locked ? "#3a3020" : "#c8a035",
            })
            .setOrigin(0.5);

        // Stats 2x2 icon grid
        const statObjs: Phaser.GameObjects.GameObject[] = [];
        const statValues = [cls.stats.hp, cls.stats.atk, cls.stats.def, cls.stats.mag];
        const iconScale = 0.45;
        const colX = [-w * 0.22, w * 0.22];
        const rowY = [-h * 0.035, h * 0.055];

        STAT_ROWS.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const sx = colX[col];
            const sy = rowY[row];
            const iconColor = cls.locked ? 0.15 : 1;

            const icon = this.add.image(sx - 14, sy, stat.key).setScale(iconScale).setAlpha(iconColor);
            const label = this.add.text(sx + 4, sy, `${statValues[i]}`, {
                fontSize: "20px",
                color: cls.locked ? "#2a2418" : "#d4b483",
            }).setOrigin(0, 0.5);

            statObjs.push(icon, label);
        });

        // Description
        const descText = this.add
            .text(0, h * 0.18, cls.description, {
                fontSize: "12px",
                color: cls.locked ? "#2a2418" : "#d4b483",
                align: "center",
                wordWrap: { width: w - 20 },
            })
            .setOrigin(0.5);

        // Moves list
        const movesLabel = this.add
            .text(0, h * 0.32, "Moves", {
                fontSize: "12px",
                fontFamily: "EnchantedLand",
                color: cls.locked ? "#2a2418" : "#8a7a5a",
            })
            .setOrigin(0.5);

        const movesText = this.add
            .text(0, h * 0.4, cls.moves.join("  ·  "), {
                fontSize: "11px",
                color: cls.locked ? "#2a2418" : "#c8b078",
                align: "center",
                wordWrap: { width: w - 16 },
            })
            .setOrigin(0.5);

        if (cls.locked) {
            const lockText = this.add
                .text(0, 0, "COMING\nSOON", {
                    fontSize: "22px",
                    fontFamily: "EnchantedLand",
                    color: "#4a3820",
                    align: "center",
                    stroke: "#000",
                    strokeThickness: 3,
                })
                .setOrigin(0.5);
            container.add([bg, sprite, nameText, ...statObjs, descText, movesLabel, movesText, lockText]);
        } else {
            container.add([bg, sprite, nameText, ...statObjs, descText, movesLabel, movesText]);
            bg.setInteractive({ useHandCursor: true });
            bg.on("pointerdown", () => {
                this.selectedIndex = index;
                this.highlightCard(index);
            });
            bg.on("pointerover", () => bg.setAlpha(0.8));
            bg.on("pointerout", () => bg.setAlpha(0.95));
        }

        return container;
    }

    private highlightCard(index: number) {
        this.cardContainers.forEach((c, i) => {
            const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
            if (i === index && !CLASSES[i].locked) {
                bg.setStrokeStyle(3, 0xb88820);
                bg.setFillStyle(0x2a1e08);
            } else if (!CLASSES[i].locked) {
                bg.setStrokeStyle(2, 0x7a5828);
                bg.setFillStyle(0x1c1408);
            }
        });
    }

    private confirm() {
        const cls = CLASSES[this.selectedIndex];
        if (cls.locked) return;

        GameState.runConfig = this.runConfig;
        GameState.initHero(this.runConfig);
        GameState.clearRun();

        this.scene.start("MapScene", { monsterIndex: 0, defeatedIds: [] });
    }
}
