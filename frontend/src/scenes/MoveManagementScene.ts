import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import {
  createModalFooter,
  TooltipManager,
  LearnedMovesPanel,
  EquippedMovesPanel,
  StatPointsPanel,
  type StatPointKey,
} from "../ui";
import { GameState } from "../state";
import type { MoveConfig } from "../types/game";
import { buildMoveStatLines } from "../combat";
import { BG, BORDER, TXT } from "../constants";

interface MoveManagementData {
  returnScene: SceneKey;
}

export class MoveManagementScene extends Phaser.Scene {
  private selectedLearnedIndex = -1;
  private selectedEquippedSlot = -1;
  private learnedPanel?: LearnedMovesPanel;
  private equippedPanel?: EquippedMovesPanel;
  private infoText!: Phaser.GameObjects.Text;
  private tooltip!: TooltipManager;
  private returnScene!: SceneKey;

  constructor() {
    super(Scene.MoveManagement);
  }

  create(data: MoveManagementData) {
    this.returnScene = data.returnScene ?? Scene.TreeMap;
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.learnedPanel?.scroll.destroy();
    this.learnedPanel = undefined;
    this.equippedPanel = undefined;

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG.DARKEST, 0.97).setOrigin(0).setInteractive();

    this.add
      .text(width / 2, 34, "MOVE MANAGEMENT", {
        fontSize: FONT.TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: TXT.STROKE_HEADER,
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const colLearnedX = width * 0.22;
    const colEquippedX = width * 0.5;
    const colStatsX = width * 0.78;

    this.add.text(colLearnedX, 90, "LEARNED MOVES", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_MID }).setOrigin(0.5);
    this.add.text(colEquippedX, 90, "EQUIPPED SLOTS", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_MID }).setOrigin(0.5);
    this.add.text(colStatsX, 90, "STAT POINTS", { fontSize: FONT.BODY, fontFamily: "EnchantedLand", color: TXT.GOLD_MID }).setOrigin(0.5);

    const divAlpha = 0.25;
    const divTop = 90;
    const divBot = height - 80;
    this.add.rectangle(width * 0.36, (divTop + divBot) / 2, 1, divBot - divTop, BORDER.GOLD, divAlpha);
    this.add.rectangle(width * 0.64, (divTop + divBot) / 2, 1, divBot - divTop, BORDER.GOLD, divAlpha);

    this.infoText = createModalFooter(this, {
      hint: "Hover a move to see its description.",
      onClose: () => {
        this.scene.get(this.returnScene)?.events.emit("refreshHeroPanel");
        this.scene.stop();
      },
    });
    this.tooltip = new TooltipManager(this, this.infoText);

    const moves = GameState.runConfig!.moves;
    this.learnedPanel = new LearnedMovesPanel(
      this,
      colLearnedX,
      GameState.hero.learnedMoves,
      moves,
      GameState.hero.equippedMoves,
      {
        onSelect: (i, moveId) => this.selectLearned(i, moveId),
        onHover: (move) => this.showMoveTooltip(move),
        onHoverEnd: () => this.tooltip.clear(),
      },
    );

    this.equippedPanel = new EquippedMovesPanel(
      this,
      colEquippedX,
      GameState.hero.equippedMoves,
      moves,
      {
        onSelect: (slot) => this.selectEquipped(slot),
        onHover: (move) => this.showMoveTooltip(move),
        onHoverEnd: () => this.tooltip.clear(),
      },
    );

    new StatPointsPanel(
      this,
      colStatsX,
      {
        attack: GameState.hero.attack,
        defense: GameState.hero.defense,
        magic: GameState.hero.magic,
        maxHp: GameState.hero.maxHp,
        skillPoints: GameState.hero.skillPoints ?? 0,
      },
      { onSpend: (key) => this.spendSkillPoint(key) },
    );
  }

  private spendSkillPoint(key: StatPointKey) {
    GameState.spendSkillPoint(key);
    this.children.removeAll(true);
    this.create({ returnScene: this.returnScene });
  }

  private showMoveTooltip(move: MoveConfig): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const baseY = height - 148;

    this.tooltip.begin();
    this.tooltip.addText(cx, baseY, move.description, {
      fontSize: FONT.SM,
      color: TXT.MUTED,
      wordWrap: { width: width * 0.75 },
      align: "center",
    });
    this.tooltip.addHorizontalRow(buildMoveStatLines(move), baseY + 26, FONT.LG);
  }

  private selectLearned(index: number, moveId: string) {
    this.selectedLearnedIndex = index;
    this.selectedEquippedSlot = -1;
    this.learnedPanel?.highlightSelected(index);
    this.equippedPanel?.highlightSelected(-1);

    const name = GameState.runConfig!.moves[moveId]?.name;
    this.infoText.setText(`"${name}" selected — click an equipped slot to place it.`);
    this.trySwap(moveId);
  }

  private selectEquipped(slot: number) {
    this.selectedEquippedSlot = slot;
    this.equippedPanel?.highlightSelected(slot);

    if (this.selectedLearnedIndex >= 0) {
      const moveId = GameState.hero.learnedMoves[this.selectedLearnedIndex];
      this.trySwap(moveId);
    }
  }

  private trySwap(moveId: string) {
    if (this.selectedEquippedSlot < 0) return;

    const targetSlot = this.selectedEquippedSlot;
    const existingSlot = GameState.hero.equippedMoves.indexOf(moveId);

    if (existingSlot === targetSlot) {
      this.selectedLearnedIndex = -1;
      this.selectedEquippedSlot = -1;
      return;
    }

    if (existingSlot >= 0) {
      const displaced = GameState.hero.equippedMoves[targetSlot];
      GameState.equipMove(existingSlot, displaced);
    }

    GameState.equipMove(targetSlot, moveId);
    this.selectedLearnedIndex = -1;
    this.selectedEquippedSlot = -1;
    this.children.removeAll(true);
    this.create({ returnScene: this.returnScene });
  }
}
