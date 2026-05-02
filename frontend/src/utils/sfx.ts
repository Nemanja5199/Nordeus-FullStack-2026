import type Phaser from "phaser";
import { Settings } from "./settings";

// Short fire-and-forget cues. Each logical Sfx is a slot; multi-variant
// slots pick at random with ±jitter pitch so back-to-back triggers don't
// sound identical. Settings.sfxVolume() is the master multiplier.

export const SfxAsset = {
  ButtonClick: "sfx_button_click",
  PhysicalHit1: "sfx_physical_hit_1",
  PhysicalHit2: "sfx_physical_hit_2",
  PhysicalHit3: "sfx_physical_hit_3",
  MagicCast1: "sfx_magic_cast_1",
  MagicCast2: "sfx_magic_cast_2",
  MagicCast3: "sfx_magic_cast_3",
  HeavyImpact: "sfx_heavy_impact",
  Heal: "sfx_heal",
  BuffApply1: "sfx_buff_apply_1",
  BuffApply2: "sfx_buff_apply_2",
  DebuffApply: "sfx_debuff_apply",
  DotTick: "sfx_dot_tick",
  ManaDrink: "sfx_mana_drink",
  EnemyDeath: "sfx_enemy_death",
  GoldPickup: "sfx_gold_pickup",
  ShardPickup1: "sfx_shard_pickup_1",
  ShardPickup2: "sfx_shard_pickup_2",
  MoveDrop1: "sfx_move_drop_1",
  MoveDrop2: "sfx_move_drop_2",
  Equip: "sfx_equip",
  Unequip: "sfx_unequip",
  Denied: "sfx_denied",
} as const;
export type SfxAssetKey = typeof SfxAsset[keyof typeof SfxAsset];

// PreloadScene iterates this to register every load.
export const SFX_FILES: Record<SfxAssetKey, string> = {
  [SfxAsset.ButtonClick]: "button_click.ogg",
  [SfxAsset.PhysicalHit1]: "physical_hit_1.ogg",
  [SfxAsset.PhysicalHit2]: "physical_hit_2.ogg",
  [SfxAsset.PhysicalHit3]: "physical_hit_3.ogg",
  [SfxAsset.MagicCast1]: "magic_cast_1.ogg",
  [SfxAsset.MagicCast2]: "magic_cast_2.ogg",
  [SfxAsset.MagicCast3]: "magic_cast_3.ogg",
  [SfxAsset.HeavyImpact]: "heavy_impact.wav",
  [SfxAsset.Heal]: "heal.wav",
  [SfxAsset.BuffApply1]: "buff_apply_1.ogg",
  [SfxAsset.BuffApply2]: "buff_apply_2.ogg",
  [SfxAsset.DebuffApply]: "debuff_apply.wav",
  [SfxAsset.DotTick]: "dot_tick.wav",
  [SfxAsset.ManaDrink]: "mana_drink.wav",
  [SfxAsset.EnemyDeath]: "enemy_death.wav",
  [SfxAsset.GoldPickup]: "gold_pickup.wav",
  [SfxAsset.ShardPickup1]: "shard_pickup_1.ogg",
  [SfxAsset.ShardPickup2]: "shard_pickup_2.ogg",
  [SfxAsset.MoveDrop1]: "move_drop_1.ogg",
  [SfxAsset.MoveDrop2]: "move_drop_2.ogg",
  [SfxAsset.Equip]: "equip.wav",
  [SfxAsset.Unequip]: "unequip.wav",
  [SfxAsset.Denied]: "denied.wav",
};

export const Sfx = {
  ButtonClick: "buttonClick",
  PhysicalHit: "physicalHit",
  MagicCast: "magicCast",
  HeavyImpact: "heavyImpact",
  Heal: "heal",
  BuffApply: "buffApply",
  DebuffApply: "debuffApply",
  DotTick: "dotTick",
  ManaDrink: "manaDrink",
  EnemyDeath: "enemyDeath",
  GoldPickup: "goldPickup",
  ShardPickup: "shardPickup",
  MoveDrop: "moveDrop",
  Equip: "equip",
  Unequip: "unequip",
  Denied: "denied",
} as const;
export type SfxKey = typeof Sfx[keyof typeof Sfx];

