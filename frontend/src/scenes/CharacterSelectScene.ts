import Phaser from "phaser";
import { Scene } from "./sceneKeys";
import { FONT_LG, FONT_SM, FONT_XS, FONT_SCENE_TITLE, createButton, BTN_MD } from "../ui";
import { GameState, MetaProgress } from "../state";
import { HERO_FRAMES } from "../sprites";
import type { HeroClass, RunConfig } from "../types/game";
import {
  BG_BLACK,
  BG_MOVE_CARD,
  BG_CARD_LOCKED,
  BG_CARD_SELECTED,
  BG_BTN_SUCCESS,
  BG_BTN_NEUTRAL,
  BORDER_GOLD,
  BORDER_CARD_LOCKED,
  BORDER_GOLD_BRIGHT,
  TINT_GOLD,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_GOLD_WARM,
  TXT_MUTED,
  TXT_STROKE_TITLE,
  TXT_CARD_LOCKED,
  TXT_CLASS_LOCKED,
  TXT_COMING_SOON,
} from "../ui";

interface CharacterSelectData {
  runConfig: RunConfig;
}

interface ClassCard {
  id: HeroClass;
  name: string;
  description: string;
  stats: { hp: number; atk: number; def: number; mag: number };
  moves: string[];
  spriteKey: string;
  spriteFrame: number;
  locked: boolean;
}

// Display-only — the run uses HERO_CLASSES from the backend. Keep numbers
// in sync with backend/app/data/hero.py.
const CLASSES: ClassCard[] = [
  {
    id: "knight",
    name: "Knight",
    description:
      "A stalwart warrior clad in steel.\nTanks hits and overpowers enemies\nwith raw strength.",
    stats: { hp: 100, atk: 25, def: 10, mag: 8 },
    moves: ["Slash", "Shield Up", "Battle Cry", "Second Wind"],
    spriteKey: HERO_FRAMES.knight.key,
    spriteFrame: HERO_FRAMES.knight.frame,
    locked: false,
  },
  {
    id: "mage",
    name: "Mage",
    description:
      "A glass cannon of pure arcane power.\nFrail body, devastating spells.\nMana is your weapon.",
    stats: { hp: 80, atk: 8, def: 6, mag: 25 },
    moves: ["Arc Lash", "Mana Ward", "Focus", "Mend"],
    spriteKey: HERO_FRAMES.mage.key,
    spriteFrame: HERO_FRAMES.mage.frame,
    locked: false,
  },
];

