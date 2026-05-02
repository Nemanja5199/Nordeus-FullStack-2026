import Phaser from "phaser";
import { Scene, FONT } from "../constants";
import { createButton, BTN_MD, ClassCard, type ClassCardData } from "../ui";
import { GameState, MetaProgress } from "../state";
import { HERO_FRAMES } from "../sprites";
import type { RunConfig } from "../types/game";
import { BG, BORDER, TXT } from "../constants";

interface CharacterSelectData {
  runConfig: RunConfig;
}

// Display-only — the run uses HERO_CLASSES from the backend. Keep numbers
// in sync with backend/app/data/hero.py.
const CLASSES: ClassCardData[] = [
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
  { key: "stat_hp",  label: "HP",  desc: "Health Points — how much damage you can take before dying." },
  { key: "stat_atk", label: "ATK", desc: "Attack — raw physical damage dealt to enemies each hit." },
  { key: "stat_def", label: "DEF", desc: "Defense — reduces incoming physical damage from enemies." },
  { key: "stat_mag", label: "MAG", desc: "Magic — power of spells, buffs, and magical abilities." },
  { key: "stat_mp",  label: "MP",  desc: "Mana — spent on abilities, regens 15 per turn. Always starts at 60." },
] as const;

export class CharacterSelectScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: ClassCard[] = [];
  private runConfig!: RunConfig;
  private statInfoText!: Phaser.GameObjects.Text;
  private statInfoBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(Scene.CharacterSelect);
  }

  create(data: CharacterSelectData) {
    this.runConfig = data.runConfig;
    this.selectedIndex = 0;
    this.cards = [];

    const { width, height } = this.scale;

    this.add.tileSprite(0, 0, width, height, "bg_brick").setOrigin(0);
    this.add.rectangle(0, 0, width, height, BG.BLACK, 0.68).setOrigin(0);

    this.add
      .text(width / 2, height * 0.08, "Choose Your Hero", {
        fontSize: FONT.SCENE_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_TITLE,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.15, "Your choice defines your playstyle for the entire run.", {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.MUTED,
      })
      .setOrigin(0.5);

    const n = CLASSES.length;
    const cardW = Math.min(280, (width - 160) / Math.max(n, 3));
    const cardH = height * 0.6;
    const gap = Math.max(40, (width - cardW * n) / (n + 1));
    const totalW = cardW * n + gap * (n - 1);
    const startX = width / 2 - totalW / 2 + cardW / 2;

    CLASSES.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
      const y = height * 0.49;
      const card = new ClassCard(this, x, y, cardW, cardH, cls, STAT_DEFS, i, {
        onSelect: (idx) => {
          this.selectedIndex = idx;
          this.highlightCard(idx);
        },
        onStatHover: (text) => this.showStatInfo(text),
        onStatHoverEnd: () => this.hideStatInfo(),
      });
      this.cards.push(card);
    });

    this.highlightCard(0);

    this.statInfoBg = this.add
      .rectangle(width / 2, height * 0.835, width * 0.55, 32, BG.MOVE_CARD, 0.92)
      .setStrokeStyle(1, BORDER.GOLD)
      .setVisible(false);
    this.statInfoText = this.add
      .text(width / 2, height * 0.835, "", {
        fontSize: FONT.SM,
        color: TXT.GOLD_LIGHT,
        align: "center",
      })
      .setOrigin(0.5)
      .setVisible(false);

    createButton(this, width / 2 + 140, height * 0.9, {
      ...BTN_MD,
      label: "START RUN",
      color: BG.BTN_SUCCESS,
      onClick: () => this.confirm(),
    });
    createButton(this, width / 2 - 140, height * 0.9, {
      ...BTN_MD,
      label: "BACK",
      color: BG.BTN_NEUTRAL,
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

  private highlightCard(index: number) {
    this.cards.forEach((card, i) => {
      card.setSelected(i === index, CLASSES[i].locked);
    });
  }

  private confirm() {
    const cls = CLASSES[this.selectedIndex];
    if (cls.locked) return;

    MetaProgress.resetAll();
    GameState.runConfig = this.runConfig;
    GameState.setSelectedClass(cls.id);
    GameState.resetHero(this.runConfig);
    GameState.clearRun();

    GameState.clearTreeState();
    this.scene.start(Scene.TreeMap);
  }
}
