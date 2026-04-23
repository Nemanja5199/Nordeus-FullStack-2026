import type { ActiveBuff, CombatCharacter, MoveConfig, MoveResult } from "../types/game";

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
          existing.turnsRemaining = Math.max(existing.turnsRemaining, fx.turns!);
        } else {
          tgt.activeBuffs.push({
            stat: fx.stat as ActiveBuff["stat"],
            multiplier: fx.multiplier!,
            turnsRemaining: fx.turns!,
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
          existing.turnsRemaining = Math.max(existing.turnsRemaining, fx.turns!);
        } else {
          tgt.activeBuffs.push({
            stat: fx.stat as ActiveBuff["stat"],
            multiplier: fx.multiplier!,
            turnsRemaining: fx.turns!,
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
