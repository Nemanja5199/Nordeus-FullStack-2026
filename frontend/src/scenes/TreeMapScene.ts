import Phaser from "phaser";
import { Scene, FONT, HERO_PANEL, NODE, XP_CURVE_FACTOR } from "../constants";
import { createHeroPanel, createButton, BTN_SM } from "../ui";
import { GameState } from "../state";
import { Audio, TrackGroup } from "../audio";
import { MONSTER_FRAMES, SHOPKEEPER_FRAME } from "../sprites";
import { getNodeState } from "../map";
import type { MapTree, MapTreeNode, TreeNodeState } from "../map";
import { BG, TXT, BORDER, DOT, STROKE_TITLE_DARK } from "../constants";

interface NodeColors {
  fillColor: number;
  strokeColor: number;
  glowColor: number;
  nameColor: string;
  statusLabel: string;
  statusColor: string;
}

function getNodeColors(isShop: boolean, isBoss: boolean, state: TreeNodeState): NodeColors {
  const fillColor = isShop
    ? state === "completed" ? BG.NODE_SHOP_DONE : state === "available" ? BG.NODE_SHOP : BG.NODE_SHOP_LOCKED
    : state === "completed" ? BG.NODE_DEFEATED : state === "available" ? BG.NODE_ACTIVE : BG.NODE_LOCKED;

  const strokeColor = isShop
    ? state === "completed" ? BORDER.SHOP_DONE : state === "available" ? BORDER.SHOP : BORDER.SHOP_LOCKED
    : state === "completed" ? BORDER.DEFEATED : state === "available" ? BORDER.GOLD_BRIGHT : BORDER.LOCKED;

  const glowColor = isShop ? BORDER.SHOP : BORDER.GOLD_BRIGHT;

  const nameColor = isShop
    ? state === "completed" ? TXT.SHOP_DONE : state === "available" ? TXT.SHOP : TXT.SHOP_LOCKED
    : state === "completed" ? TXT.DEFEATED : state === "available" ? TXT.GOLD : TXT.LOCKED_NAME;

  const statusLabel =
    state === "completed"
      ? isShop ? "✓ Done" : "Replay"
      : state === "available"
        ? isBoss ? "FINAL BOSS" : isShop ? "Visit" : "Fight!"
        : "?";

  const statusColor =
    state === "completed"
      ? isShop ? TXT.SHOP_DONE : TXT.DEFEATED
      : state === "available"
        ? isBoss ? TXT.BOSS : isShop ? TXT.SHOP : TXT.GOLD_LIGHT
        : TXT.LOCKED;

  return { fillColor, strokeColor, glowColor, nameColor, statusLabel, statusColor };
}

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

    this.drawBackground(width, height);

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

  private drawBackground(width: number, height: number) {
    this.add.tileSprite(0, 0, width, height, "bg_sand").setOrigin(0);
    this.add.rectangle(0, 0, width, height, BG.SEPIA, 0.38).setOrigin(0);

    const g = this.add.graphics();
    g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0.65, 0.65, 0, 0);
    g.fillRect(0, 0, width, height * 0.28);
    g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0, 0, 0.65, 0.65);
    g.fillRect(0, height * 0.72, width, height * 0.28);
    g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0.5, 0, 0, 0.5);
    g.fillRect(0, 0, width * 0.18, height);
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

    this.drawTierBands(treeLeft, treeW, positions, byLevel, height);
    this.drawConnections(tree, positions, completed);
    this.drawTierLabels(treeRight, positions, byLevel);

    for (const node of Object.values(tree.nodes)) {
      const pos = positions[node.id];
      const state = getNodeState(node.id, tree, completed, currentNode);
      const label =
        node.type === "shop"
          ? "Merchant"
          : (GameState.runConfig!.monsters.find((m) => m.id === node.monsterId)?.name ??
            node.monsterId ??
            "?");
      this.drawNode(pos.x, pos.y, node, label, state);
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

  private drawTierBands(
    treeLeft: number,
    treeW: number,
    positions: Record<string, { x: number; y: number }>,
    byLevel: Record<number, string[]>,
    height: number,
  ) {
    const g = this.add.graphics();
    const bandAlpha = 0.06;

    const yAt = (level: number) => positions[byLevel[level]?.[0]]?.y ?? 0;
    const y1 = yAt(1),
      y2 = yAt(2),
      y3 = yAt(3),
      y4 = yAt(4),
      yB = yAt(5);

    const midTier2 = (y2 + y3) / 2;
    const midBoss = (y4 + yB) / 2;
    const bandPad = 40;

    g.fillStyle(BORDER.GOLD_BRIGHT, bandAlpha);
    g.fillRect(treeLeft, y1 - bandPad, treeW, midTier2 - y1 + bandPad);

    g.fillStyle(BORDER.HERO_BATTLE, bandAlpha);
    g.fillRect(treeLeft, midTier2, treeW, midBoss - midTier2);

    g.fillStyle(BORDER.MON_BATTLE, bandAlpha);
    g.fillRect(treeLeft, midBoss, treeW, height - midBoss);
  }

  private drawConnections(
    tree: MapTree,
    positions: Record<string, { x: number; y: number }>,
    completedIds: string[],
  ) {
    const g = this.add.graphics();

    for (const node of Object.values(tree.nodes)) {
      const from = positions[node.id];
      const nodeComplete = completedIds.includes(node.id);

      for (const childId of node.children) {
        const to = positions[childId];
        const childComplete = completedIds.includes(childId);

        let color: number, alpha: number, lineW: number;
        if (nodeComplete && childComplete) {
          color = DOT.PATH_DEFEATED;
          alpha = 1.0;
          lineW = 3;
        } else if (nodeComplete) {
          color = DOT.PATH_ACTIVE;
          alpha = 0.9;
          lineW = 2;
        } else {
          color = BORDER.LOCKED;
          alpha = 0.65;
          lineW = 3;
        }

        const childNode = tree.nodes[childId];
        const fromY = from.y + (node.level === 5 ? NODE.BOSS_H : NODE.H) / 2;
        const toY = to.y - (childNode?.level === 5 ? NODE.BOSS_H : NODE.H) / 2;

        g.lineStyle(lineW, color, alpha);
        g.beginPath();
        g.moveTo(from.x, fromY);
        g.lineTo(to.x, toY);
        g.strokePath();
      }
    }
  }

  private drawTierLabels(
    treeRight: number,
    positions: Record<string, { x: number; y: number }>,
    byLevel: Record<number, string[]>,
  ) {
    const labelX = treeRight - 4;
    const style = { fontSize: FONT.SM, fontFamily: "EnchantedLand", color: TXT.MUTED };

    const yAt = (level: number) => positions[byLevel[level]?.[0]]?.y ?? 0;
    const y12 = (yAt(1) + yAt(2)) / 2;
    const y34 = (yAt(3) + yAt(4)) / 2;
    const yB = yAt(5);

    this.add.text(labelX, y12, "TIER I", style).setOrigin(1, 0.5);
    this.add.text(labelX, y34, "TIER II", style).setOrigin(1, 0.5);
    this.add.text(labelX, yB, "BOSS", { ...style, color: TXT.TIER_BOSS }).setOrigin(1, 0.5);
  }

  private drawNode(
    x: number,
    y: number,
    node: MapTreeNode,
    displayName: string,
    state: TreeNodeState,
  ) {
    const isShop = node.type === "shop";
    const isBoss = node.type === "boss" || node.level === 5;
    const nodeW = isBoss ? NODE.BOSS_W : NODE.W;
    const nodeH = isBoss ? NODE.BOSS_H : NODE.H;

    const { fillColor, strokeColor, glowColor, nameColor, statusLabel, statusColor } =
      getNodeColors(isShop, isBoss, state);

    const container = this.add.container(x, y);

    if (state === "available") {
      container.add(
        this.add
          .rectangle(0, 0, nodeW + 8, nodeH + 8, glowColor, 0.1)
          .setStrokeStyle(1, glowColor, 0.4),
      );
    }

    const bg = this.add
      .rectangle(0, 0, nodeW, nodeH, fillColor, 0.92)
      .setStrokeStyle(state === "available" ? 2 : 1, strokeColor);
    container.add(bg);

    const spriteFrame = isShop
      ? SHOPKEEPER_FRAME
      : node.monsterId
        ? MONSTER_FRAMES[node.monsterId]
        : null;
    if (spriteFrame) {
      container.add(
        this.add
          .image(0, -6, spriteFrame.key, spriteFrame.frame)
          .setScale(isBoss ? 2.6 : 2.1)
          .setAlpha(state === "completed" ? 0.55 : state === "locked" ? 0.2 : 1)
          .setOrigin(0.5),
      );
    }

    container.add(
      this.add
        .text(0, -nodeH / 2 - 14, displayName, {
          fontSize: FONT.SM,
          fontFamily: "EnchantedLand",
          color: nameColor,
          stroke: "#000000",
          strokeThickness: 4,
          shadow: { offsetX: 2, offsetY: 2, color: TXT.BLACK, blur: 4, fill: true },
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add
        .text(0, nodeH / 2 - 12, statusLabel, {
          fontSize: FONT.SM,
          fontFamily: "EnchantedLand",
          color: statusColor,
        })
        .setOrigin(0.5),
    );

    const isClickable = (state === "available" || state === "completed") && !isShop;

    bg.setInteractive({ useHandCursor: isClickable });

    bg.on("pointerover", () => {
      this.children.bringToTop(container);
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scaleX: NODE.HOVER_SCALE,
        scaleY: NODE.HOVER_SCALE,
        duration: 140,
        ease: "Back.easeOut",
      });
    });
    bg.on("pointerout", () => {
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: "Power2",
      });
    });

    if (isClickable) {
      bg.on("pointerdown", () => {
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
      });
    }
  }
}