const STAT_DEFS = [
  {
    key: "stat_hp",
    label: "HP",
    desc: "Health Points — how much damage you can take before dying.",
  },
  {
    key: "stat_atk",
    label: "ATK",
    desc: "Attack — raw physical damage dealt to enemies each hit.",
  },
  {
    key: "stat_def",
    label: "DEF",
    desc: "Defense — reduces incoming physical damage from enemies.",
  },
  { key: "stat_mag", label: "MAG", desc: "Magic — power of spells, buffs, and magical abilities." },
  { key: "stat_mp",  label: "MP",  desc: "Mana — spent on abilities, regens 15 per turn. Always starts at 60." },
] as const;

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cardContainers: Phaser.GameObjects.Container[] = [];
  private runConfig!: RunConfig;
  private statInfoText!: Phaser.GameObjects.Text;
  private statInfoBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(Scene.CharacterSelect);
  }

  create(data: CharacterSelectData) {
    this.runConfig = data.runConfig;
    this.selectedIndex = 0;
    this.cardContainers = [];

    const { width, height } = this.scale;

    this.add.tileSprite(0, 0, width, height, "bg_brick").setOrigin(0);
    this.add.rectangle(0, 0, width, height, BG_BLACK, 0.68).setOrigin(0);

    this.add
      .text(width / 2, height * 0.08, "Choose Your Hero", {
        fontSize: FONT_SCENE_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: TXT_STROKE_TITLE,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.15, "Your choice defines your playstyle for the entire run.", {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: TXT_MUTED,
      })
      .setOrigin(0.5);

    // Layout scales with card count; cardW caps at 280 so 2-card layouts
    // don't go cartoonishly wide.
    const n = CLASSES.length;
    const cardW = Math.min(280, (width - 160) / Math.max(n, 3));
    const cardH = height * 0.6;
    const gap = Math.max(40, (width - cardW * n) / (n + 1));
    const totalW = cardW * n + gap * (n - 1);
    const startX = width / 2 - totalW / 2 + cardW / 2;

    CLASSES.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
      const y = height * 0.49;
      const container = this.buildCard(cls, x, y, cardW, cardH, i);
      this.cardContainers.push(container);
    });

    this.highlightCard(0);

    // Stat hover info bar
    this.statInfoBg = this.add
      .rectangle(width / 2, height * 0.835, width * 0.55, 32, BG_MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER_GOLD)
      .setVisible(false);
    this.statInfoText = this.add
      .text(width / 2, height * 0.835, "", {
        fontSize: FONT_SM,
        color: TXT_GOLD_LIGHT,
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);

    createButton(this, width / 2 + 140, height * 0.9, {
      ...BTN_MD,
      label: "START RUN",
      color: BG_BTN_SUCCESS,
      onClick: () => this.confirm(),
    });
    createButton(this, width / 2 - 140, height * 0.9, {
      ...BTN_MD,
      label: "BACK",
      color: BG_BTN_NEUTRAL,
      onClick: () => this.scene.start(Scene.MainMenu),
    });
  }

  private showStatInfo(text: string) {
    this.statInfoText.setText(text).setVisible(true);
    this.statInfoBg.setVisible(true);
  }

  private hideStatInfo() {
    this.statInfoText.setVisible(false);
    this.statInfoBg.setVisible(false);
  }

  private buildCard(
    cls: (typeof CLASSES)[0],
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, w, h, cls.locked ? BG_CARD_LOCKED : BG_MOVE_CARD, 0.95)
      .setStrokeStyle(2, cls.locked ? BORDER_CARD_LOCKED : BORDER_GOLD);

    const sprite = this.add
      .image(0, -h * 0.3, cls.spriteKey, cls.spriteFrame)
      .setScale(cls.locked ? 3 : 4)
      .setAlpha(cls.locked ? 0.3 : 1);

    const nameText = this.add
      .text(0, -h * 0.13, cls.name, {
        fontSize: FONT_LG,
        fontFamily: "EnchantedLand",
        color: cls.locked ? TXT_CLASS_LOCKED : TXT_GOLD,
      })
      .setOrigin(0.5);

    const statObjs: Phaser.GameObjects.GameObject[] = [];
    const statValues = [cls.stats.hp, cls.stats.atk, cls.stats.def, cls.stats.mag, 60];
    const iconScale = 0.72;
    const iconHalf = 16 * iconScale;
    const rowSpacing = 28;
    const statsStartY = -h * 0.06;
    const blockW = iconHalf * 2 + 8 + 70;
    const iconX = -blockW / 2 + iconHalf;
    const textX = iconX + iconHalf + 8;

    STAT_DEFS.forEach((stat, i) => {
      const sy = statsStartY + i * rowSpacing;
      const alpha = cls.locked ? 0.15 : 1;

      const icon = this.add.image(iconX, sy, stat.key).setScale(iconScale).setAlpha(alpha);

      const valueText = this.add
        .text(textX, sy, `${stat.label}  ${statValues[i]}`, {
          fontSize: FONT_SM,
          color: cls.locked ? TXT_CARD_LOCKED : TXT_GOLD_LIGHT,
        })
        .setOrigin(0, 0.5);

      if (!cls.locked) {
        const hitW = blockW + 20;
        const hit = this.add
          .rectangle(0, sy, hitW, 24, 0xffffff, 0)
          .setInteractive({ useHandCursor: false });

        hit.on("pointerover", () => {
          icon.setTint(TINT_GOLD);
          valueText.setColor(TXT_GOLD);
          this.showStatInfo(`${stat.label} — ${stat.desc}`);
        });
        hit.on("pointerout", () => {
          icon.clearTint();
          valueText.setColor(TXT_GOLD_LIGHT);
          this.hideStatInfo();
        });
        statObjs.push(icon, valueText, hit);
      } else {
        statObjs.push(icon, valueText);
      }
    });

    const descText = this.add
      .text(0, h * 0.22, cls.description, {
        fontSize: FONT_SM,
        color: cls.locked ? TXT_CARD_LOCKED : TXT_GOLD_LIGHT,
        align: "center",
        wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);

    const movesLabel = this.add
      .text(0, h * 0.35, "Moves", {
        fontSize: FONT_SM,
        fontFamily: "EnchantedLand",
        color: cls.locked ? TXT_CARD_LOCKED : TXT_MUTED,
      })
      .setOrigin(0.5);

    const movesText = this.add
      .text(0, h * 0.42, cls.moves.join("  ·  "), {
        fontSize: FONT_XS,
        color: cls.locked ? TXT_CARD_LOCKED : TXT_GOLD_WARM,
        align: "center",
        wordWrap: { width: w - 16 },
      })
      .setOrigin(0.5);

    if (cls.locked) {
      const lockText = this.add
        .text(0, 0, "COMING\nSOON", {
          fontSize: FONT_LG,
          fontFamily: "EnchantedLand",
          color: TXT_COMING_SOON,
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
        bg.setStrokeStyle(3, BORDER_GOLD_BRIGHT);
        bg.setFillStyle(BG_CARD_SELECTED);
      } else if (!CLASSES[i].locked) {
        bg.setStrokeStyle(2, BORDER_GOLD);
        bg.setFillStyle(BG_MOVE_CARD);
      }
    });
  }

  private confirm() {
    const cls = CLASSES[this.selectedIndex];
    if (cls.locked) return;

    MetaProgress.resetAll();
    GameState.runConfig = this.runConfig;
    // Set class before resetHero so defaultHero reads the right heroClasses entry.
    GameState.setSelectedClass(cls.id);
    GameState.resetHero(this.runConfig);
    GameState.clearRun();

    GameState.clearTreeState();
    this.scene.start(Scene.TreeMap);
  }
}
