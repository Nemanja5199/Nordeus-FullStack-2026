import Phaser from "phaser";
import { BATTLE, BG, BAR, BORDER, FONT, HP_GHOST, TXT } from "../constants";
import { MONSTER_FRAMES } from "../sprites";
import type { MonsterConfig } from "../types/game";

const BAR_W = BATTLE.PANEL_W - 24;

// Mirror of BattleHeroPanel for the right-side monster card. No mana bar
// (monsters don't pay mana), no stat preview (no equipment system),
// gains an intent line that hints what the monster will do next turn.
export class BattleMonsterPanel {
  readonly sprite: Phaser.GameObjects.Image;

  private hpFill: Phaser.GameObjects.Rectangle;
  private hpGhost: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private buffText: Phaser.GameObjects.Text;
  private intentText: Phaser.GameObjects.Text;

  private barLeft: number;
  private barY: number;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    width: number,
    height: number,
    monsterCfg: MonsterConfig,
    scaledStats: { attack: number; defense: number; magic: number },
  ) {
    this.scene = scene;
    const panelH = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.8;

    scene.add
      .rectangle(cx, panelTop + panelH / 2, BATTLE.PANEL_W, panelH, BG.MONSTER_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER.MON_BATTLE);

    scene.add
      .text(cx, panelTop + 20, monsterCfg.name, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.MONSTER,
      })
      .setOrigin(0.5);

    const monsterFrame = MONSTER_FRAMES[monsterCfg.id];
    this.sprite = scene.add
      .image(cx, panelTop + panelH * 0.42, monsterFrame.key, monsterFrame.frame)
      .setScale(-5, 5)
      .setOrigin(0.5);

    scene.add
      .text(
        cx,
        panelTop + panelH * 0.62,
        `ATK ${scaledStats.attack}   DEF ${scaledStats.defense}   MAG ${scaledStats.magic}`,
        { fontSize: FONT.BODY, color: TXT.GOLD_LIGHT, align: "center" },
      )
      .setOrigin(0.5);

    const barY = panelTop + panelH * 0.72;
    this.barLeft = cx - BAR_W / 2;
    this.barY = barY;
    scene.add.rectangle(cx, barY, BAR_W, 14, BG.BAR_TRACK).setOrigin(0.5);
    this.hpFill = scene.add
      .rectangle(this.barLeft, barY, BAR_W, 14, BAR.HP_FILL)
      .setOrigin(0, 0.5);
    this.hpGhost = scene.add
      .rectangle(this.barLeft, barY, 0, 14, HP_GHOST.MONSTER, 0.85)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .text(cx, barY + 18, "", { fontSize: FONT.BODY, color: TXT.GOLD_LIGHT })
      .setOrigin(0.5);

    this.intentText = scene.add
      .text(cx, panelTop + panelH * 0.86, "", {
        fontSize: FONT.MD,
        fontFamily: "EnchantedLand",
        color: TXT.MUTED,
        wordWrap: { width: BATTLE.PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);

    this.buffText = scene.add
      .text(cx, panelTop + panelH * 0.94, "", {
        fontSize: FONT.SM,
        color: TXT.DUST_MOTE,
        wordWrap: { width: BATTLE.PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);
  }

  setHp(hp: number, maxHp: number, durationMs: number): void {
    const pct = Math.max(0, hp) / maxHp;
    this.scene.tweens.killTweensOf(this.hpFill);
    this.scene.tweens.add({
      targets: this.hpFill,
      scaleX: pct,
      duration: durationMs,
      ease: "Quad.easeOut",
    });
    this.hpText.setText(`HP  ${Math.max(0, hp)} / ${maxHp}`).setColor(TXT.GOLD_LIGHT);
  }

  setBuffs(text: string): void {
    this.buffText.setText(text);
  }

  setIntent(text: string, color: string): void {
    this.intentText.setText(text).setColor(color);
  }

  previewHpDamage(currentHp: number, damage: number, maxHp: number): void {
    const futureHp = Math.max(0, currentHp - damage);
    this.hpGhost
      .setPosition(this.barLeft + BAR_W * (futureHp / maxHp), this.barY)
      .setSize(BAR_W * (damage / maxHp), 14);
    this.hpText.setText(`HP  ${futureHp} / ${maxHp}`).setColor(TXT.INTENT_ATTACK);
  }

  clearHpPreview(currentHp: number, maxHp: number): void {
    this.hpGhost.setSize(0, 14);
    this.hpText
      .setText(`HP  ${Math.max(0, currentHp)} / ${maxHp}`)
      .setColor(TXT.GOLD_LIGHT);
  }
}
