import Phaser from "phaser";
import { GameState } from "../utils/gameState";
import { createHeroPanel } from "../ui/HeroPanel";
import { createButton, BTN_SM } from "../ui/Button";
import { MONSTER_FRAMES, SHOPKEEPER_FRAME } from "../utils/spriteFrames";
import { getNodeState } from "../utils/mockMapTree";
import type { MapTree, MapTreeNode, TreeNodeState } from "../utils/mockMapTree";
import {
  BG_BLACK,
  TXT_GOLD,
  TXT_GOLD_LIGHT,
  TXT_MUTED,
  TXT_DEFEATED,
  TXT_LOCKED,
  TXT_LOCKED_NAME,
  BG_SEPIA,
  BG_NODE_ACTIVE,
  BG_NODE_DEFEATED,
  BG_NODE_LOCKED,
  BORDER_GOLD_BRIGHT,
  BORDER_DEFEATED,
  BORDER_LOCKED,
  BORDER_HERO_BATTLE,
  BORDER_MON_BATTLE,
  DOT_PATH_DEFEATED,
  DOT_PATH_ACTIVE,
  BG_BTN_CLOSE,
  BG_NODE_SHOP,
  BG_NODE_SHOP_DONE,
  BG_NODE_SHOP_LOCKED,
  BORDER_SHOP,
  BORDER_SHOP_DONE,
  BORDER_SHOP_LOCKED,
  TXT_SHOP,
  TXT_SHOP_DONE,
  TXT_SHOP_LOCKED,
  STROKE_TITLE_DARK,
  TXT_BOSS,
  TXT_TIER_BOSS,
} from "../ui/colors";

const PANEL_W = 260;
const PANEL_H = 640;
const PANEL_GAP = 16;

const NODE_W = 96;
const NODE_H = 84;
const BOSS_W = 120;
const BOSS_H = 98;
const HOVER_SCALE = 1.35;

export class TreeMapScene extends Phaser.Scene {
  constructor() {
    super("TreeMapScene");
  }

  create() {
    const { width, height } = this.scale;
    GameState.loadTreeState();
    if (GameState.runConfig?.seed && !GameState.runSeed) {
      GameState.runSeed = GameState.runConfig.seed;
      GameState.saveTreeState();
    }

    this.drawBackground(width, height);

    this.add
      .text(width / 2, height * 0.06, "The Gauntlet", {
        fontSize: "76px",
        fontFamily: "EnchantedLand",
        color: TXT_GOLD,
        stroke: STROKE_TITLE_DARK,
        strokeThickness: 10,
        shadow: { offsetX: 4, offsetY: 4, color: "#000000", blur: 8, fill: true },
      })
      .setOrigin(0.5);

    createButton(this, width - 70, 28, {
      ...BTN_SM,
      width: 120,
      height: 45,
      fontSize: "17px",
      label: "SAVE & EXIT",
      color: BG_BTN_CLOSE,
      onClick: () => {
        this.scene.stop("MoveManagementScene");
        GameState.saveHero();
        GameState.saveTreeState();
        this.scene.start("MainMenuScene");
      },
    });

    createHeroPanel(this, {
      x: PANEL_GAP,
      y: (height - PANEL_H) / 2,
      width: PANEL_W,
      height: PANEL_H,
      hero: GameState.hero,
      xpToNextLevel: Math.floor(GameState.hero.level * GameState.hero.level * 60),
      moves: GameState.runConfig?.moves ?? {},
      onManageMoves: () => {
        this.scene.stop("MoveManagementScene");
        this.scene.launch("MoveManagementScene", { returnScene: "TreeMapScene" });
        this.scene.bringToTop("MoveManagementScene");
      },
      onManageEquipment: () => {
        this.scene.stop("EquipmentScene");
        this.scene.launch("EquipmentScene", { returnScene: "TreeMapScene" });
        this.scene.bringToTop("EquipmentScene");
      },
    });

    this.drawTree(width, height);
  }

  private drawBackground(width: number, height: number) {
    this.add.tileSprite(0, 0, width, height, "bg_sand").setOrigin(0);
    this.add.rectangle(0, 0, width, height, BG_SEPIA, 0.38).setOrigin(0);

    const g = this.add.graphics();
    g.fillGradientStyle(BG_BLACK, BG_BLACK, BG_BLACK, BG_BLACK, 0.65, 0.65, 0, 0);
    g.fillRect(0, 0, width, height * 0.28);
    g.fillGradientStyle(BG_BLACK, BG_BLACK, BG_BLACK, BG_BLACK, 0, 0, 0.65, 0.65);
    g.fillRect(0, height * 0.72, width, height * 0.28);
    g.fillGradientStyle(BG_BLACK, BG_BLACK, BG_BLACK, BG_BLACK, 0.5, 0, 0, 0.5);
    g.fillRect(0, 0, width * 0.18, height);
  }

