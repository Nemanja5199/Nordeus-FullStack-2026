import Phaser from "phaser";
import { api } from "../services/api";
import { GameState } from "../utils/gameState";
import { createButton, BTN_LG } from "../ui/Button";
import { BG_BTN_SUCCESS, BG_BTN_NEUTRAL, BG_BTN_DANGER } from "../ui/colors";

export class MainMenuScene extends Phaser.Scene {
    constructor() {
        super("MainMenuScene");
    }

    create() {
        const { width, height } = this.scale;

        this.add.tileSprite(0, 0, width, height, "bg_brick").setOrigin(0);
        this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0);

        // Dust motes
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Math.random() < 0.3 ? 2 : 1;
            this.add.circle(x, y, size, 0xb89050, Math.random() * 0.35 + 0.05);
        }

        this.add
            .text(width / 2, height * 0.22, "RPG Gauntlet", {
                fontSize: "100px",
                fontFamily: "EnchantedLand",
                color: "#c8a035",
                stroke: "#3a2008",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        this.add
            .text(width / 2, height * 0.36, "Five monsters. One hero.\nCan you survive the gauntlet?", {
                fontSize: "40px",
                fontFamily: "EnchantedLand",
                color: "#a09060",
                align: "center",
            })
            .setOrigin(0.5);

        const hasSave  = !!localStorage.getItem("rpg_tree_state");
        const btnY     = height * 0.50;
        const btnGap   = 72;
        createButton(this, width / 2, btnY,          { ...BTN_LG, label: "NEW GAME",       color: BG_BTN_SUCCESS, onClick: () => this.startNewGame() });
        if (hasSave) {
            createButton(this, width / 2, btnY + btnGap,   { ...BTN_LG, label: "CONTINUE",       color: BG_BTN_NEUTRAL, onClick: () => this.continueGame() });
            createButton(this, width / 2, btnY + btnGap*2, { ...BTN_LG, label: "RESET PROGRESS", color: BG_BTN_DANGER,  onClick: () => this.resetProgress() });
        }
    }

    private async startNewGame() {
        const loading = this.add
            .text(this.scale.width / 2, this.scale.height * 0.91, "Loading...", { fontSize: "18px", color: "#8a7a5a" })
            .setOrigin(0.5);

        try {
            const config = await api.getRunConfig();
            this.scene.start("CharacterSelectScene", { runConfig: config });
        } catch {
            loading.setText("Failed to connect to server. Is it running?").setColor("#c84a2a");
        }
    }

    private async continueGame() {
        const loading = this.add
            .text(this.scale.width / 2, this.scale.height * 0.91, "Loading save...", { fontSize: "18px", color: "#8a7a5a" })
            .setOrigin(0.5);

        try {
            GameState.loadTreeState();
            const config = await api.getRunConfig(GameState.runSeed ?? undefined);
            GameState.runConfig = config;
            GameState.initHero(config);
            if (localStorage.getItem("rpg_tree_state")) {
                this.scene.start("TreeMapScene");
            } else {
                loading.setText("No save found — starting new game.").setColor("#c8a035");
                this.time.delayedCall(1500, () => this.startNewGame());
            }
        } catch {
            loading.setText("Failed to connect to server.").setColor("#c84a2a");
        }
    }

    private resetProgress() {
        if (GameState.runConfig) GameState.resetHero(GameState.runConfig);
        GameState.clearRun();
        localStorage.removeItem("rpg_hero");
        this.add
            .text(this.scale.width / 2, this.scale.height * 0.91, "Progress reset.", { fontSize: "18px", color: "#c84a2a" })
            .setOrigin(0.5);
    }
}
