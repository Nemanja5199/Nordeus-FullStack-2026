import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createButton, BTN_MD } from "../ui/Button";
import {
  BG_DARKEST, BG_HERO_BATTLE, BG_BTN_SUCCESS, BG_BTN_NEUTRAL, BG_BTN_DANGER,
  BORDER_HERO_BATTLE,
  TXT_GOLD, TXT_GOLD_MID, TXT_MUTED, TXT_HERO, TXT_DEFEATED, TXT_DEFEAT,
} from "../ui/colors";

interface PostBattleData {
  won: boolean;
  learnedMoveId: string | null;
  xpGained: number;
  leveledUp: boolean;
  monsterIndex: number;
  defeatedIds: string[];
  sourceScene?: string;
  nodeId?: string;
}

export class PostBattleScene extends Phaser.Scene {
  constructor() {
    super("PostBattleScene");
  }

  create(data: PostBattleData) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);

    const isFinalBoss = data.won &&
      data.monsterIndex === GameState.runConfig!.monsters.length - 1;

    if (isFinalBoss) {
      this.buildConquestScreen(width, height);
      return;
    }

    const titleColor = data.won ? TXT_GOLD : TXT_DEFEAT;
    const titleText  = data.won ? "VICTORY!" : "DEFEATED";
    this.add.text(width / 2, height * 0.18, titleText, {
      fontSize: "56px", fontFamily: "EnchantedLand", color: titleColor,
      stroke: "#000000", strokeThickness: 6,
    }).setOrigin(0.5);

    let y = height * 0.35;

    if (data.won) {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: TXT_GOLD_MID,
      }).setOrigin(0.5);
      y += 40;

      if (data.leveledUp) {
        this.add.text(width / 2, y, `LEVEL UP!  Now Lv.${GameState.hero.level}`, {
          fontSize: "26px", fontFamily: "EnchantedLand", color: TXT_GOLD,
        }).setOrigin(0.5);
        y += 44;

        this.add.text(width / 2, y,
          `+3 Skill Points — allocate them in Manage Moves`, {
            fontSize: "16px", color: TXT_HERO,
          }).setOrigin(0.5);
        y += 36;
      }

      if (data.learnedMoveId) {
        const move = GameState.runConfig!.moves[data.learnedMoveId];

        // Move card — hover to see description
        const cardH = 52;
        const cardBg = this.add.rectangle(width / 2, y + cardH / 2, 380, cardH, BG_HERO_BATTLE, 0.92)
          .setStrokeStyle(2, BORDER_HERO_BATTLE);

        this.add.text(width / 2, y + 14, `New move learned:  ${move.name}`, {
          fontSize: "19px", fontFamily: "EnchantedLand", color: TXT_DEFEATED,
        }).setOrigin(0.5);
        this.add.text(width / 2, y + 34, `[${move.moveType}]`, {
          fontSize: "12px", color: TXT_MUTED,
        }).setOrigin(0.5);

        // Description shows on hover
        const descText = this.add.text(width / 2, y + cardH + 12, "", {
          fontSize: "14px", color: TXT_HERO,
          wordWrap: { width: 380 }, align: "center",
        }).setOrigin(0.5);

        cardBg.setInteractive({ useHandCursor: false });
        cardBg.on("pointerover", () => descText.setText(move.description));
        cardBg.on("pointerout",  () => descText.setText(""));

        y += cardH + 36;
      } else {
        this.add.text(width / 2, y, "No new moves to learn from this monster.", {
          fontSize: "16px", color: TXT_MUTED,
        }).setOrigin(0.5);
        y += 30;
      }
    } else {
      this.add.text(width / 2, y, `+${data.xpGained} XP earned`, {
        fontSize: "22px", color: TXT_MUTED,
      }).setOrigin(0.5);
      y += 36;

      this.add.text(width / 2, y, "Train harder and try again.", {
        fontSize: "18px", color: TXT_MUTED,
      }).setOrigin(0.5);
      y += 36;
    }

    y = height * 0.72;

    const isTreeFlow = data.sourceScene === "TreeMapScene";

    if (data.won) {
      createButton(this, width / 2, y, {
        ...BTN_MD, label: "BACK TO MAP", color: BG_BTN_SUCCESS,
        onClick: () => isTreeFlow
          ? this.scene.start("TreeMapScene")
          : this.scene.start("MapScene", { monsterIndex: data.monsterIndex + 1, defeatedIds: data.defeatedIds }),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD, label: "REPLAY BATTLE", color: BG_BTN_NEUTRAL,
        onClick: () => {
          const monster = GameState.runConfig!.monsters[data.monsterIndex];
          this.scene.start("BattleScene", {
            monster, monsterIndex: data.monsterIndex, defeatedIds: data.defeatedIds,
            sourceScene: data.sourceScene, nodeId: data.nodeId,
          });
        },
      });
    } else {
      createButton(this, width / 2, y, {
        ...BTN_MD, label: "TRY AGAIN", color: BG_BTN_DANGER,
        onClick: () => {
          const monster = GameState.runConfig!.monsters[data.monsterIndex];
          this.scene.start("BattleScene", {
            monster, monsterIndex: data.monsterIndex, defeatedIds: data.defeatedIds,
            sourceScene: data.sourceScene, nodeId: data.nodeId,
          });
        },
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD, label: "BACK TO MAP", color: BG_BTN_NEUTRAL,
        onClick: () => isTreeFlow
          ? this.scene.start("TreeMapScene")
          : this.scene.start("MapScene", { monsterIndex: data.monsterIndex, defeatedIds: data.defeatedIds }),
      });
    }
  }

  private buildConquestScreen(width: number, height: number) {
    this.add.text(width / 2, height * 0.22, "GAUNTLET CONQUERED!", {
      fontSize: "62px", fontFamily: "EnchantedLand", color: TXT_GOLD,
      stroke: "#000000", strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38,
      "You have defeated every monster and proven\nyourself the greatest warrior in the land.", {
        fontSize: "22px", fontFamily: "EnchantedLand", color: TXT_HERO,
        align: "center",
      }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.52, `Final level: ${GameState.hero.level}`, {
      fontSize: "18px", color: TXT_GOLD_MID,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.62,
      "Your legend will be remembered.\nA new challenger may now begin.", {
        fontSize: "16px", color: TXT_MUTED, align: "center",
      }).setOrigin(0.5);

    createButton(this, width / 2, height * 0.76, {
      ...BTN_MD, width: 360, height: 52, fontSize: "20px",
      label: "RETURN TO MAIN MENU", color: BG_BTN_SUCCESS,
      onClick: () => {
        GameState.resetHero(GameState.runConfig!);
        GameState.clearRun();
        this.scene.start("MainMenuScene");
      },
    });
  }
}