  private drawTree(width: number, height: number) {
    const tree = GameState.runConfig!.mapTree;
    const completed = GameState.completedNodes;
    const currentNode = GameState.currentNode;

    const treeLeft = PANEL_GAP + PANEL_W + 24;
    const treeRight = width - PANEL_GAP - 8;
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

    g.fillStyle(BORDER_GOLD_BRIGHT, bandAlpha);
    g.fillRect(treeLeft, y1 - bandPad, treeW, midTier2 - y1 + bandPad);

    g.fillStyle(BORDER_HERO_BATTLE, bandAlpha);
    g.fillRect(treeLeft, midTier2, treeW, midBoss - midTier2);

    g.fillStyle(BORDER_MON_BATTLE, bandAlpha);
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
          color = DOT_PATH_DEFEATED;
          alpha = 1.0;
          lineW = 3;
        } else if (nodeComplete) {
          color = DOT_PATH_ACTIVE;
          alpha = 0.9;
          lineW = 2;
        } else {
          color = BORDER_LOCKED;
          alpha = 0.65;
          lineW = 3;
        }

        const childNode = tree.nodes[childId];
        const fromY = from.y + (node.level === 5 ? BOSS_H : NODE_H) / 2;
        const toY = to.y - (childNode?.level === 5 ? BOSS_H : NODE_H) / 2;

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
    const style = { fontSize: "12px", fontFamily: "EnchantedLand", color: TXT_MUTED };

    const yAt = (level: number) => positions[byLevel[level]?.[0]]?.y ?? 0;
    const y12 = (yAt(1) + yAt(2)) / 2;
    const y34 = (yAt(3) + yAt(4)) / 2;
    const yB = yAt(5);

    this.add.text(labelX, y12, "TIER I", style).setOrigin(1, 0.5);
    this.add.text(labelX, y34, "TIER II", style).setOrigin(1, 0.5);
    this.add.text(labelX, yB, "BOSS", { ...style, color: TXT_TIER_BOSS }).setOrigin(1, 0.5);
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
    const nodeW = isBoss ? BOSS_W : NODE_W;
    const nodeH = isBoss ? BOSS_H : NODE_H;

    const fillColor = isShop
      ? state === "completed"
        ? BG_NODE_SHOP_DONE
        : state === "available"
          ? BG_NODE_SHOP
          : BG_NODE_SHOP_LOCKED
      : state === "completed"
        ? BG_NODE_DEFEATED
        : state === "available"
          ? BG_NODE_ACTIVE
          : BG_NODE_LOCKED;
    const strokeColor = isShop
      ? state === "completed"
        ? BORDER_SHOP_DONE
        : state === "available"
          ? BORDER_SHOP
          : BORDER_SHOP_LOCKED
      : state === "completed"
        ? BORDER_DEFEATED
        : state === "available"
          ? BORDER_GOLD_BRIGHT
          : BORDER_LOCKED;
    const glowColor = isShop ? BORDER_SHOP : BORDER_GOLD_BRIGHT;
    const nameColor = isShop
      ? state === "completed"
        ? TXT_SHOP_DONE
        : state === "available"
          ? TXT_SHOP
          : TXT_SHOP_LOCKED
      : state === "completed"
        ? TXT_DEFEATED
        : state === "available"
          ? TXT_GOLD
          : TXT_LOCKED_NAME;
    const statusLabel =
      state === "completed"
        ? isShop
          ? "✓ Done"
          : "Replay"
        : state === "available"
          ? isBoss
            ? "FINAL BOSS"
            : isShop
              ? "Visit"
              : "Fight!"
          : "?";
    const statusColor =
      state === "completed"
        ? isShop
          ? TXT_SHOP_DONE
          : TXT_DEFEATED
        : state === "available"
          ? isBoss
            ? TXT_BOSS
            : isShop
              ? TXT_SHOP
              : TXT_GOLD_LIGHT
          : TXT_LOCKED;

    // ── Container — all children use LOCAL coords ─────────────────────────
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
          fontSize: "14px",
          fontFamily: "EnchantedLand",
          color: nameColor,
          stroke: "#000000",
          strokeThickness: 4,
          shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 4, fill: true },
        })
        .setOrigin(0.5),
    );

    container.add(
      this.add
        .text(0, nodeH / 2 - 12, statusLabel, {
          fontSize: "12px",
          fontFamily: "EnchantedLand",
          color: statusColor,
        })
        .setOrigin(0.5),
    );

    const isClickable = (state === "available" || state === "completed") && !isShop;

    // ── Hover expand / shrink ──────────────────────────────────────────────
    bg.setInteractive({ useHandCursor: isClickable });

    bg.on("pointerover", () => {
      this.children.bringToTop(container);
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scaleX: HOVER_SCALE,
        scaleY: HOVER_SCALE,
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
        this.scene.stop("MoveManagementScene");
        this.scene.start("BattleScene", {
          monster,
          monsterIndex,
          defeatedIds: GameState.completedNodes,
          sourceScene: "TreeMapScene",
          nodeId: node.id,
        });
      });
    }
  }
}
