import Phaser from "phaser";
import { BG, BORDER, FONT, NODE, TXT } from "../../constants";
import { MONSTER_FRAMES, SHOPKEEPER_FRAME } from "../../sprites";
import type { MapTreeNode, TreeNodeState } from "../../map";

export interface MapNodeCallbacks {
  onClick: () => void;
}

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

export class MapNode {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    node: MapTreeNode,
    displayName: string,
    state: TreeNodeState,
    cb: MapNodeCallbacks,
  ) {
    const isShop = node.type === "shop";
    const isBoss = node.type === "boss" || node.level === 5;
    const nodeW = isBoss ? NODE.BOSS_W : NODE.W;
    const nodeH = isBoss ? NODE.BOSS_H : NODE.H;

    const { fillColor, strokeColor, glowColor, nameColor, statusLabel, statusColor } =
      getNodeColors(isShop, isBoss, state);

    const container = scene.add.container(x, y);

    if (state === "available") {
      container.add(
        scene.add
          .rectangle(0, 0, nodeW + 8, nodeH + 8, glowColor, 0.1)
          .setStrokeStyle(1, glowColor, 0.4),
      );
    }

    const bg = scene.add
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
        scene.add
          .image(0, -6, spriteFrame.key, spriteFrame.frame)
          .setScale(isBoss ? 2.6 : 2.1)
          .setAlpha(state === "completed" ? 0.55 : state === "locked" ? 0.2 : 1)
          .setOrigin(0.5),
      );
    }

    container.add(
      scene.add
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
      scene.add
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
      scene.children.bringToTop(container);
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: NODE.HOVER_SCALE,
        scaleY: NODE.HOVER_SCALE,
        duration: 140,
        ease: "Back.easeOut",
      });
    });
    bg.on("pointerout", () => {
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: "Power2",
      });
    });

    if (isClickable) {
      bg.on("pointerdown", cb.onClick);
    }
  }
}
