import Phaser from "phaser";
import { GameState } from "../utils/gameState";

interface PostBattleData {
  won: boolean;
  learnedMoveId: string | null;
  xpGained: number;
  leveledUp: boolean;
  monsterIndex: number;
  defeatedIds: string[];
}

export class PostBattleScene extends Phaser.Scene {
  constructor() {
    super("PostBattleScene");
  }

  create(data: PostBattleData) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0a0a16).setOrigin(0);

    const titleColor = data.won ? "#ffd700" : "#cc4444";
    const titleText = data.won ? "VICTORY!" : "DEFEATED";
    this.add.text(width / 2, height * 0.18, titleText, {
      fontSize: "56px", color: titleColor, fontStyle: "bold",
      stroke: "#000000", strokeThickness: 6,
    }).setOrigin(0.5);

    let y = height * 0.35;

    if (data.won) {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: "#88aaff",
      }).setOrigin(0.5);
      y += 40;

      if (data.leveledUp) {
        this.add.text(width / 2, y, `LEVEL UP! Now Lv.${GameState.hero.level}`, {
          fontSize: "26px", color: "#ffd700", fontStyle: "bold",
        }).setOrigin(0.5);
        y += 44;

        const gains = GameState.runConfig!.heroDefaults.levelUpStats;
        this.add.text(width / 2, y, `HP +${gains.maxHp}  ATK +${gains.attack}  DEF +${gains.defense}  MAG +${gains.magic}`, {
          fontSize: "16px", color: "#aaffaa",
        }).setOrigin(0.5);
        y += 36;
      }

      if (data.learnedMoveId) {
        const move = GameState.runConfig!.moves[data.learnedMoveId];
        this.add.rectangle(width / 2, y + 28, 420, 60, 0x1a2a1a, 0.9).setStrokeStyle(2, 0x44cc44);
        this.add.text(width / 2, y + 14, `New move learned: ${move.name}`, {
          fontSize: "20px", color: "#44ff44", fontStyle: "bold",
        }).setOrigin(0.5);
        this.add.text(width / 2, y + 36, move.description, {
          fontSize: "14px", color: "#aaffaa",
        }).setOrigin(0.5);
        y += 80;
      } else {
        this.add.text(width / 2, y, "No new moves to learn from this monster.", {
          fontSize: "16px", color: "#888888",
        }).setOrigin(0.5);
        y += 30;
      }
    } else {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: "#888888",
      }).setOrigin(0.5);
      y += 36;

      this.add.text(width / 2, y, "Train harder and try again.", {
        fontSize: "18px", color: "#aaaaaa",
      }).setOrigin(0.5);
      y += 36;
    }

    y = height * 0.72;

    if (data.won) {
      this.makeButton(width / 2, y, "BACK TO MAP", 0x1e3a1e, () => {
        const nextIndex = data.monsterIndex + 1;
        this.scene.start("MapScene", {
          monsterIndex: nextIndex,
          defeatedIds: data.defeatedIds,
        });
      });
      y += 60;

      this.makeButton(width / 2, y, "REPLAY BATTLE", 0x2a2a4a, () => {
        const monster = GameState.runConfig!.monsters[data.monsterIndex];
        this.scene.start("BattleScene", {
          monster,
          monsterIndex: data.monsterIndex,
          heroState: GameState.hero,
          defeatedIds: data.defeatedIds,
        });
      });
    } else {
      this.makeButton(width / 2, y, "TRY AGAIN", 0x3a2a1a, () => {
        const monster = GameState.runConfig!.monsters[data.monsterIndex];
        this.scene.start("BattleScene", {
          monster,
          monsterIndex: data.monsterIndex,
          heroState: GameState.hero,
          defeatedIds: data.defeatedIds,
        });
      });
      y += 60;

      this.makeButton(width / 2, y, "BACK TO MAP", 0x1a1a3a, () => {
        this.scene.start("MapScene", {
          monsterIndex: data.monsterIndex,
          defeatedIds: data.defeatedIds,
        });
      });
    }
  }

  private makeButton(x: number, y: number, label: string, color: number, cb: () => void) {
    const bg = this.add.rectangle(x, y, 260, 48, color, 0.9).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
    bg.on("pointerover", () => { bg.setAlpha(1); txt.setColor("#ffd700"); });
    bg.on("pointerout", () => { bg.setAlpha(0.9); txt.setColor("#ffffff"); });
    bg.on("pointerdown", cb);
  }
}