interface SfxSlot {
  variants: SfxAssetKey[];
  volume: number;
  // 1 ± jitter rate range. Past ~0.15 it stops sounding like the same source.
  jitter?: number;
}

const SLOTS: Record<SfxKey, SfxSlot> = {
  [Sfx.ButtonClick]: { variants: [SfxAsset.ButtonClick], volume: 0.55, jitter: 0.04 },
  [Sfx.PhysicalHit]: { variants: [SfxAsset.PhysicalHit1, SfxAsset.PhysicalHit2, SfxAsset.PhysicalHit3], volume: 0.7, jitter: 0.08 },
  [Sfx.MagicCast]:   { variants: [SfxAsset.MagicCast1, SfxAsset.MagicCast2, SfxAsset.MagicCast3],     volume: 0.65, jitter: 0.08 },
  [Sfx.HeavyImpact]: { variants: [SfxAsset.HeavyImpact], volume: 0.85, jitter: 0.05 },
  [Sfx.Heal]:        { variants: [SfxAsset.Heal], volume: 0.7 },
  [Sfx.BuffApply]:   { variants: [SfxAsset.BuffApply1, SfxAsset.BuffApply2], volume: 0.6, jitter: 0.06 },
  [Sfx.DebuffApply]: { variants: [SfxAsset.DebuffApply], volume: 0.7 },
  [Sfx.DotTick]:     { variants: [SfxAsset.DotTick], volume: 0.55 },
  [Sfx.ManaDrink]:   { variants: [SfxAsset.ManaDrink], volume: 0.7 },
  [Sfx.EnemyDeath]:  { variants: [SfxAsset.EnemyDeath], volume: 0.8 },
  [Sfx.GoldPickup]:  { variants: [SfxAsset.GoldPickup], volume: 0.7 },
  [Sfx.ShardPickup]: { variants: [SfxAsset.ShardPickup1, SfxAsset.ShardPickup2], volume: 0.65, jitter: 0.06 },
  [Sfx.MoveDrop]:    { variants: [SfxAsset.MoveDrop1, SfxAsset.MoveDrop2], volume: 0.7, jitter: 0.04 },
  [Sfx.Equip]:       { variants: [SfxAsset.Equip], volume: 0.6 },
  [Sfx.Unequip]:     { variants: [SfxAsset.Unequip], volume: 0.6 },
  [Sfx.Denied]:      { variants: [SfxAsset.Denied], volume: 0.65 },
};

interface SfxPlayOptions {
  volumeScale?: number;
  rate?: number;
}

class SfxManager {
  play(scene: Phaser.Scene, key: SfxKey, opts: SfxPlayOptions = {}): void {
    const slot = SLOTS[key];
    if (!slot) return;
    if (Settings.sfxVolume() <= 0) return;

    const variantKey = slot.variants[Math.floor(Math.random() * slot.variants.length)];
    if (!scene.cache.audio.exists(variantKey)) return;

    const sound = scene.sound.add(variantKey, {
      volume: slot.volume * (opts.volumeScale ?? 1) * Settings.sfxVolume(),
    });
    sound.once("complete", () => sound.destroy());

    let rate = 1;
    if (opts.rate !== undefined) rate = opts.rate;
    else if (slot.jitter && slot.jitter > 0) rate = 1 + (Math.random() * 2 - 1) * slot.jitter;

    const config: { rate?: number } = rate !== 1 ? { rate } : {};

    if (scene.sound.locked) scene.sound.once("unlocked", () => sound.play(config));
    else sound.play(config);
  }
}

export const SfxPlayer = new SfxManager();
