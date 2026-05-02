import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import { createButton, BTN_MD } from "../ui";
import { GameState, MetaProgress } from "../state";
import { Audio, TrackGroup, MusicAsset, SfxPlayer, Sfx } from "../audio";
import { api } from "../services/api";
import { BG, BORDER, TXT } from "../constants";

interface PostBattleData {
  won: boolean;
  learnedMoveId: string | null;
  xpGained: number;
  goldEarned?: number;
  shardsEarned?: number;
  leveledUp: boolean;
  monsterIndex: number;
  defeatedIds: string[];
  sourceScene?: SceneKey;
  nodeId?: string;
}

export class PostBattleScene extends Phaser.Scene {
  private freshRunPending = false;

  constructor() {
    super(Scene.PostBattle);
  }

  private async startFreshRun() {
    if (this.freshRunPending) return;
    this.freshRunPending = true;
    try {
      const newConfig = await api.getRunConfig();
      GameState.startFreshRun(newConfig);
      this.scene.start(Scene.TreeMap);
    } catch (err) {
      console.warn("[PostBattleScene] fight again failed:", err);
      this.freshRunPending = false;
    }
  }

  create(data: PostBattleData) {
    // Phaser scene instance persists across transitions; reset per-attempt state.
    this.freshRunPending = false;

    if (data.won) {
      Audio.stop();
      Audio.playStinger(this, MusicAsset.Victory, 0.7);
      // Reward cues delayed so they don't pile on top of the stinger.
      if (data.shardsEarned) {
        this.time.delayedCall(450, () => SfxPlayer.play(this, Sfx.ShardPickup));
      }
      if (data.learnedMoveId) {
        this.time.delayedCall(750, () => SfxPlayer.play(this, Sfx.MoveDrop));
      }
    } else {
      Audio.play(this, TrackGroup.Death);
    }
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG.DARKEST).setOrigin(0);

    const isFinalBoss = data.won && data.monsterIndex === GameState.runConfig!.monsters.length - 1;

    if (isFinalBoss) {
      this.buildConquestScreen(width, height);
      return;
    }

