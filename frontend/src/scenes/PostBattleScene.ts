import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createButton, BTN_MD } from "../ui/Button";

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
    this.add.rectangle(0, 0, width, height, 0x0d0905).setOrigin(0);

    const titleColor = data.won ? "#c8a035" : "#8a3a3a";
    const titleText = data.won ? "VICTORY!" : "DEFEATED";
    this.add.text(width / 2, height * 0.18, titleText, {
      fontSize: "56px", color: titleColor, fontStyle: "bold",
      stroke: "#000000", strokeThickness: 6,
    }).setOrigin(0.5);

    let y = height * 0.35;

    if (data.won) {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: "#a07840",
      }).setOrigin(0.5);
      y += 40;

      if (data.leveledUp) {
        this.add.text(width / 2, y, `LEVEL UP! Now Lv.${GameState.hero.level}`, {
          fontSize: "26px", color: "#c8a035", fontStyle: "bold",
        }).setOrigin(0.5);
        y += 44;

        const gains = GameState.runConfig!.heroDefaults.levelUpStats;
        this.add.text(width / 2, y, `HP +${gains.maxHp}  ATK +${gains.attack}  DEF +${gains.defense}  MAG +${gains.magic}`, {
          fontSize: "16px", color: "#a8c888",
        }).setOrigin(0.5);
        y += 36;
      }

      if (data.learnedMoveId) {
        const move = GameState.runConfig!.moves[data.learnedMoveId];
        this.add.rectangle(width / 2, y + 28, 420, 60, 0x1c3018, 0.9).setStrokeStyle(2, 0x4a8a3a);
        this.add.text(width / 2, y + 14, `New move learned: ${move.name}`, {
          fontSize: "20px", color: "#5aaa3a", fontStyle: "bold",
        }).setOrigin(0.5);
        this.add.text(width / 2, y + 36, move.description, {
          fontSize: "14px", color: "#a8c888",
        }).setOrigin(0.5);
        y += 80;
      } else {
        this.add.text(width / 2, y, "No new moves to learn from this monster.", {
          fontSize: "16px", color: "#8a7a5a",
        }).setOrigin(0.5);
        y += 30;
      }
    } else {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: "#8a7a5a",
      }).setOrigin(0.5);
      y += 36;

      this.add.text(width / 2, y, "Train harder and try again.", {
        fontSize: "18px", color: "#8a7a5a",
      }).setOrigin(0.5);
      y += 36;
    }

    y = height * 0.72;

    if (data.won) {
      createButton(this, width / 2, y, { ...BTN_MD, label: "BACK TO MAP", color: 0x1c2e14, onClick: () => {
        this.scene.start("MapScene", { monsterIndex: data.monsterIndex + 1, defeatedIds: data.defeatedIds });
      }});
      y += 60;

      createButton(this, width / 2, y, { ...BTN_MD, label: "REPLAY BATTLE", color: 0x1a1c20, onClick: () => {
        const monster = GameState.runConfig!.monsters[data.monsterIndex];
        this.scene.start("BattleScene", { monster, monsterIndex: data.monsterIndex, heroState: GameState.hero, defeatedIds: data.defeatedIds });
      }});
    } else {
      createButton(this, width / 2, y, { ...BTN_MD, label: "TRY AGAIN", color: 0x2e1008, onClick: () => {
        const monster = GameState.runConfig!.monsters[data.monsterIndex];
        this.scene.start("BattleScene", { monster, monsterIndex: data.monsterIndex, heroState: GameState.hero, defeatedIds: data.defeatedIds });
      }});
      y += 60;

      createButton(this, width / 2, y, { ...BTN_MD, label: "BACK TO MAP", color: 0x1a1c20, onClick: () => {
        this.scene.start("MapScene", { monsterIndex: data.monsterIndex, defeatedIds: data.defeatedIds });
      }});
    }
  }
}
