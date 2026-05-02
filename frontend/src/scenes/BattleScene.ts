import Phaser from "phaser";
import { Scene, type SceneKey, FONT } from "../constants";
import type { CombatCharacter, MoveConfig, MonsterConfig } from "../types/game";
import { applyMove, tickBuffs, tickDots, getEffectiveStat, hasSimilarMove } from "../combat";
import { POTIONS, MANA, MONSTER_LEVEL_SCALING } from "../constants";
import { GameState, getGearBonuses, TestMode, Settings, MetaProgress } from "../state";
import { Audio, TrackGroup, SfxPlayer, Sfx } from "../audio";
import { api } from "../services/api";
import { BattleLog, StatusBar, PotionRow, MoveButtonRow, BattleHeroPanel, BattleMonsterPanel } from "../ui";
import { BG, TXT } from "../constants";

interface BattleData {
  monster: MonsterConfig;
  monsterIndex: number;
  defeatedIds: string[];
  sourceScene?: SceneKey;
  nodeId?: string;
  levelBand?: { min: number; max: number };
}

export class BattleScene extends Phaser.Scene {
  private hero!: CombatCharacter;
  private monster!: CombatCharacter;
  private monsterCfg!: MonsterConfig;
  private monsterIndex!: number;
  private defeatedIds!: string[];
  private sourceScene!: SceneKey;
  private nodeId!: string | undefined;
  private monsterLevel = 1;
  private turnNumber = 0;
  private busy = false;

  private heroMana: number = MANA.MAX;
  private usedPotionThisTurn = false;

  private heroPanel!: BattleHeroPanel;
  private monsterPanel!: BattleMonsterPanel;
  private statusBar!: StatusBar;
  private log!: BattleLog;
  private potions!: PotionRow;
  private moveRow!: MoveButtonRow;

  private monsterIntentMoveId: string | null = null;
  private monsterMoveHistory: string[] = [];

  constructor() {
    super(Scene.Battle);
  }

  create(data: BattleData) {
    this.animSpeed = Settings.animSpeedMultiplier();
    Audio.play(this, TrackGroup.Battle);
    this.busy = false;
    this.turnNumber = 0;
    this.heroMana = MANA.MAX;
    this.usedPotionThisTurn = false;
    this.monsterIntentMoveId = null;

    this.monsterCfg = data.monster;
    this.monsterIndex = data.monsterIndex;
    this.defeatedIds = data.defeatedIds ?? [];
    this.sourceScene = data.sourceScene ?? Scene.TreeMap;
    this.nodeId = data.nodeId;

    const hs = GameState.hero;
    const gear = getGearBonuses(hs.equipment ?? {}, GameState.runConfig!.items);
    const effMaxHp = hs.maxHp + (gear.maxHp ?? 0);
    this.hero = {
      id: "hero",
      name: "Knight",
      hp: effMaxHp,
      maxHp: effMaxHp,
      baseStats: {
        attack: hs.attack + (gear.attack ?? 0),
        defense: hs.defense + (gear.defense ?? 0),
        magic: hs.magic + (gear.magic ?? 0),
      },
      activeBuffs: [],
      activeDots: [],
      moves: hs.equippedMoves,
    };

    const ms = this.monsterCfg.stats;
    const heroLevel = GameState.hero.level;
    const band = data.levelBand ?? { min: 1, max: 15 };
    this.monsterLevel = Math.max(band.min, Math.min(band.max, heroLevel));
    const scaleFactor = 1 + MONSTER_LEVEL_SCALING * (this.monsterLevel - 1);
    const scaledHp = Math.floor(ms.hp * scaleFactor);
    this.monster = {
      id: this.monsterCfg.id,
      name: this.monsterCfg.name,
      hp: scaledHp,
      maxHp: scaledHp,
      baseStats: {
        attack: Math.floor(ms.attack * scaleFactor),
        defense: Math.floor(ms.defense * scaleFactor),
        magic: Math.floor(ms.magic * scaleFactor),
      },
      activeBuffs: [],
      activeDots: [],
      moves: this.monsterCfg.moves,
    };

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, BG.DARKEST).setOrigin(0);

    this.heroPanel = new BattleHeroPanel(this, width, height, GameState.hero.level, GameState.selectedClass);
    this.monsterPanel = new BattleMonsterPanel(this, width, height, this.monsterCfg, this.monster.baseStats);
    this.statusBar = new StatusBar(this, width, height);
    this.potions = new PotionRow(this, width, height, {
      onUseHp: () => this.useHpPotion(),
      onUseMana: () => this.useManaPotion(),
      onHoverHp: () => this.previewHpPotion(),
      onHoverMana: () => this.previewManaPotion(),
      onHoverEnd: () => this.hideMovePreview(),
    });
    const moveCfgs = this.hero.moves
      .map((id) => {
        const config = GameState.runConfig!.moves[id];
        return config ? { id, config } : null;
      })
      .filter((m): m is { id: string; config: MoveConfig } => m !== null);
    this.moveRow = new MoveButtonRow(this, width, height, moveCfgs, {
      onClick: (moveId) => void this.handlePlayerMove(moveId),
      onHover: (moveId) => {
        const move = GameState.runConfig!.moves[moveId];
        this.statusBar.setDescription(this.buildMoveTooltip(moveId) || move.description);
        this.showMovePreview(moveId);
      },
      onHoverEnd: () => {
        this.statusBar.setDescription("");
        this.hideMovePreview();
      },
    });
    this.log = new BattleLog(this, width, height);

