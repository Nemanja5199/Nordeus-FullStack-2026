import Phaser from "phaser";
import { BATTLE, BG, BAR, BORDER, FONT, HP_BAR, HP_GHOST, TXT } from "../../constants";
import { heroFrameFor } from "../../sprites";
import type { HeroClass } from "../../types/game";

const BAR_W = BATTLE.PANEL_W - 24;

// Owns the hero side of the battle UI: portrait, HP/mana bars, stats line,
// buff strip. Battle animations reach in via .sprite for tween targets.
export class BattleHeroPanel {
  readonly sprite: Phaser.GameObjects.Image;

  private hpFill: Phaser.GameObjects.Rectangle;
  private hpGhost: Phaser.GameObjects.Rectangle;
  private hpText: Phaser.GameObjects.Text;
  private manaFill: Phaser.GameObjects.Rectangle;
  private manaText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private buffText: Phaser.GameObjects.Text;

  private barLeft: number;
  private barY: number;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, width: number, height: number, heroLevel: number, classKey: HeroClass) {
    this.scene = scene;
    const panelH = height * 0.58;
    const panelTop = height * 0.04;
    const cx = width * 0.2;

    scene.add
      .rectangle(cx, panelTop + panelH / 2, BATTLE.PANEL_W, panelH, BG.HERO_BATTLE, 0.88)
      .setStrokeStyle(2, BORDER.HERO_BATTLE);

    scene.add
      .text(cx, panelTop + 20, `Knight  Lv.${heroLevel}`, {
        fontSize: FONT.LG,
        fontFamily: "EnchantedLand",
        color: TXT.HERO,
      })
      .setOrigin(0.5);

    const heroFrame = heroFrameFor(classKey);
    this.sprite = scene.add
      .image(cx, panelTop + panelH * 0.42, heroFrame.key, heroFrame.frame)
      .setScale(5)
      .setOrigin(0.5);

    this.statsText = scene.add
      .text(cx, panelTop + panelH * 0.62, "", {
        fontSize: FONT.BODY,
        color: TXT.GOLD_LIGHT,
        align: "center",
      })
      .setOrigin(0.5);

    const barY = panelTop + panelH * 0.70;
    this.barLeft = cx - BAR_W / 2;
    this.barY = barY;
    scene.add.rectangle(cx, barY, BAR_W, 14, BG.BAR_TRACK).setOrigin(0.5);
    this.hpFill = scene.add
      .rectangle(this.barLeft, barY, BAR_W, 14, BAR.HERO_HP)
      .setOrigin(0, 0.5);
    this.hpGhost = scene.add
      .rectangle(this.barLeft, barY, 0, 14, HP_GHOST.HERO, 0.75)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .text(cx, barY + 16, "", { fontSize: FONT.BODY, color: TXT.GOLD_LIGHT })
      .setOrigin(0.5);

    const manaBarY = panelTop + panelH * 0.81;
    scene.add.rectangle(cx, manaBarY, BAR_W, 10, BG.BAR_TRACK).setOrigin(0.5);
    this.manaFill = scene.add
      .rectangle(this.barLeft, manaBarY, BAR_W, 10, BAR.MANA_FILL)
      .setOrigin(0, 0.5);
    this.manaText = scene.add
      .text(cx, manaBarY + 14, "", { fontSize: FONT.BODY, color: TXT.GOLD_LIGHT })
      .setOrigin(0.5);

    this.buffText = scene.add
      .text(cx, panelTop + panelH * 0.93, "", {
        fontSize: FONT.SM,
        color: TXT.GOLD_MID,
        wordWrap: { width: BATTLE.PANEL_W - 16 },
        align: "center",
      })
      .setOrigin(0.5);
  }

  setHp(hp: number, maxHp: number, durationMs: number): void {
    const pct = Math.max(0, hp) / maxHp;
    const color =
      pct > HP_BAR.HIGH_THRESHOLD ? BAR.HP_HIGH : pct > HP_BAR.MID_THRESHOLD ? BAR.HP_MID : BAR.HP_LOW;
    this.hpFill.setFillStyle(color);
    this.scene.tweens.killTweensOf(this.hpFill);
    this.scene.tweens.add({
      targets: this.hpFill,
      scaleX: pct,
      duration: durationMs,
      ease: "Quad.easeOut",
    });
    this.hpText.setText(`HP  ${Math.max(0, hp)} / ${maxHp}`).setColor(TXT.GOLD_LIGHT);
  }

  setMana(mana: number, max: number): void {
    this.manaFill.setScale(mana / max, 1);
    this.manaText.setText(`MP  ${mana} / ${max}`).setColor(TXT.GOLD_LIGHT);
  }

  setStats(atk: number, def: number, mag: number): void {
    this.statsText.setText(`ATK ${atk}   DEF ${def}   MAG ${mag}`);
  }

  setBuffs(text: string): void {
    this.buffText.setText(text);
  }

  previewHpDamage(currentHp: number, damage: number, maxHp: number): void {
    const futureHp = Math.max(0, currentHp - damage);
    this.hpGhost
      .setPosition(this.barLeft + BAR_W * (futureHp / maxHp), this.barY)
      .setSize(BAR_W * (damage / maxHp), 14)
      .setFillStyle(HP_GHOST.HERO, 0.75);
    this.hpText.setText(`HP  ${futureHp} / ${maxHp}`).setColor(TXT.INTENT_ATTACK);
  }

  previewHpHeal(currentHp: number, heal: number, maxHp: number): void {
    const futureHp = Math.min(maxHp, currentHp + heal);
    this.hpGhost
      .setPosition(this.barLeft + BAR_W * (currentHp / maxHp), this.barY)
      .setSize(BAR_W * ((futureHp - currentHp) / maxHp), 14)
      .setFillStyle(BAR.HP_HIGH, 0.7);
    this.hpText.setText(`HP  ${futureHp} / ${maxHp}`).setColor(TXT.INTENT_HEAL);
  }

  clearHpPreview(currentHp: number, maxHp: number): void {
    this.hpGhost.setSize(0, 14);
    this.hpText
      .setText(`HP  ${Math.max(0, currentHp)} / ${maxHp}`)
      .setColor(TXT.GOLD_LIGHT);
  }

  previewManaCost(futureMana: number, max: number, regenNextTurn: number): void {
    this.manaFill.setScale(futureMana / max, 1);
    this.manaText
      .setText(`MP  ${futureMana} / ${max}  (+${regenNextTurn} next turn)`)
      .setColor(TXT.MANA_LOW);
  }

  previewManaHeal(futureMana: number, max: number): void {
    this.manaFill.setScale(futureMana / max, 1);
    this.manaText.setText(`MP  ${futureMana} / ${max}`).setColor(TXT.INTENT_HEAL);
  }
}
