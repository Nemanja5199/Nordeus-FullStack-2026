import Phaser from "phaser";
import { BG, BORDER, DOT, FONT, NODE, TXT } from "../../constants";
import type { MapTree } from "../../map";

// Sand background + edge vignettes for the tree map view.
export function drawTreeBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
): void {
  scene.add.tileSprite(0, 0, width, height, "bg_sand").setOrigin(0);
  scene.add.rectangle(0, 0, width, height, BG.SEPIA, 0.38).setOrigin(0);

  const g = scene.add.graphics();
  g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0.65, 0.65, 0, 0);
  g.fillRect(0, 0, width, height * 0.28);
  g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0, 0, 0.65, 0.65);
  g.fillRect(0, height * 0.72, width, height * 0.28);
  g.fillGradientStyle(BG.BLACK, BG.BLACK, BG.BLACK, BG.BLACK, 0.5, 0, 0, 0.5);
  g.fillRect(0, 0, width * 0.18, height);
}

// Tinted horizontal bands behind tier rows.
export function drawTierBands(
  scene: Phaser.Scene,
  treeLeft: number,
  treeW: number,
  positions: Record<string, { x: number; y: number }>,
  byLevel: Record<number, string[]>,
  height: number,
): void {
  const g = scene.add.graphics();
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

// Lines linking parent → child nodes, colored by completion state.
export function drawConnections(
  scene: Phaser.Scene,
  tree: MapTree,
  positions: Record<string, { x: number; y: number }>,
  completedIds: string[],
): void {
  const g = scene.add.graphics();

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

// Right-edge tier labels (TIER I / TIER II / BOSS).
export function drawTierLabels(
  scene: Phaser.Scene,
  treeRight: number,
  positions: Record<string, { x: number; y: number }>,
  byLevel: Record<number, string[]>,
): void {
  const labelX = treeRight - 4;
  const style = { fontSize: FONT.SM, fontFamily: "EnchantedLand", color: TXT.MUTED };

  const yAt = (level: number) => positions[byLevel[level]?.[0]]?.y ?? 0;
  const y12 = (yAt(1) + yAt(2)) / 2;
  const y34 = (yAt(3) + yAt(4)) / 2;
  const yB = yAt(5);

  scene.add.text(labelX, y12, "TIER I", style).setOrigin(1, 0.5);
  scene.add.text(labelX, y34, "TIER II", style).setOrigin(1, 0.5);
  scene.add.text(labelX, yB, "BOSS", { ...style, color: TXT.TIER_BOSS }).setOrigin(1, 0.5);
}
