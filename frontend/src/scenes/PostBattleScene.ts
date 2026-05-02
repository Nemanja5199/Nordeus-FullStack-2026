import Phaser from "phaser";
import { Scene, type SceneKey } from "./sceneKeys";
import { FONT_LG, FONT_MD, FONT_BODY, FONT_SM, FONT_SCENE_TITLE, FONT_CONQUEST } from "../ui/typography";
import { GameState } from "../utils/gameState";
import { MetaProgress } from "../utils/metaProgress";
import { Audio, TrackGroup, MusicAsset } from "../utils/audio";
import { SfxPlayer, Sfx } from "../utils/sfx";
import { createButton, BTN_MD } from "../ui/Button";
import { api } from "../services/api";
import {
  BG_DARKEST,
  BG_HERO_BATTLE,
  BG_BTN_SUCCESS,
  BG_BTN_NEUTRAL,
  BG_BTN_DANGER,
  BORDER_HERO_BATTLE,
  TXT_GOLD,
  TXT_GOLD_MID,
  TXT_MUTED,
  TXT_HERO,
  TXT_DEFEATED,
  TXT_DEFEAT,
  TXT_SHARD,
  TXT_BLACK,
} from "../ui/colors";

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
  // Guards the Fight Again handler so a flurry of clicks during the
  // /api/run/start fetch doesn't kick off multiple runs.
  private freshRunPending = false;

  constructor() {
    super(Scene.PostBattle);
  }

  // Defeat-screen "Fight Again": fetch a fresh map seed, install it, and
  // start TreeMapScene. MetaProgress (shards, purchased upgrades) is in a
  // separate store so it survives the call. UpgradesScene's button does
  // the same thing — both paths route through GameState.startFreshRun.
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
    // Phaser keeps the scene instance alive across transitions, so any
    // per-attempt state needs to be reset here. Without this, clicking
    // FIGHT AGAIN, dying, and clicking it again would no-op forever.
    this.freshRunPending = false;

    // Battle ended — split flow by outcome:
    //   Win  → silence + a short triumphant stinger (one-shot, no loop)
    //   Lose → death track starts here and persists into UpgradesScene
    //          (Audio.play("death") there is a no-op since group matches)
    if (data.won) {
      Audio.stop();
      Audio.playStinger(this, MusicAsset.Victory, 0.7);
      // Layer the reward cues slightly after the stinger so they don't
      // pile up. Shards get the crystalline ping, new-move drops get the
      // chest-open chime — both only fire when actually earned.
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
    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);

    const isFinalBoss = data.won && data.monsterIndex === GameState.runConfig!.monsters.length - 1;

    if (isFinalBoss) {
      this.buildConquestScreen(width, height);
      return;
    }

    const titleColor = data.won ? TXT_GOLD : TXT_DEFEAT;
    const titleText = data.won ? "VICTORY!" : "DEFEATED";
    this.add
      .text(width / 2, height * 0.18, titleText, {
        fontSize: FONT_SCENE_TITLE,
        fontFamily: "EnchantedLand",
        color: titleColor,
        stroke: TXT_BLACK,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    let y = height * 0.35;

    if (data.won) {
      this.add
        .text(width / 2, y, `+${data.xpGained} XP earned`, {
          fontSize: FONT_LG,
          color: TXT_GOLD_MID,
        })
        .setOrigin(0.5);
      y += 36;

      if (data.goldEarned) {
        this.add
          .text(width / 2, y, `+${data.goldEarned} Gold  (Total: ${GameState.hero.gold})`, {
            fontSize: FONT_MD,
            fontFamily: "EnchantedLand",
            color: TXT_GOLD,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.shardsEarned) {
        this.add
          .text(width / 2, y, `+${data.shardsEarned} ◆ Shards  (Total: ${MetaProgress.shards})`, {
            fontSize: FONT_MD,
            fontFamily: "EnchantedLand",
            color: TXT_SHARD,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.leveledUp) {
        this.add
          .text(width / 2, y, `LEVEL UP!  Now Lv.${GameState.hero.level}`, {
            fontSize: FONT_LG,
            fontFamily: "EnchantedLand",
            color: TXT_GOLD,
          })
          .setOrigin(0.5);
        y += 44;

        const spGained = 1 + MetaProgress.getLevelUpSkillBonus();
        this.add
          .text(width / 2, y, `+${spGained} Skill Point${spGained === 1 ? "" : "s"} — allocate ${spGained === 1 ? "it" : "them"} in Manage Moves`, {
            fontSize: FONT_BODY,
            color: TXT_HERO,
          })
          .setOrigin(0.5);
        y += 36;
      }

      if (data.learnedMoveId) {
        const move = GameState.runConfig!.moves[data.learnedMoveId];

        // Move card — hover to see description
        const cardH = 52;
        const cardBg = this.add
          .rectangle(width / 2, y + cardH / 2, 380, cardH, BG_HERO_BATTLE, 0.92)
          .setStrokeStyle(2, BORDER_HERO_BATTLE);

        this.add
          .text(width / 2, y + 14, `New move learned:  ${move.name}`, {
            fontSize: FONT_MD,
            fontFamily: "EnchantedLand",
            color: TXT_DEFEATED,
          })
          .setOrigin(0.5);
        this.add
          .text(width / 2, y + 34, `[${move.moveType}]`, {
            fontSize: FONT_SM,
            color: TXT_MUTED,
          })
          .setOrigin(0.5);

        // Description shows on hover
        const descText = this.add
          .text(width / 2, y + cardH + 16, "", {
            fontSize: FONT_SM,
            color: TXT_HERO,
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
            fontSize: FONT_BODY,
            color: TXT_MUTED,
          })
          .setOrigin(0.5);
        y += 30;
      }

    } else {
      this.add
        .text(width / 2, y, `◆ ${MetaProgress.shards} Shards saved`, {
          fontSize: FONT_LG,
          fontFamily: "EnchantedLand",
          color: TXT_SHARD,
        })
        .setOrigin(0.5);
      y += 36;

      this.add
        .text(width / 2, y, "Your shards persist — spend them to grow stronger.", {
          fontSize: FONT_BODY,
          color: TXT_MUTED,
        })
        .setOrigin(0.5);
      y += 36;
    }

    y = height * 0.72;

    if (data.won) {
      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "BACK TO MAP",
        color: BG_BTN_SUCCESS,
        onClick: () => this.scene.start(Scene.TreeMap),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "REPLAY BATTLE",
        color: BG_BTN_NEUTRAL,
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
        color: BG_BTN_SUCCESS,
        onClick: () => this.startFreshRun(),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "UPGRADES",
        color: BG_BTN_NEUTRAL,
        onClick: () => this.scene.start(Scene.Upgrades),
      });
      y += 60;

      createButton(this, width / 2, y, {
        ...BTN_MD,
        label: "MAIN MENU",
        color: BG_BTN_DANGER,
        onClick: () => this.scene.start(Scene.MainMenu),
      });
    }
  }

  private buildConquestScreen(width: number, height: number) {
    this.add
      .text(width / 2, height * 0.22, "GAUNTLET CONQUERED!", {
        fontSize: FONT_CONQUEST,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_BLACK,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.38,
        "You have defeated every monster and proven\nyourself the greatest warrior in the land.",
        {
          fontSize: FONT_LG,
          fontFamily: "EnchantedLand",
          color: TXT_HERO,
          align: "center",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.52, `Final level: ${GameState.hero.level}`, {
        fontSize: FONT_MD,
        color: TXT_GOLD_MID,
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height * 0.62,
        "Your legend will be remembered.\nA new challenger may now begin.",
        {
          fontSize: FONT_BODY,
          color: TXT_MUTED,
          align: "center",
        },
      )
      .setOrigin(0.5);

    createButton(this, width / 2, height * 0.76, {
      ...BTN_MD,
      label: "MAIN MENU",
      color: BG_BTN_NEUTRAL,
      onClick: () => {
        GameState.resetHero(GameState.runConfig!);
        GameState.clearRun();
        this.scene.start(Scene.MainMenu);
      },
    });
  }
}
