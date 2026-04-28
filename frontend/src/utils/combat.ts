import type { ActiveBuff, CombatCharacter, MoveConfig, MoveResult } from "../types/game";
import {
  TXT_STAT_ATTACK,
  TXT_STAT_MAGIC,
  TXT_STAT_HP,
  TXT_MOVE_BUFF,
  TXT_MOVE_DEBUFF,
  TXT_SHARD,
} from "../ui/colors";

const STAT_LABEL: Record<string, string> = { attack: "ATK", defense: "DEF", magic: "MAG" };

export function buildMoveStatLines(move: MoveConfig): { text: string; color: string }[] {
  const lines: { text: string; color: string }[] = [];

  if (move.baseValue > 0) {
    if (move.moveType === "physical")
      lines.push({ text: `⚔  ${move.baseValue} physical dmg`, color: TXT_STAT_ATTACK });
    else if (move.moveType === "magic")
      lines.push({ text: `✦  ${move.baseValue} magic dmg`, color: TXT_STAT_MAGIC });
    else if (move.moveType === "heal")
      lines.push({ text: `♥  ${move.baseValue} HP restored`, color: TXT_STAT_HP });
  }

  for (const fx of move.effects) {
    if (fx.type === "buff" && fx.stat) {
      const pct = Math.round((fx.multiplier! - 1) * 100);
      lines.push({ text: `▲  ${STAT_LABEL[fx.stat]} +${pct}%  (${fx.turns}t)`, color: TXT_MOVE_BUFF });
    } else if (fx.type === "debuff" && fx.stat) {
      const pct = Math.round((1 - fx.multiplier!) * 100);
      lines.push({ text: `▼  Enemy ${STAT_LABEL[fx.stat]} -${pct}%  (${fx.turns}t)`, color: TXT_MOVE_DEBUFF });
    } else if (fx.type === "drain") {
      lines.push({ text: `↺  Drain: heal for dmg dealt`, color: TXT_SHARD });
    } else if (fx.type === "hp_cost" && fx.value) {
      lines.push({ text: `↓  Costs ${fx.value} HP`, color: TXT_STAT_ATTACK });
    } else if (fx.type === "dot" && fx.value && fx.turns) {
      lines.push({
        text: `☠  ${fx.value} dmg/turn × ${fx.turns} turns`,
        color: TXT_MOVE_DEBUFF,
      });
    }
  }

  return lines;
}

export function getEffectiveStat(char: CombatCharacter, stat: keyof typeof char.baseStats): number {
  let multiplier = 1;
  char.activeBuffs
    .filter((b: ActiveBuff) => b.stat === stat)
    .forEach((b: ActiveBuff) => (multiplier *= b.multiplier));
  return Math.max(1, Math.floor(char.baseStats[stat] * multiplier));
}