    const titleColor = data.won ? TXT.GOLD : TXT.DEFEAT;
    const titleText = data.won ? "VICTORY!" : "DEFEATED";
    this.add
      .text(width / 2, height * 0.18, titleText, {
        fontSize: FONT.SCENE_TITLE,
        fontFamily: "EnchantedLand",
        color: titleColor,
        stroke: TXT.BLACK,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    let y = height * 0.35;

    if (data.won) {
      this.add
        .text(width / 2, y, `+${data.xpGained} XP earned`, {
          fontSize: FONT.LG,
          color: TXT.GOLD_MID,
        })
        .setOrigin(0.5);
      y += 36;

      if (data.goldEarned) {
        this.add
          .text(width / 2, y, `+${data.goldEarned} Gold  (Total: ${GameState.hero.gold})`, {
            fontSize: FONT.MD,
            fontFamily: "EnchantedLand",
            color: TXT.GOLD,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.shardsEarned) {
        this.add
          .text(width / 2, y, `+${data.shardsEarned} ◆ Shards  (Total: ${MetaProgress.shards})`, {
            fontSize: FONT.MD,
            fontFamily: "EnchantedLand",
            color: TXT.SHARD,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.leveledUp) {
        this.add
          .text(width / 2, y, `LEVEL UP!  Now Lv.${GameState.hero.level}`, {
            fontSize: FONT.LG,
            fontFamily: "EnchantedLand",
            color: TXT.GOLD,
          })
          .setOrigin(0.5);
        y += 44;

        const spGained = 1 + MetaProgress.getLevelUpSkillBonus();
        this.add
          .text(width / 2, y, `+${spGained} Skill Point${spGained === 1 ? "" : "s"} — allocate ${spGained === 1 ? "it" : "them"} in Manage Moves`, {
            fontSize: FONT.BODY,
            color: TXT.HERO,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.learnedMoveId) {
        const move = GameState.runConfig!.moves[data.learnedMoveId];

        const cardH = 52;
        const cardBg = this.add
          .rectangle(width / 2, y + cardH / 2, 380, cardH, BG.HERO_BATTLE, 0.92)
          .setStrokeStyle(2, BORDER.HERO_BATTLE);

        this.add
          .text(width / 2, y + 14, `New move learned:  ${move.name}`, {
            fontSize: FONT.MD,
            fontFamily: "EnchantedLand",
            color: TXT.DEFEATED,
          })
          .setOrigin(0.5);
        this.add
          .text(width / 2, y + 34, `[${move.moveType}]`, {
            fontSize: FONT.SM,
            color: TXT.MUTED,
          })
          .setOrigin(0.5);

        const descText = this.add
          .text(width / 2, y + cardH + 16, "", {
            fontSize: FONT.SM,
            color: TXT.HERO,
            wordWrap: { width: 380 },
            align: "center",
          })
          .setOrigin(0.5);

        cardBg.setInteractive({ useHandCursor: false });
        cardBg.on("pointerover", () => descText.setText(move.description));
        cardBg.on("pointerout", () => descText.setText(""));

        y += cardH + 36;
      } else {
        this.add
          .text(width / 2, y, "No new moves to learn from this monster.", {
            fontSize: FONT.BODY,
            color: TXT.MUTED,
          })
          .setOrigin(0.5);
        y += 30;
      }

    } else {
      this.add
        .text(width / 2, y, `◆ ${MetaProgress.shards} Shards saved`, {
          fontSize: FONT.LG,
          fontFamily: "EnchantedLand",
          color: TXT.SHARD,
        })
        .setOrigin(0.5);
      y += 36;

      this.add
        .text(width / 2, y, "Your shards persist — spend them to grow stronger.", {
          fontSize: FONT.BODY,
          color: TXT.MUTED,
        })
        .setOrigin(0.5);
      y += 36;
    }

    y = height * 0.72;

    if (data.won) {
      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "BACK TO MAP",
        color: BG.BTN_SUCCESS,
        onClick: () => this.scene.start(Scene.TreeMap),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "REPLAY BATTLE",
        color: BG.BTN_NEUTRAL,
        onClick: () => {
          const monster = GameState.runConfig!.monsters[data.monsterIndex];
          this.scene.start(Scene.Battle, {
            monster,
            monsterIndex: data.monsterIndex,
            defeatedIds: data.defeatedIds,
            sourceScene: data.sourceScene,
            nodeId: data.nodeId,
          });
        },
      });
    } else {
      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "FIGHT AGAIN",
        color: BG.BTN_SUCCESS,
        onClick: () => this.startFreshRun(),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "UPGRADES",
        color: BG.BTN_NEUTRAL,
        onClick: () => this.scene.start(Scene.Upgrades),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "MAIN MENU",
        color: BG.BTN_DANGER,
        onClick: () => this.scene.start(Scene.MainMenu),
      });
    }
  }

  private buildConquestScreen(width: number, height: number) {
    this.add
      .text(width / 2, height * 0.22, "GAUNTLET CONQUERED!", {
        fontSize: FONT.CONQUEST,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.BLACK,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.38,
        "You have defeated every monster and proven\nyourself the greatest warrior in the land.",
        {
          fontSize: FONT.LG,
          fontFamily: "EnchantedLand",
          color: TXT.HERO,
          align: "center",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.52, `Final level: ${GameState.hero.level}`, {
        fontSize: FONT.MD,
        color: TXT.GOLD_MID,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.62,
        "Your legend will be remembered.\nA new challenger may now begin.",
        {
          fontSize: FONT.BODY,
          color: TXT.MUTED,
          align: "center",
        },
      )
      .setOrigin(0.5);

    createButton(this, width / 2, height * 0.76, {
      ...BTN_MD,
      label: "MAIN MENU",
      color: BG.BTN_NEUTRAL,
      onClick: () => {
        GameState.resetHero(GameState.runConfig!);
        GameState.clearRun();
        this.scene.start(Scene.MainMenu);
      },
    });
  }
}