    this.updateHeroHp();
    this.updateMonsterHp();
    this.updatePotionButtons();
    this.setStatus("Your turn — choose a move!");
    void this.prefetchMonsterIntent();
  }

  private setStatus(msg: string) {
    this.statusBar.setStatus(msg);
  }

  private setButtonsEnabled(enabled: boolean) {
    this.moveRow.setEnabled(enabled);
    this.updatePotionButtons();
  }

  private canUseHpPotion(): boolean {
    return (
      !this.busy &&
      !this.usedPotionThisTurn &&
      (GameState.hero.hpPotions ?? 0) > 0 &&
      this.hero.hp < this.hero.maxHp
    );
  }

  private canUseManaPotion(): boolean {
    return (
      !this.busy &&
      !this.usedPotionThisTurn &&
      (GameState.hero.manaPotions ?? 0) > 0 &&
      this.heroMana < MANA.MAX
    );
  }

  private useHpPotion() {
    if (!this.canUseHpPotion()) return;
    if (!GameState.useHpPotion()) return;
    this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + POTIONS.HP_HEAL);
    GameState.hero.currentHp = this.hero.hp;
    this.usedPotionThisTurn = true;
    this.pushLog(`You drink an HP potion (+${POTIONS.HP_HEAL} HP).`);
    this.updateHeroHp();
    this.updatePotionButtons();
    SfxPlayer.play(this, Sfx.Heal);
  }

  private useManaPotion() {
    if (!this.canUseManaPotion()) return;
    if (!GameState.useManaPotion()) return;
    this.heroMana = Math.min(MANA.MAX, this.heroMana + POTIONS.MP_RESTORE);
    this.usedPotionThisTurn = true;
    this.pushLog(`You drink a mana potion (+${POTIONS.MP_RESTORE} MP).`);
    this.updateHeroMana();
    this.updatePotionButtons();
    SfxPlayer.play(this, Sfx.ManaDrink);
  }

  private updatePotionButtons() {
    this.potions.update(
      GameState.hero.hpPotions ?? 0,
      GameState.hero.manaPotions ?? 0,
      this.canUseHpPotion(),
      this.canUseManaPotion(),
    );
  }

  // ── Battle log ───────────────────────────────────────────────────────────

  private pushLog(msg: string, color: string = TXT.GOLD_LIGHT) {
    this.log.push(msg, color);
  }

  private moveLogColor(move: {
    moveType: string;
    baseValue: number;
    effects: { type: string }[];
  }): string {
    if (move.moveType === "physical" && move.baseValue > 0) return TXT.INTENT_ATTACK;
    if (move.moveType === "magic" && move.baseValue > 0) return TXT.LOG_MAGIC;
    if (move.moveType === "heal") return TXT.INTENT_HEAL;
    if (move.effects.some((e) => e.type === "drain")) return TXT.INTENT_HEAL;
    if (move.effects.some((e) => e.type === "buff")) return TXT.INTENT_BUFF;
    if (move.effects.some((e) => e.type === "debuff")) return TXT.INTENT_DEBUFF;
    return TXT.GOLD_LIGHT;
  }

  // ── HP + live stats ──────────────────────────────────────────────────────

  private updateHeroHp() {
    this.heroPanel.setHp(this.hero.hp, this.hero.maxHp, this.ms(this.HP_TWEEN_MS));
    this.heroPanel.setBuffs(this.formatBuffs(this.hero));
    this.updateHeroStats();
    this.updateHeroMana();
  }

  private updateHeroMana() {
    // Test mode: top mana off every refresh so the player can spam any move.
    // Cheaper than threading TestMode through every cost check.
    if (TestMode.isOn()) this.heroMana = MANA.MAX;
    this.heroPanel.setMana(this.heroMana, MANA.MAX);
    this.moveRow.setMana(this.heroMana);
  }

  // ── Battle animations ────────────────────────────────────────────────────
  // Each helper returns a Promise so handlePlayerMove / doMonsterTurn can
  // await an ordered sequence (lunge → flash + damage number → bar drain).

  private animSpeed = 1;

  private ms(base: number): number {
    return Math.max(1, Math.round(base * this.animSpeed));
  }

  private LUNGE_PX = 50;
  private LUNGE_MS = 220;
  private FLASH_MS = 150;
  private DAMAGE_FLOAT_MS = 750;
  private HP_TWEEN_MS = 380;
  // Heavy hit (damage ≥ 25% of target's max HP): hit-stop + screen shake
  // + oversized red damage number. Self-balances across hero/monster scaling.
  private HEAVY_DMG_RATIO = 0.25;
  private HIT_STOP_MS = 80;
  private SHAKE_MS = 220;
  private SHAKE_INTENSITY = 0.009;

  private lunge(sprite: Phaser.GameObjects.Image, dx: number): Promise<void> {
    if (!sprite) return Promise.resolve();
    return new Promise((resolve) => {
      const restingX = sprite.x;
      this.tweens.killTweensOf(sprite);
      this.tweens.add({
        targets: sprite,
        x: restingX + dx,
        duration: this.ms(this.LUNGE_MS / 2),
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => {
          sprite.x = restingX; // safety: snap back exactly
          resolve();
        },
      });
    });
  }

  private flashSprite(
    sprite: Phaser.GameObjects.Image | undefined,
    color: number,
  ): Promise<void> {
    if (!sprite) return Promise.resolve();
    return new Promise((resolve) => {
      sprite.setTint(color);
      this.time.delayedCall(this.ms(this.FLASH_MS), () => {
        sprite.clearTint();
        resolve();
      });
    });
  }

  private floatNumber(
    x: number,
    y: number,
    text: string,
    color: string,
    heavy = false,
  ): Promise<void> {
    return new Promise((resolve) => {
      const txt = this.add
        .text(x, y, text, {
          fontSize: heavy ? "44px" : FONT.LG,
          fontFamily: "EnchantedLand",
          color,
          stroke: "#000000",
          strokeThickness: heavy ? 7 : 5,
        })
        .setOrigin(0.5)
        .setDepth(100);
      if (heavy) {
        txt.setScale(0.5);
        this.tweens.add({
          targets: txt,
          scale: 1,
          duration: this.ms(130),
          ease: "Back.easeOut",
        });
      }
      this.tweens.add({
        targets: txt,
        y: y - 70,
        alpha: 0,
        duration: this.ms(this.DAMAGE_FLOAT_MS),
        ease: "Quad.easeOut",
        onComplete: () => {
          txt.destroy();
          resolve();
        },
      });
    });
  }

  // Brief y-bob in place for non-damage moves so pure buffs/debuffs still
  // have spatial feedback (otherwise nothing visibly happens beyond text).
  private windup(sprite: Phaser.GameObjects.Image | undefined): Promise<void> {
    if (!sprite) return Promise.resolve();
    return new Promise((resolve) => {
      const restingY = sprite.y;
      this.tweens.killTweensOf(sprite);
      this.tweens.add({
        targets: sprite,
        y: restingY - 8,
        duration: this.ms(110),
        yoyo: true,
        ease: "Quad.easeOut",
        onComplete: () => {
          sprite.y = restingY;
          resolve();
        },
      });
    });
  }

  // Particle burst — small drifting circles. Used for heal sparkles, buff
  // glints, mp_drain wisps, and DOT embers.
  private sparkles(
    x: number,
    y: number,
    color: number,
    count = 6,
    durationMs = 600,
  ): Promise<void> {
    return new Promise((resolve) => {
      if (count <= 0) {
        resolve();
        return;
      }
      let remaining = count;
      for (let i = 0; i < count; i++) {
        const ox = Phaser.Math.Between(-22, 22);
        const oy = Phaser.Math.Between(-12, 12);
        const dot = this.add.circle(x + ox, y + oy, 3, color, 0.9).setDepth(99);
        this.tweens.add({
          targets: dot,
          x: x + ox + Phaser.Math.Between(-22, 22),
          y: y + oy - Phaser.Math.Between(28, 56),
          alpha: 0,
          duration: this.ms(durationMs),
          ease: "Quad.easeOut",
          onComplete: () => {
            dot.destroy();
            remaining -= 1;
            if (remaining === 0) resolve();
          },
        });
      }
    });
  }

  // Longer/lighter tint than flashSprite — distinguishes buff/debuff feedback
  // from a hit so both can play on the same target without overwriting.
  private auraPulse(
    sprite: Phaser.GameObjects.Image | undefined,
    color: number,
    ms = 280,
  ): Promise<void> {
    if (!sprite) return Promise.resolve();
    return new Promise((resolve) => {
      sprite.setTint(color);
      this.time.delayedCall(this.ms(ms), () => {
        sprite.clearTint();
        resolve();
      });
    });
  }

  // Lunge → flash + damage number + buff/debuff aura → bar drain.
  private async animateMove(
    attackerSide: "hero" | "monster",
    move: MoveConfig,
    damage: number,
    heal: number,
  ): Promise<void> {
    const attackerSprite = attackerSide === "hero" ? this.heroPanel.sprite : this.monsterPanel.sprite;
    const defenderSprite = attackerSide === "hero" ? this.monsterPanel.sprite : this.heroPanel.sprite;
    const lungeDx = attackerSide === "hero" ? this.LUNGE_PX : -this.LUNGE_PX;
    const defenderMaxHp = attackerSide === "hero" ? this.monster.maxHp : this.hero.maxHp;

    const isAttack = damage > 0;
    const isHeal = heal > 0 && move.moveType === "heal";
    const isHeavy = isAttack && damage >= defenderMaxHp * this.HEAVY_DMG_RATIO;

    let hasSelfBuff = false;
    let hasOpponentDebuff = false;
    let hasSelfHpCost = false;
    for (const fx of move.effects ?? []) {
      if (fx.type === "buff" && fx.target === "self") hasSelfBuff = true;
      else if (fx.type === "debuff" && fx.target === "opponent") hasOpponentDebuff = true;
      else if (fx.type === "hp_cost") hasSelfHpCost = true;
    }

    if (isAttack || isHeal) {
      await this.lunge(attackerSprite, lungeDx);
    } else if (hasSelfBuff || hasOpponentDebuff || hasSelfHpCost) {
      await this.windup(attackerSprite);
    }

    // Hit-stop: brief freeze before the impact lands so heavy hits feel weighty.
    if (isHeavy) {
      await new Promise<void>((resolve) =>
        this.time.delayedCall(this.ms(this.HIT_STOP_MS), resolve),
      );
      if (Settings.screenShake()) {
        this.cameras.main.shake(this.ms(this.SHAKE_MS), this.SHAKE_INTENSITY);
      }
      // Heavy impact thump layered over the per-attack hit/cast cue.
      SfxPlayer.play(this, Sfx.HeavyImpact);
    }

    const tasks: Promise<void>[] = [];

    if (isAttack) {
      const flashColor = move.moveType === "magic" ? 0x66aaff : 0xff4444;
      tasks.push(this.flashSprite(defenderSprite, flashColor));
      const numColor = isHeavy
        ? "#ff2a2a"
        : move.moveType === "magic"
          ? "#a8ccff"
          : "#ff7070";
      tasks.push(
        this.floatNumber(
          defenderSprite.x,
          defenderSprite.y - 50,
          `-${damage}`,
          numColor,
          isHeavy,
        ),
      );
      // Hit / cast cue. Pitch jitter is applied inside SfxPlayer so 3 sword
      // variants × jitter feels different every swing.
      SfxPlayer.play(this, move.moveType === "magic" ? Sfx.MagicCast : Sfx.PhysicalHit);
    } else if (isHeal) {
      tasks.push(this.flashSprite(attackerSprite, 0x66ff88));
      tasks.push(
        this.floatNumber(attackerSprite.x, attackerSprite.y - 50, `+${heal}`, "#88ff99"),
      );
      tasks.push(this.sparkles(attackerSprite.x, attackerSprite.y, 0x66ff88, 8));
      SfxPlayer.play(this, Sfx.Heal);
    }

    if (hasSelfBuff) {
      // gold tint + glints on the buffed character
      tasks.push(this.auraPulse(attackerSprite, 0xffdf66));
      tasks.push(this.sparkles(attackerSprite.x, attackerSprite.y, 0xffdf66, 5, 500));
      SfxPlayer.play(this, Sfx.BuffApply);
    }
    if (hasOpponentDebuff) {
      // purple tint + glints on the cursed character
      tasks.push(this.auraPulse(defenderSprite, 0xaa66ff));
      tasks.push(this.sparkles(defenderSprite.x, defenderSprite.y, 0xaa66ff, 5, 500));
      SfxPlayer.play(this, Sfx.DebuffApply);
    }
    if (hasSelfHpCost) {
      // dim red flash on the caster — they paid HP
      tasks.push(this.flashSprite(attackerSprite, 0xff6655));
    }

    if (tasks.length) await Promise.all(tasks);
  }

  private async animateDotTick(target: "hero" | "monster", damage: number): Promise<void> {
    if (damage <= 0) return;
    const sprite = target === "hero" ? this.heroPanel.sprite : this.monsterPanel.sprite;
    if (!sprite) return;
    SfxPlayer.play(this, Sfx.DotTick);
    await Promise.all([
      this.flashSprite(sprite, 0xff4400),
      this.sparkles(sprite.x, sprite.y, 0xff5500, 4, 500),
      this.floatNumber(sprite.x, sprite.y - 50, `-${damage}`, "#ff7733"),
    ]);
  }

  // mp_drain side-effect (currently only Mind Freeze). applyMove surfaces it
  // via result.mpDrain since mana lives on this scene, not CombatCharacter.
  private applyMonsterManaDrain(amount: number | undefined) {
    if (!amount) return;
    const before = this.heroMana;
    this.heroMana = Math.max(0, this.heroMana - amount);
    const dropped = before - this.heroMana;
    if (dropped > 0) {
      this.pushLog(`Your mind is frozen! -${dropped} MP`, TXT.INTENT_DEBUFF);
      // Fire-and-forget visuals — don't block the move-resolution flow.
      const heroSprite = this.heroPanel.sprite;
      void this.sparkles(heroSprite.x, heroSprite.y, 0x4488ff, 6, 600);
      void this.floatNumber(heroSprite.x, heroSprite.y - 50, `-${dropped} MP`, "#5599ff");
    }
  }

  private updateHeroStats() {
    this.heroPanel.setStats(
      getEffectiveStat(this.hero, "attack"),
      getEffectiveStat(this.hero, "defense"),
      getEffectiveStat(this.hero, "magic"),
    );
  }

  private updateMonsterHp() {
    this.monsterPanel.setHp(this.monster.hp, this.monster.maxHp, this.ms(this.HP_TWEEN_MS));
    this.monsterPanel.setBuffs(this.formatBuffs(this.monster));
  }

  private formatBuffs(char: CombatCharacter): string {
    const parts: string[] = [];
    for (const b of char.activeBuffs) {
      const sign = b.multiplier >= 1 ? "+" : "-";
      const pct = Math.round(Math.abs(b.multiplier - 1) * 100);
      parts.push(`${b.stat} ${sign}${pct}% (${b.turnsRemaining}t)`);
    }
    for (const d of char.activeDots ?? []) {
      parts.push(`☠${d.damagePerTurn}/t (${d.turnsRemaining}t)`);
    }
    return parts.join("  ");
  }

  // ── Move tooltip (shown on hover) ───────────────────────────────────────

  private buildMoveTooltip(moveId: string): string {
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return "";

    const effAtk = getEffectiveStat(this.hero, "attack");
    const effMag = getEffectiveStat(this.hero, "magic");
    const effDef = getEffectiveStat(this.monster, "defense");
    const parts: string[] = [];

    if (move.moveType === "physical" && move.baseValue > 0) {
      const dmg = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - effDef * 0.5));
      parts.push(`~${dmg} physical dmg to enemy`);
    } else if (move.moveType === "magic" && move.baseValue > 0) {
      const dmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
      parts.push(`~${dmg} magic dmg to enemy`);
    } else if (move.moveType === "heal") {
      const heal = Math.max(5, Math.floor(move.baseValue + effMag));
      parts.push(`heals you for ~${heal} HP`);
    }

    for (const fx of move.effects) {
      if (fx.type === "drain") {
        const dmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
        parts.push(`heals you for ~${dmg} HP`);
      } else if (fx.type === "buff" && fx.target === "self") {
        const pct = Math.round((fx.multiplier! - 1) * 100);
        parts.push(`+${pct}% your ${fx.stat} for ${fx.turns} turns`);
      } else if (fx.type === "debuff" && fx.target === "opponent") {
        const pct = Math.round((1 - fx.multiplier!) * 100);
        parts.push(`-${pct}% enemy ${fx.stat} for ${fx.turns} turns`);
      } else if (fx.type === "hp_cost") {
        parts.push(`costs you ${fx.value!} HP`);
      }
    }

    return parts.join("   •   ");
  }

  // ── Enemy intent ─────────────────────────────────────────────────────────

  private updateMonsterIntent(moveId: string | null) {
    if (!moveId) {
      this.monsterPanel.setIntent("Thinking...", TXT.MUTED);
      return;
    }
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return;

    const hasDamage = move.baseValue > 0;
    const hasDrain = move.effects.some((e) => e.type === "drain");
    const hasHeal = move.moveType === "heal";
    const hasBuff = move.effects.some((e) => e.type === "buff" && e.target === "self");
    const hasDebuff = move.effects.some((e) => e.type === "debuff" && e.target === "opponent");

    if (hasDamage && !hasDrain) {
      const isPhysical = move.moveType === "physical";
      const effStat = getEffectiveStat(this.monster, isPhysical ? "attack" : "magic");
      const effDef = getEffectiveStat(this.hero, "defense");
      const dmg = isPhysical
        ? Math.max(1, Math.floor((move.baseValue + effStat) * 0.75 - effDef * 0.5))
        : Math.max(1, Math.floor(move.baseValue + effStat * 1.1));
      const label = isPhysical ? "Physical" : "Magic";
      const color = isPhysical ? TXT.INTENT_ATTACK : TXT.LOG_MAGIC;
      this.monsterPanel.setIntent(`${label}  ~${dmg} dmg`, color);
    } else if (hasDrain) {
      this.monsterPanel.setIntent("Draining life", TXT.INTENT_HEAL);
    } else if (hasHeal) {
      this.monsterPanel.setIntent("Healing", TXT.INTENT_HEAL);
    } else if (hasDebuff) {
      const stat = move.effects.find((e) => e.type === "debuff")?.stat ?? "stat";
      this.monsterPanel.setIntent(`Weakening your ${stat}`, TXT.INTENT_DEBUFF);
    } else if (hasBuff) {
      const stat = move.effects.find((e) => e.type === "buff")?.stat ?? "stat";
      this.monsterPanel.setIntent(`Buffing own ${stat}`, TXT.INTENT_BUFF);
    } else {
      this.monsterPanel.setIntent(move.name, TXT.MUTED);
    }
  }

  private async prefetchMonsterIntent() {
    const capturedTurn = this.turnNumber;
    this.updateMonsterIntent(null);
    try {
      const payload = {
        monsterId: this.monster.id,
        monsterMoves: this.monster.moves,
        monsterState: {
          hp: this.monster.hp,
          maxHp: this.monster.maxHp,
          attack: this.monster.baseStats.attack,
          defense: this.monster.baseStats.defense,
          magic: this.monster.baseStats.magic,
          activeBuffs: this.monster.activeBuffs,
          activeDots: this.monster.activeDots,
        },
        heroState: {
          hp: this.hero.hp,
          maxHp: this.hero.maxHp,
          attack: this.hero.baseStats.attack,
          defense: this.hero.baseStats.defense,
          magic: this.hero.baseStats.magic,
          activeBuffs: this.hero.activeBuffs,
          activeDots: this.hero.activeDots,
        },
        turnNumber: this.turnNumber,
        heroMoves: this.hero.moves,
        lastMonsterMoves: this.monsterMoveHistory,
      };
      const resp = await api.getMonsterMove(payload);
      if (this.turnNumber !== capturedTurn) return; // player already moved, discard
      this.monsterIntentMoveId = resp.moveId;
      this.updateMonsterIntent(resp.moveId);
    } catch {
      if (this.turnNumber !== capturedTurn) return;
      this.monsterPanel.setIntent("Unknown", TXT.MUTED);
    }
  }

  // ── HP preview on move hover ─────────────────────────────────────────────

  private showMovePreview(moveId: string) {
    const move = GameState.runConfig!.moves[moveId];
    if (!move) return;
    const futureDef = this.previewHeroBuffs(move);
    const { playerDmg, playerHeal } = this.previewMonsterHp(move);
    this.previewHeroHp(playerDmg, playerHeal, futureDef);
    this.previewMana(move.manaCost ?? 0);
  }

  private previewMana(cost: number) {
    if (cost <= 0) return;
    const futureMana = Math.max(0, this.heroMana - cost);
    const futureRegen = Math.min(MANA.MAX, futureMana + MANA.REGEN);
    this.heroPanel.previewManaCost(futureMana, MANA.MAX, futureRegen - futureMana);
  }

  // Skip when the potion would no-op so the ghost bar doesn't lie.
  private previewHpPotion(): void {
    if (!this.canUseHpPotion()) return;
    this.previewHeroHp(0, POTIONS.HP_HEAL, 0);
  }

  // Mirror of previewHpPotion for the mana bar.
  private previewManaPotion(): void {
    if (!this.canUseManaPotion()) return;
    const futureMana = Math.min(MANA.MAX, this.heroMana + POTIONS.MP_RESTORE);
    this.heroPanel.previewManaHeal(futureMana, MANA.MAX);
  }

  private previewHeroBuffs(move: MoveConfig): number {
    let futureAtk = getEffectiveStat(this.hero, "attack");
    let futureDef = getEffectiveStat(this.hero, "defense");
    let futureMag = getEffectiveStat(this.hero, "magic");
    for (const fx of move.effects) {
      if (fx.type === "buff" && fx.target === "self") {
        if (fx.stat === "attack") futureAtk = Math.floor(futureAtk * fx.multiplier!);
        if (fx.stat === "defense") futureDef = Math.floor(futureDef * fx.multiplier!);
        if (fx.stat === "magic") futureMag = Math.floor(futureMag * fx.multiplier!);
      }
    }
    const statsChanged =
      futureAtk !== getEffectiveStat(this.hero, "attack") ||
      futureDef !== getEffectiveStat(this.hero, "defense") ||
      futureMag !== getEffectiveStat(this.hero, "magic");
    if (statsChanged) {
      this.heroPanel.setStats(futureAtk, futureDef, futureMag);
    }
    return futureDef;
  }

  private previewMonsterHp(move: MoveConfig): { playerDmg: number; playerHeal: number } {
    const effAtk = getEffectiveStat(this.hero, "attack");
    const effMag = getEffectiveStat(this.hero, "magic");
    const monsterEffDef = getEffectiveStat(this.monster, "defense");

    let playerDmg = 0;
    let playerHeal = 0;

    if (move.moveType === "physical" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - monsterEffDef * 0.5));
    else if (move.moveType === "magic" && move.baseValue > 0)
      playerDmg = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
    else if (move.moveType === "heal")
      playerHeal = Math.max(5, Math.floor(move.baseValue + effMag));

    if (move.effects.some((e) => e.type === "drain")) playerHeal = playerDmg;

    if (playerDmg > 0) {
      this.monsterPanel.previewHpDamage(this.monster.hp, playerDmg, this.monster.maxHp);
    }

    return { playerDmg, playerHeal };
  }

  private previewHeroHp(playerDmg: number, playerHeal: number, futureDef: number): void {
    if (playerHeal > 0) {
      this.heroPanel.previewHpHeal(this.hero.hp, playerHeal, this.hero.maxHp);
      return;
    }

    const monsterSurvives = this.monster.hp - playerDmg > 0;
    if (monsterSurvives && this.monsterIntentMoveId) {
      const intentMove = GameState.runConfig!.moves[this.monsterIntentMoveId];
      const monsterEffAtk = getEffectiveStat(this.monster, "attack");
      const monsterEffMag = getEffectiveStat(this.monster, "magic");

      let monsterDmg = 0;
      if (intentMove?.moveType === "physical" && intentMove.baseValue > 0)
        monsterDmg = Math.max(
          1,
          Math.floor((intentMove.baseValue + monsterEffAtk) * 0.75 - futureDef * 0.5),
        );
      else if (intentMove?.moveType === "magic" && intentMove.baseValue > 0)
        monsterDmg = Math.max(1, Math.floor(intentMove.baseValue + monsterEffMag * 1.1));

      if (monsterDmg > 0) {
        this.heroPanel.previewHpDamage(this.hero.hp, monsterDmg, this.hero.maxHp);
      }
    }
  }

  private hideMovePreview() {
    this.monsterPanel.clearHpPreview(this.monster.hp, this.monster.maxHp);
    this.heroPanel.clearHpPreview(this.hero.hp, this.hero.maxHp);
    this.updateHeroStats();
    this.updateHeroMana();
  }

  // ── Turn logic ───────────────────────────────────────────────────────────

  private async handlePlayerMove(moveId: string) {
    if (this.busy) return;
    this.busy = true;
    this.hideMovePreview();
    this.setButtonsEnabled(false);

    const move = GameState.getMove(moveId);
    if (!move) {
      this.busy = false;
      this.setButtonsEnabled(true);
      return;
    }
    this.heroMana = Math.max(0, this.heroMana - (move.manaCost ?? 0));
    const result = applyMove(move, this.hero, this.monster);
    this.pushLog(`You → ${move.name}: ${result.logMessage}`, this.moveLogColor(move));

    // Lunge + flash + damage number, then drain bars in sync. The HP bars
    // are also tweens, so updateHeroHp/updateMonsterHp can run in parallel
    // with the lunge — the bar drain is timed to land just as the hit
    // resolves visually.
    await this.animateMove("hero", move, result.damage, result.heal);
    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.monster.hp <= 0) {
      this.handleVictory();
      return;
    }

    this.setStatus("Monster is deciding...");
    this.time.delayedCall(300, () => void this.doMonsterTurn());
  }

  private async doMonsterTurn() {
    try {
      // Use the pre-fetched intent move if available; otherwise fetch now
      let moveId = this.monsterIntentMoveId;
      this.monsterIntentMoveId = null;

      if (!moveId) {
        const payload = {
          monsterId: this.monster.id,
          monsterMoves: this.monster.moves,
          monsterState: {
            hp: this.monster.hp,
            maxHp: this.monster.maxHp,
            attack: this.monster.baseStats.attack,
            defense: this.monster.baseStats.defense,
            magic: this.monster.baseStats.magic,
            activeBuffs: this.monster.activeBuffs,
            activeDots: this.monster.activeDots,
          },
          heroState: {
            hp: this.hero.hp,
            maxHp: this.hero.maxHp,
            attack: this.hero.baseStats.attack,
            defense: this.hero.baseStats.defense,
            magic: this.hero.baseStats.magic,
            activeBuffs: this.hero.activeBuffs,
            activeDots: this.hero.activeDots,
          },
          turnNumber: this.turnNumber,
          heroMoves: this.hero.moves,
          lastMonsterMoves: this.monsterMoveHistory,
        };
        const resp = await api.getMonsterMove(payload);
        moveId = resp.moveId;
      }

      const monsterMove = GameState.getMove(moveId);
      if (!monsterMove) throw new Error(`unknown monster move: ${moveId}`);
      const result = applyMove(monsterMove, this.monster, this.hero);
      this.applyMonsterManaDrain(result.mpDrain);
      this.pushLog(
        `${this.monster.name} → ${monsterMove.name}: ${result.logMessage}`,
        this.moveLogColor(monsterMove),
      );
      this.monsterMoveHistory = [moveId, ...this.monsterMoveHistory].slice(0, 3);
      await this.animateMove("monster", monsterMove, result.damage, result.heal);
    } catch {
      const fallbackId = this.monster.moves[Math.floor(Math.random() * this.monster.moves.length)];
      const fallbackMove = GameState.getMove(fallbackId);
      if (!fallbackMove) {
        this.pushLog(`${this.monster.name} hesitates.`, TXT.MUTED);
      } else {
        const result = applyMove(fallbackMove, this.monster, this.hero);
        this.applyMonsterManaDrain(result.mpDrain);
        await this.animateMove("monster", fallbackMove, result.damage, result.heal);
        this.pushLog(
          `${this.monster.name} → ${fallbackMove.name}: ${result.logMessage}`,
          this.moveLogColor(fallbackMove),
        );
        this.monsterMoveHistory = [fallbackId, ...this.monsterMoveHistory].slice(0, 3);
      }
    }

    tickBuffs(this.hero);
    tickBuffs(this.monster);

    // DOTs tick after both sides have acted. applyMove stored turns+1 so a
    // DOT applied this turn fires its first damage before expiry.
    const heroDotDmg = tickDots(this.hero);
    if (heroDotDmg > 0) this.pushLog(`Decay tick: -${heroDotDmg} HP`, TXT.INTENT_DEBUFF);
    const monsterDotDmg = tickDots(this.monster);
    if (monsterDotDmg > 0)
      this.pushLog(`${this.monster.name} loses ${monsterDotDmg} to decay`, TXT.INTENT_HEAL);

    // Sequential so the player can read which side took damage.
    if (heroDotDmg > 0) await this.animateDotTick("hero", heroDotDmg);
    if (monsterDotDmg > 0) await this.animateDotTick("monster", monsterDotDmg);

    this.heroMana = Math.min(MANA.MAX, this.heroMana + MANA.REGEN);
    this.turnNumber++;

    this.updateHeroHp();
    this.updateMonsterHp();

    // DOT can finish off either side; check both before yielding control.
    if (this.monster.hp <= 0) {
      this.handleVictory();
      return;
    }
    if (this.hero.hp <= 0) {
      this.handleDefeat();
      return;
    }

    this.setStatus("Your turn — choose a move!");
    this.usedPotionThisTurn = false;
    this.busy = false;
    this.setButtonsEnabled(true);
    void this.prefetchMonsterIntent();
  }

  // ── Battle end ───────────────────────────────────────────────────────────

  private handleVictory() {
    SfxPlayer.play(this, Sfx.EnemyDeath);
    GameState.hero.currentHp = this.hero.hp;
    const xpGain = Math.floor(this.monsterCfg.xpReward * this.monsterLevel);
    const leveled = GameState.addXp(xpGain);

    const goldMin = this.monsterCfg.goldMin ?? 0;
    const goldMax = this.monsterCfg.goldMax ?? 0;
    const goldEarned = Math.floor(goldMin + Math.random() * (goldMax - goldMin + 1));
    GameState.hero.gold = (GameState.hero.gold ?? 0) + goldEarned;

    const shardMin = this.monsterCfg.shardMin ?? 0;
    const shardMax = this.monsterCfg.shardMax ?? 0;
    const shardsEarned = Math.floor(shardMin + Math.random() * (shardMax - shardMin + 1));
    MetaProgress.addShards(shardsEarned);

    GameState.saveHero();

    const allMoves = GameState.runConfig!.moves;
    const learned = GameState.hero.learnedMoves;
    const moveDropPool = this.monsterCfg.dropMoves ?? this.monsterCfg.moves;
    const notKnown = moveDropPool.filter((id) => !learned.includes(id));
    const genuinelyNew = notKnown.filter((id) => !hasSimilarMove(allMoves[id], learned, allMoves));
    const dropped = genuinelyNew.filter((id) => Math.random() < (allMoves[id]?.dropChance ?? 1));
    const learnedMove = dropped.length > 0 ? dropped[Math.floor(Math.random() * dropped.length)] : null;
    if (learnedMove) GameState.learnMove(learnedMove);

    const newDefeated = [...this.defeatedIds, this.monsterCfg.id];
    if (this.nodeId) GameState.completeNode(this.nodeId);

    this.scene.start(Scene.PostBattle, {
      won: true,
      learnedMoveId: learnedMove,
      xpGained: xpGain,
      goldEarned,
      shardsEarned,
      leveledUp: leveled,
      monsterIndex: this.monsterIndex,
      defeatedIds: newDefeated,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }

  private handleDefeat() {
    // Full run reset — hero returns to level 1 with meta bonuses applied
    if (GameState.runConfig) GameState.resetHero(GameState.runConfig);
    GameState.resetRunProgress(); // saves fresh tree state so CONTINUE works from main menu

    this.scene.start(Scene.PostBattle, {
      won: false,
      learnedMoveId: null,
      xpGained: 0,
      leveledUp: false,
      monsterIndex: this.monsterIndex,
      defeatedIds: this.defeatedIds,
      sourceScene: this.sourceScene,
      nodeId: this.nodeId,
    });
  }
}