export function applyMove(
  move: MoveConfig,
  attacker: CombatCharacter,
  defender: CombatCharacter,
): MoveResult {
  const result: MoveResult = { damage: 0, heal: 0, hpCost: 0, logMessage: "" };
  const logs: string[] = [];

  const effAtk = getEffectiveStat(attacker, "attack");
  const effMag = getEffectiveStat(attacker, "magic");
  const effDef = getEffectiveStat(defender, "defense");

  // Primary damage / heal
  if (move.moveType === "physical" && move.baseValue > 0) {
    result.damage = Math.max(1, Math.floor((move.baseValue + effAtk) * 0.75 - effDef * 0.5));
    defender.hp = Math.max(0, defender.hp - result.damage);
    logs.push(`${result.damage} physical dmg`);
  } else if (move.moveType === "magic" && move.baseValue > 0) {
    result.damage = Math.max(1, Math.floor(move.baseValue + effMag * 1.1));
    defender.hp = Math.max(0, defender.hp - result.damage);
    logs.push(`${result.damage} magic dmg`);
  } else if (move.moveType === "heal") {
    result.heal = Math.max(5, Math.floor(move.baseValue + effMag * 1.0));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + result.heal);
    logs.push(`healed ${result.heal} HP`);
  }

  // Side effects
  for (const fx of move.effects) {
    switch (fx.type) {
      case "drain": {
        result.heal = result.damage;
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + result.heal);
        logs.push(`drained ${result.heal} HP`);
        break;
      }
      case "buff": {
        const tgt = fx.target === "self" ? attacker : defender;
        const existing = tgt.activeBuffs.find(
          (b) => b.stat === fx.stat && b.multiplier === fx.multiplier,
        );
        if (existing) {
          existing.turnsRemaining = Math.max(existing.turnsRemaining, fx.turns! + 1);
        } else {
          tgt.activeBuffs.push({
            stat: fx.stat as ActiveBuff["stat"],
            multiplier: fx.multiplier!,
            turnsRemaining: fx.turns! + 1,
          });
        }
        const pct = Math.round((fx.multiplier! - 1) * 100);
        logs.push(`${tgt.name}'s ${fx.stat} +${pct}% (${fx.turns}t)`);
        break;
      }
      case "debuff": {
        const tgt = fx.target === "opponent" ? defender : attacker;
        const existing = tgt.activeBuffs.find(
          (b) => b.stat === fx.stat && b.multiplier === fx.multiplier,
        );
        if (existing) {
          existing.turnsRemaining = Math.max(existing.turnsRemaining, fx.turns! + 1);
        } else {
          tgt.activeBuffs.push({
            stat: fx.stat as ActiveBuff["stat"],
            multiplier: fx.multiplier!,
            turnsRemaining: fx.turns! + 1,
          });
        }
        const pct = Math.round((1 - fx.multiplier!) * 100);
        logs.push(`${tgt.name}'s ${fx.stat} -${pct}% (${fx.turns}t)`);
        break;
      }
      case "hp_cost": {
        result.hpCost = fx.value!;
        attacker.hp = Math.max(1, attacker.hp - result.hpCost);
        logs.push(`cost ${result.hpCost} HP`);
        break;
      }
      case "dot": {
        // DOTs differ from buffs on storage: store `turns` directly. A 4-turn
        // DOT should fire exactly 4 end-of-turn damage ticks (cast-turn tick
        // counts). Buffs use turns + 1 because they're queried *between* ticks
        // and the cast turn's stats were computed before apply.
        const tgt = fx.target === "self" ? attacker : defender;
        tgt.activeDots.push({
          damagePerTurn: fx.value!,
          turnsRemaining: fx.turns!,
        });
        logs.push(`${tgt.name} cursed (${fx.value}/t × ${fx.turns}t)`);
        break;
      }
    }
  }

  result.logMessage = logs.join(", ");
  return result;
}

export function hasSimilarMove(
  candidate: MoveConfig,
  learnedIds: string[],
  allMoves: Record<string, MoveConfig>,
): boolean {
  for (const id of learnedIds) {
    const learned = allMoves[id];
    if (!learned) continue;
    for (const fxA of candidate.effects) {
      if (fxA.type !== "buff" && fxA.type !== "debuff") continue;
      for (const fxB of learned.effects) {
        if (fxA.type === fxB.type && fxA.stat === fxB.stat && fxA.target === fxB.target) {
          return true;
        }
      }
    }
  }
  return false;
}

export function tickBuffs(char: CombatCharacter): void {
  char.activeBuffs = char.activeBuffs
    .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
    .filter((b) => b.turnsRemaining > 0);
}

// Apply DOT damage and decrement durations. Returns total damage dealt this
// tick so the caller can log it. Mirrors tickBuffs: end-of-turn, after both
// sides have acted.
export function tickDots(char: CombatCharacter): number {
  if (!char.activeDots || char.activeDots.length === 0) return 0;
  let total = 0;
  for (const d of char.activeDots) total += d.damagePerTurn;
  char.hp = Math.max(0, char.hp - total);
  char.activeDots = char.activeDots
    .map((d) => ({ ...d, turnsRemaining: d.turnsRemaining - 1 }))
    .filter((d) => d.turnsRemaining > 0);
  return total;
}
