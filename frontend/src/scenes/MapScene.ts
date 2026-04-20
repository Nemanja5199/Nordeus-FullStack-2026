import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { MONSTER_FRAMES } from "../utils/spriteFrames";

interface MapData {
    monsterIndex: number;
    defeatedIds: string[];
}

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

        this.add.rectangle(0, 0, width, height, 0x0d0905).setOrigin(0);

        this.add
            .text(width / 2, 36, "THE GAUNTLET", { fontSize: "36px", color: "#c8a035", fontStyle: "bold", stroke: "#4a3010", strokeThickness: 4 })
            .setOrigin(0.5);

        this.drawHeroPanel();
        this.drawMonsterNodes(config, width, height);
        this.drawManageMovesButton(width, height);

        if (this.defeatedIds.length === 5) {
            this.add
                .text(width / 2, height - 40, "YOU HAVE CONQUERED THE GAUNTLET!", {
                    fontSize: "28px", color: "#c8a035", fontStyle: "bold", stroke: "#4a3010", strokeThickness: 3,
                })
                .setOrigin(0.5);
        }
    }

    private drawHeroPanel() {
        const h = GameState.hero;
        const xpNeeded = h.level * (GameState.runConfig!.heroDefaults.xpPerLevel);
        const panel = this.add.rectangle(10, 80, 230, 130, 0x1c1408, 0.9).setOrigin(0).setStrokeStyle(1, 0x4a3818);
        this.add.text(20, 90, `Knight  Lv.${h.level}`, { fontSize: "16px", color: "#c8a035", fontStyle: "bold" });
        this.add.text(20, 112, `HP: ${h.maxHp}  ATK: ${h.attack}  DEF: ${h.defense}  MAG: ${h.magic}`, { fontSize: "13px", color: "#d4b483" });
        this.add.text(20, 132, `XP: ${h.xp} / ${xpNeeded}`, { fontSize: "13px", color: "#a07840" });
        this.add.text(20, 152, `Equipped moves:`, { fontSize: "13px", color: "#8a7a5a" });
        const moves = h.equippedMoves.map(id => GameState.runConfig!.moves[id]?.name ?? id).join(", ");
        this.add.text(20, 168, moves, { fontSize: "12px", color: "#c8b078", wordWrap: { width: 210 } });
        void panel; // suppress unused warning
    }

    private drawMonsterNodes(config: typeof GameState.runConfig, width: number, height: number) {
        const monsters = config!.monsters;
        const nodeY = height / 2;
        const spacing = (width - 160) / (monsters.length - 1);

        for (let i = 0; i < monsters.length; i++) {
            const m = monsters[i];
            const x = 80 + i * spacing;
            const isDefeated = this.defeatedIds.includes(m.id);
            const isNext = i === this.currentMonsterIndex && !isDefeated;
            const isLocked = i > this.currentMonsterIndex && !isDefeated;

            const color = isDefeated ? 0x1a2a10 : isNext ? 0x2a1e08 : 0x120e08;
            const borderColor = isDefeated ? 0x3a7a1a : isNext ? 0xb88820 : 0x2a2018;

            const node = this.add.rectangle(x, nodeY, 130, 140, color, 0.9)
                .setStrokeStyle(2, borderColor);

            if (!isLocked) {
                node.setInteractive({ useHandCursor: true });
                node.on("pointerover", () => node.setAlpha(0.75));
                node.on("pointerout", () => node.setAlpha(1));
                node.on("pointerdown", () => this.enterBattle(i));
            }

            // Monster sprite (2x scale = 64x64)
            const mFrame = MONSTER_FRAMES[m.id];
            if (mFrame) {
                const alpha = isDefeated ? 0.4 : isLocked ? 0.3 : 1;
                this.add.image(x, nodeY - 10, mFrame.key, mFrame.frame)
                    .setScale(2).setOrigin(0.5).setAlpha(alpha);
            }

            const nameColor = isDefeated ? "#5aaa3a" : isNext ? "#c8a035" : "#4a3818";
            this.add.text(x, nodeY - 54, m.name, { fontSize: "13px", color: nameColor, fontStyle: "bold" }).setOrigin(0.5);
            this.add.text(x, nodeY + 36, `HP:${m.stats.hp} ATK:${m.stats.attack}`, { fontSize: "11px", color: "#8a7a5a" }).setOrigin(0.5);
            this.add.text(x, nodeY + 50, `DEF:${m.stats.defense} MAG:${m.stats.magic}`, { fontSize: "11px", color: "#8a7a5a" }).setOrigin(0.5);

            const statusLabel = isDefeated ? "DEFEATED" : isNext ? "FIGHT" : "LOCKED";
            const statusColor = isDefeated ? "#5aaa3a" : isNext ? "#b88820" : "#3a2818";
            this.add.text(x, nodeY + 40, statusLabel, { fontSize: "13px", color: statusColor, fontStyle: "bold" }).setOrigin(0.5);

            // Connector line
            if (i < monsters.length - 1) {
                const lineColor = this.defeatedIds.includes(m.id) ? 0x3a7a1a : 0x2a2018;
                this.add.line(0, 0, x + 60, nodeY, x + spacing - 60, nodeY, lineColor, 0.7).setOrigin(0);
            }
        }
    }

    private drawManageMovesButton(width: number, height: number) {
        const bg = this.add.rectangle(width - 10, height - 10, 200, 44, 0x1e1a10, 0.9)
            .setOrigin(1, 1)
            .setInteractive({ useHandCursor: true });
        const txt = this.add.text(width - 110, height - 32, "MANAGE MOVES", { fontSize: "16px", color: "#a07840" }).setOrigin(0.5);

        bg.on("pointerover", () => { bg.setAlpha(1); txt.setColor("#c8a035"); });
        bg.on("pointerout", () => { bg.setAlpha(0.9); txt.setColor("#a07840"); });
        bg.on("pointerdown", () => this.scene.launch("MoveManagementScene", { returnScene: "MapScene" }));
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
