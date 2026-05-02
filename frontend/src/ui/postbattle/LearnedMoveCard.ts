import Phaser from "phaser";
import { BG, BORDER, FONT, TXT } from "../../constants";
import type { MoveConfig } from "../../types/game";

// Small card shown on victory when a new move was dropped. Hovering the
// card reveals the move description in a slot below it.
export class LearnedMoveCard {
  static readonly H = 52;

  constructor(scene: Phaser.Scene, cx: number, y: number, move: MoveConfig) {
    const cardH = LearnedMoveCard.H;

    const cardBg = scene.add
      .rectangle(cx, y + cardH / 2, 380, cardH, BG.HERO_BATTLE, 0.92)
      .setStrokeStyle(2, BORDER.HERO_BATTLE);

    scene.add
      .text(cx, y + 14, `New move learned:  ${move.name}`, {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.DEFEATED,
      })
      .setOrigin(0.5);
    scene.add
      .text(cx, y + 34, `[${move.moveType}]`, { fontSize: FONT.SM, color: TXT.MUTED })
      .setOrigin(0.5);

    const descText = scene.add
      .text(cx, y + cardH + 16, "", {
        fontSize: FONT.SM,
        color: TXT.HERO,
        wordWrap: { width: 380 },
        align: "center",
      })
      .setOrigin(0.5);

    cardBg.setInteractive({ useHandCursor: false });
    cardBg.on("pointerover", () => descText.setText(move.description));
    cardBg.on("pointerout", () => descText.setText(""));
  }
}
