import Phaser from "phaser";
import { Scene, FONT, HERO_PANEL, XP_CURVE_FACTOR } from "../constants";
import {
  createHeroPanel,
  createButton,
  BTN_SM,
  MapNode,
  drawTreeBackground,
  drawTierBands,
  drawConnections,
  drawTierLabels,
} from "../ui";
import { GameState } from "../state";
import { Audio, TrackGroup } from "../audio";
import { getNodeState } from "../map";
import type { MapTree } from "../map";
import { BG, TXT, STROKE_TITLE_DARK } from "../constants";

export class TreeMapScene extends Phaser.Scene {
  private heroPanelContainer!: Phaser.GameObjects.Container;

  constructor() {
    super(Scene.TreeMap);
  }

  create() {
    const { width, height } = this.scale;
    Audio.play(this, TrackGroup.Map);
    GameState.loadTreeState();
    if (GameState.runConfig?.seed && !GameState.runSeed) {
      GameState.runSeed = GameState.runConfig.seed;
      GameState.saveTreeState();
    }

    drawTreeBackground(this, width, height);

    this.add
      .text(width / 2, height * 0.06, "The Gauntlet", {
        fontSize: FONT.MAP_TITLE,
        fontFamily: "EnchantedLand",
        color: TXT.GOLD,
        stroke: STROKE_TITLE_DARK,
        strokeThickness: 10,
        shadow: { offsetX: 4, offsetY: 4, color: TXT.BLACK, blur: 8, fill: true },
      })
      .setOrigin(0.5);

    createButton(this, width - 100, 28, {
      ...BTN_SM,
      width: 170,
      height: 45,
      fontSize: FONT.MD,
      label: "SAVE & EXIT",
      color: BG.BTN_CLOSE,
      onClick: () => {
        this.scene.stop(Scene.MoveManagement);
        GameState.saveHero();
        GameState.saveTreeState();
        this.scene.start(Scene.MainMenu);
      },
    });

    this.heroPanelContainer = this.buildHeroPanel();
    this.events.on("refreshHeroPanel", this.refreshHeroPanel, this);

    this.drawTree(width, height);
  }

  private buildHeroPanel(): Phaser.GameObjects.Container {
    const { height } = this.scale;
    return createHeroPanel(this, {
      x: HERO_PANEL.GAP,
      y: (height - HERO_PANEL.H) / 2,
      width: HERO_PANEL.W,
      height: HERO_PANEL.H,
      hero: GameState.hero,
      xpToNextLevel: Math.floor(GameState.hero.level * GameState.hero.level * XP_CURVE_FACTOR),
      moves: GameState.runConfig?.moves ?? {},
      items: GameState.runConfig?.items ?? {},
      onManageMoves: () => {
        this.scene.stop(Scene.MoveManagement);
        this.scene.launch(Scene.MoveManagement, { returnScene: Scene.TreeMap });
        this.scene.bringToTop(Scene.MoveManagement);
      },
      onManageEquipment: () => {
        this.scene.stop(Scene.Equipment);
        this.scene.launch(Scene.Equipment, { returnScene: Scene.TreeMap });
        this.scene.bringToTop(Scene.Equipment);
      },
      onShop: () => {
        this.scene.stop(Scene.Shop);
        this.scene.launch(Scene.Shop, { returnScene: Scene.TreeMap });
        this.scene.bringToTop(Scene.Shop);
      },
    });
  }

  private refreshHeroPanel(): void {
    this.heroPanelContainer.destroy(true);
    this.heroPanelContainer = this.buildHeroPanel();
  }

  private drawTree(width: number, height: number) {
    const tree = GameState.runConfig!.mapTree;
    const completed = GameState.completedNodes;
    const currentNode = GameState.currentNode;

    const treeLeft = HERO_PANEL.GAP + HERO_PANEL.W + 24;
    const treeRight = width - HERO_PANEL.GAP - 8;
    const treeW = treeRight - treeLeft;
    const treeTop = height * 0.22;
    const treeBot = height * 0.85;
    const treeH = treeBot - treeTop;

    const { positions, byLevel } = this.computePositions(tree, treeLeft, treeW, treeTop, treeH);

    drawTierBands(this, treeLeft, treeW, positions, byLevel, height);
    drawConnections(this, tree, positions, completed);
    drawTierLabels(this, treeRight, positions, byLevel);

    for (const node of Object.values(tree.nodes)) {
      const pos = positions[node.id];
      const state = getNodeState(node.id, tree, completed, currentNode);
      const label =
        node.type === "shop"
          ? "Merchant"
          : (GameState.runConfig!.monsters.find((m) => m.id === node.monsterId)?.name ??
            node.monsterId ??
            "?");
      new MapNode(this, pos.x, pos.y, node, label, state, {
        onClick: () => {
          const monster = GameState.runConfig!.monsters.find((m) => m.id === node.monsterId);
          if (!monster) return;
          const monsterIndex = GameState.runConfig!.monsters.indexOf(monster);
          this.scene.stop(Scene.MoveManagement);
          this.scene.start(Scene.Battle, {
            monster,
            monsterIndex,
            defeatedIds: GameState.completedNodes,
            sourceScene: Scene.TreeMap,
            nodeId: node.id,
            levelBand: node.levelBand,
          });
        },
      });
    }
  }

  private computePositions(
    tree: MapTree,
    treeLeft: number,
    treeW: number,
    treeTop: number,
    treeH: number,
  ): { positions: Record<string, { x: number; y: number }>; byLevel: Record<number, string[]> } {
    const byLevel: Record<number, string[]> = {};
    for (const node of Object.values(tree.nodes)) {
      if (!byLevel[node.level]) byLevel[node.level] = [];
      byLevel[node.level].push(node.id);
    }

    const levelYFracs: Record<number, number> = { 1: 1.0, 2: 0.76, 3: 0.51, 4: 0.27, 5: 0 };
    const positions: Record<string, { x: number; y: number }> = {};

    for (const [lvlStr, ids] of Object.entries(byLevel)) {
      const level = parseInt(lvlStr);
      const y = treeTop + treeH * (levelYFracs[level] ?? 0);
      ids.forEach((id, i) => {
        positions[id] = {
          x: treeLeft + treeW * ((i + 1) / (ids.length + 1)),
          y,
        };
      });
    }

    return { positions, byLevel };
  }
}
