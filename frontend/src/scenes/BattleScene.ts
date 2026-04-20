import Phaser from "phaser";
import type { CombatCharacter, MonsterConfig } from "../types/game";
import { applyMove, tickBuffs } from "../utils/combat";
import { GameState } from "../utils/gameState";
import { api } from "../services/api";

interface BattleData {
  monster: MonsterConfig;
  monsterIndex: number;
  defeatedIds: string[];
}

const LOG_LINES = 6;

export class BattleScene extends Phaser.Scene {
  private hero!: CombatCharacter;
  private monster!: CombatCharacter;
  private monsterCfg!: MonsterConfig;
  private monsterIndex!: number;
  private defeatedIds!: string[];
  private turnNumber = 0;
  private busy = false;

  // UI
  private heroHpFill!: Phaser.GameObjects.Rectangle;
  private monsterHpFill!: Phaser.GameObjects.Rectangle;
  private heroHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private heroBuffText!: Phaser.GameObjects.Text;
  private monsterBuffText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private logLines: Phaser.GameObjects.Text[] = [];
  private moveButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super("BattleScene");
  }

  create(data: BattleData) {
    this.monsterCfg = data.monster;
    this.monsterIndex = data.monsterIndex;
    this.defeatedIds = data.defeatedIds ?? [];

    const hs = GameState.hero;
    this.hero = {
      id: "hero", name: "Knight",
      hp: hs.maxHp, maxHp: hs.maxHp,
      baseStats: { attack: hs.attack, defense: hs.defense, magic: hs.magic },
      activeBuffs: [], moves: hs.equippedMoves,
    };

    const ms = this.monsterCfg.stats;
    this.monster = {
      id: this.monsterCfg.id, name: this.monsterCfg.name,
      hp: ms.hp, maxHp: ms.hp,
      baseStats: { attack: ms.attack, defense: ms.defense, magic: ms.magic },
      activeBuffs: [], moves: this.monsterCfg.moves,
    };

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0d0d1a).setOrigin(0);

    this.buildHeroArea(width, height);
    this.buildMonsterArea(width, height);
    this.buildStatusBar(width, height);
    this.buildBattleLog(width, height);
    this.buildMoveButtons(width, height);

    this.setStatus("Your turn — choose a move!");
  }

  // ── Hero area ────────────────────────────────────────────────────────

  private buildHeroArea(width: number, height: number) {
    const cx = width * 0.22;
    const cy = height * 0.38;

    this.add.rectangle(cx, cy, 200, 180, 0x1a2a1a, 0.85).setStrokeStyle(2, 0x44aa44);

    this.add.text(cx, cy - 72, `Knight  Lv.${GameState.hero.level}`, {
      fontSize: "18px", color: "#aaffaa", fontStyle: "bold",
    }).setOrigin(0.5);

    // HP bar background
    this.add.rectangle(cx, cy - 50, 160, 14, 0x333333).setOrigin(0.5);
    this.heroHpFill = this.add.rectangle(cx - 80, cy - 50, 160, 14, 0x44cc44).setOrigin(0, 0.5);
    this.heroHpText = this.add.text(cx, cy - 35, "", { fontSize: "13px", color: "#ccc" }).setOrigin(0.5);
    this.heroBuffText = this.add.text(cx, cy + 60, "", { fontSize: "11px", color: "#88aaff", wordWrap: { width: 185 }, align: "center" }).setOrigin(0.5);

    this.updateHeroHp();
  }

  // ── Monster area ─────────────────────────────────────────────────────

  private buildMonsterArea(width: number, height: number) {
    const cx = width * 0.78;
    const cy = height * 0.38;

    this.add.rectangle(cx, cy, 200, 180, 0x2a1a1a, 0.85).setStrokeStyle(2, 0xcc4444);

    this.add.text(cx, cy - 72, this.monsterCfg.name, {
      fontSize: "18px", color: "#ffaaaa", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.rectangle(cx, cy - 50, 160, 14, 0x333333).setOrigin(0.5);
    this.monsterHpFill = this.add.rectangle(cx - 80, cy - 50, 160, 14, 0xcc4444).setOrigin(0, 0.5);
    this.monsterHpText = this.add.text(cx, cy - 35, "", { fontSize: "13px", color: "#ccc" }).setOrigin(0.5);
    this.monsterBuffText = this.add.text(cx, cy + 60, "", { fontSize: "11px", color: "#ffaa44", wordWrap: { width: 185 }, align: "center" }).setOrigin(0.5);

    this.updateMonsterHp();
  }

  // ── Status bar ───────────────────────────────────────────────────────

  private buildStatusBar(width: number, height: number) {
    this.add.rectangle(width / 2, height * 0.72, width - 20, 36, 0x1a1a2a, 0.9);
    this.statusText = this.add
      .text(width / 2, height * 0.72, "", { fontSize: "18px", color: "#ffd700" })
      .setOrigin(0.5);
  }

  private setStatus(msg: string) {
    this.statusText.setText(msg);
  }

  // ── Battle log ───────────────────────────────────────────────────────

  private buildBattleLog(width: number, height: number) {
    const x = width * 0.5;
    const startY = height * 0.77;
    this.add.rectangle(x, startY + (LOG_LINES * 18) / 2, width * 0.6, LOG_LINES * 18 + 10, 0x111122, 0.7);

    for (let i = 0; i < LOG_LINES; i++) {
      this.logLines.push(
        this.add.text(x, startY + i * 18, "", { fontSize: "13px", color: "#aaaacc" }).setOrigin(0.5)
      );
    }
  }

  private pushLog(msg: string) {
    const lines = this.logLines;
    for (let i = 0; i < lines.length - 1; i++) {
      lines[i].setText(lines[i + 1].text);
    }
    lines[lines.length - 1].setText(`> ${msg}`);
  }

  // ── Move buttons ─────────────────────────────────────────────────────

  private buildMoveButtons(width: number, height: number) {
    const moves = this.hero.moves;
    const cols = 2;
    const btnW = 220;
    const btnH = 44;
    const padX = 16;
    const padY = 10;
    const startX = width / 2 - (cols * btnW + padX) / 2 + btnW / 2;
    const startY = height * 0.86;

    moves.forEach((moveId, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnW + padX);
      const y = startY + row * (btnH + padY);
      const move = GameState.runConfig!.moves[moveId];
      if (!move) return;

      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, btnW, btnH, 0x2a3a4a, 0.9).setStrokeStyle(1, 0x4466aa);
      const label = this.add.text(0, -7, move.name, { fontSize: "15px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      const sub = this.add.text(0, 10, move.description.slice(0, 40) + (move.description.length > 40 ? "…" : ""), { fontSize: "11px", color: "#88aacc" }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on("pointerover", () => { if (!this.busy) { bg.setFillStyle(0x3a4a5a); label.setColor("#ffd700"); } });
      bg.on("pointerout", () => { bg.setFillStyle(0x2a3a4a); label.setColor("#ffffff"); });
      bg.on("pointerdown", () => this.handlePlayerMove(moveId));

      container.add([bg, label, sub]);
      this.moveButtons.push(container);
    });
  }

  private setButtonsEnabled(enabled: boolean) {
    this.moveButtons.forEach((c) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setAlpha(enabled ? 1 : 0.4);
      if (!enabled) bg.disableInteractive();
      else bg.setInteractive({ useHandCursor: true });
    });
  }

  // ── HP updates ───────────────────────────────────────────────────────

  private updateHeroHp() {
    const pct = Math.max(0, this.hero.hp) / this.hero.maxHp;
    this.heroHpFill.setScale(pct, 1);
    const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xddaa00 : 0xcc3333;
    this.heroHpFill.setFillStyle(color);
    this.heroHpText.setText(`HP: ${Math.max(0, this.hero.hp)} / ${this.hero.maxHp}`);
    this.heroBuffText.setText(this.formatBuffs(this.hero));
  }

  private updateMonsterHp() {
    const pct = Math.max(0, this.monster.hp) / this.monster.maxHp;
    this.monsterHpFill.setScale(pct, 1);
    this.monsterHpText.setText(`HP: ${Math.max(0, this.monster.hp)} / ${this.monster.maxHp}`);
    this.monsterBuffText.setText(this.formatBuffs(this.monster));
  }

  private formatBuffs(char: CombatCharacter): string {
    if (!char.activeBuffs.length) return "";
    return char.activeBuffs
      .map((b) => {
        const sign = b.multiplier >= 1 ? "+" : "-";
        const pct = Math.round(Math.abs(b.multiplier - 1) * 100);
        return `${b.stat} ${sign}${pct}% (${b.turnsRemaining}t)`;
      })
      .join("  ");
  }

  // ── Turn logic ───────────────────────────────────────────────────────

  private handlePlayerMove(moveId: string) {
    if (this.busy) return;
    this.busy = true;
    this.setButtonsEnabled(false);

    const move = GameState.runConfig!.moves[moveId];
    const result = applyMove(move, this.hero, this.monster);
    this.pushLog(`You → ${move.name}: ${result.logMessage}`);
    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.monster.hp <= 0) {
      this.handleVictory();
      return;
    }

    this.setStatus("Monster is deciding...");
    this.time.delayedCall(900, () => void this.doMonsterTurn());
  }

  private async doMonsterTurn() {
    try {
      const payload = {
        monsterId: this.monster.id,
        monsterMoves: this.monster.moves,
        monsterState: {
          hp: this.monster.hp, maxHp: this.monster.maxHp,
          attack: this.monster.baseStats.attack,
          defense: this.monster.baseStats.defense,
          magic: this.monster.baseStats.magic,
          activeBuffs: this.monster.activeBuffs,
        },
        heroState: {
          hp: this.hero.hp, maxHp: this.hero.maxHp,
          attack: this.hero.baseStats.attack,
          defense: this.hero.baseStats.defense,
          magic: this.hero.baseStats.magic,
          activeBuffs: this.hero.activeBuffs,
        },
        turnNumber: this.turnNumber,
      };

      const resp = await api.getMonsterMove(payload);
      const monsterMove = GameState.runConfig!.moves[resp.moveId];
      const result = applyMove(monsterMove, this.monster, this.hero);
      this.pushLog(`${this.monster.name} → ${monsterMove.name}: ${result.logMessage}`);
    } catch {
      // Fallback: random move
      const fallbackId = this.monster.moves[Math.floor(Math.random() * this.monster.moves.length)];
      const fallbackMove = GameState.runConfig!.moves[fallbackId];
      const result = applyMove(fallbackMove, this.monster, this.hero);
      this.pushLog(`${this.monster.name} → ${fallbackMove.name}: ${result.logMessage}`);
    }

    tickBuffs(this.hero);
    tickBuffs(this.monster);
    this.turnNumber++;

    this.updateHeroHp();
    this.updateMonsterHp();

    if (this.hero.hp <= 0) {
      this.handleDefeat();
      return;
    }

    this.setStatus("Your turn — choose a move!");
    this.setButtonsEnabled(true);
    this.busy = false;
  }

  // ── Battle end ───────────────────────────────────────────────────────

  private handleVictory() {
    const xpGain = this.monsterCfg.xpReward;
    const leveled = GameState.addXp(xpGain);

    // Learn a random move the hero doesn't know yet
    const newMoves = this.monsterCfg.moves.filter((id) => !GameState.hero.learnedMoves.includes(id));
    const learnedMove = newMoves.length > 0
      ? newMoves[Math.floor(Math.random() * newMoves.length)]
      : null;
    if (learnedMove) GameState.learnMove(learnedMove);

    const newDefeated = [...this.defeatedIds, this.monsterCfg.id];

    this.scene.start("PostBattleScene", {
      won: true,
      learnedMoveId: learnedMove,
      xpGained: xpGain,
      leveledUp: leveled,
      monsterIndex: this.monsterIndex,
      defeatedIds: newDefeated,
    });
  }

  private handleDefeat() {
    const xpGain = Math.floor(this.monsterCfg.xpReward * 0.25);
    GameState.addXp(xpGain);

    this.scene.start("PostBattleScene", {
      won: false,
      learnedMoveId: null,
      xpGained: xpGain,
      leveledUp: false,
      monsterIndex: this.monsterIndex,
      defeatedIds: this.defeatedIds,
    });
  }

}
