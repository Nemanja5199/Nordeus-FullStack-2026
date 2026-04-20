import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createHeroPanel } from "../ui/HeroPanel";
import { createMonsterNode } from "../ui/MonsterNode";
import type { NodeState } from "../ui/MonsterNode";
import { TXT_DARK, TXT_GOLD, BG_SEPIA, DOT_PATH_DEFEATED, DOT_PATH_ACTIVE } from "../ui/colors";


interface MapData {
    monsterIndex: number;
    defeatedIds: string[];
}

const PANEL_W = 260;
const PANEL_H = 560;
const PANEL_GAP = 16;

export class MapScene extends Phaser.Scene {
    private defeatedIds: string[] = [];
    private currentMonsterIndex: number = 0;

    constructor() {
        super("MapScene");
    }

    create(data: MapData) {
        this.defeatedIds = data.defeatedIds ?? [];
        this.currentMonsterIndex = data.monsterIndex ?? 0;

        const { width, height } = this.scale;
        const config = GameState.runConfig!;

        this.drawBackground(width, height);

        this.add
            .text(width / 2, height * 0.07, "The Gauntlet", {
                fontSize: "62px",
                fontFamily: "EnchantedLand",
                color: TXT_DARK,
                stroke: TXT_GOLD,
                strokeThickness: 2,
            })
            .setOrigin(0.5);

        createHeroPanel(this, {
            x: PANEL_GAP,
            y: (height - PANEL_H) / 2,
            width: PANEL_W,
            height: PANEL_H,
            hero: GameState.hero,
            xpPerLevel: GameState.hero.level * config.heroDefaults.xpPerLevel,
            moves: config.moves,
            onManageMoves: () => this.scene.launch("MoveManagementScene", { returnScene: "MapScene" }),
        });

        this.drawMonsterNodes(width, height);

        if (this.defeatedIds.length === config.monsters.length) {
            this.add
                .text(width / 2, height * 0.93, "YOU HAVE CONQUERED THE GAUNTLET!", {
                    fontSize: "32px",
                    fontFamily: "EnchantedLand",
                    color: TXT_DARK,
                    stroke: TXT_GOLD,
                    strokeThickness: 2,
                })
                .setOrigin(0.5);
        }
    }

    private drawBackground(width: number, height: number) {
        this.add.tileSprite(0, 0, width, height, "bg_sand").setOrigin(0);
        this.add.rectangle(0, 0, width, height, BG_SEPIA, 0.38).setOrigin(0);

        const g = this.add.graphics();
        g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.65, 0.65, 0, 0);
        g.fillRect(0, 0, width, height * 0.28);
        g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.65, 0.65);
        g.fillRect(0, height * 0.72, width, height * 0.28);
        g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0, 0, 0.5);
        g.fillRect(0, 0, width * 0.18, height);
    }

    private drawMonsterNodes(width: number, height: number) {
        const monsters = GameState.runConfig!.monsters;
        const nodeW = 180;
        const nodeH = 210;

        const leftEdge = PANEL_GAP + PANEL_W + 16;
        const rightEdge = width - PANEL_GAP - 8;
        const usableW = rightEdge - leftEdge;
        const spacing = usableW / monsters.length;
        const startX = leftEdge + spacing / 2;

        const nodeYBase = height * 0.38;
        const nodeYShift = 250;
        const nodeYs = monsters.map((_, i) => i % 2 === 0 ? nodeYBase : nodeYBase + nodeYShift);

        for (let i = 0; i < monsters.length; i++) {
            const m = monsters[i];
            const x = startX + i * spacing;
            const nodeY = nodeYs[i];
            const isDefeated = this.defeatedIds.includes(m.id);
            const isNext = i === this.currentMonsterIndex && !isDefeated;
            const state: NodeState = isDefeated ? "defeated" : isNext ? "next" : "locked";

            // Solid path to next node
            if (i < monsters.length - 1) {
                const nextX = startX + (i + 1) * spacing;
                const nextY = nodeYs[i + 1];
                const fromX = x + nodeW / 2;
                const fromY = nodeY + (nextY > nodeY ? nodeH / 2 : -nodeH / 2);
                const toX = nextX - nodeW / 2;
                const toY = nextY + (nodeY > nextY ? nodeH / 2 : -nodeH / 2);
                const lineCol = isDefeated ? DOT_PATH_DEFEATED : DOT_PATH_ACTIVE;
                const lineAlp = isDefeated ? 1.0 : 0.85;
                const g = this.add.graphics();
                g.lineStyle(10, lineCol, lineAlp);
                g.beginPath();
                g.moveTo(fromX, fromY);
                g.lineTo(toX, toY);
                g.strokePath();
            }

            createMonsterNode(this, {
                x, y: nodeY,
                width: nodeW, height: nodeH,
                monster: m,
                state,
                onFight: () => this.enterBattle(i),
            });
        }
    }

    private enterBattle(monsterIndex: number) {
        const monster = GameState.runConfig!.monsters[monsterIndex];
        GameState.saveRun({
            currentMonsterIndex: monsterIndex,
            defeatedMonsterIds: this.defeatedIds,
            runConfig: GameState.runConfig!,
        });
        this.scene.start("BattleScene", {
            monster,
            monsterIndex,
            heroState: GameState.hero,
            defeatedIds: this.defeatedIds,
        });
    }
}
