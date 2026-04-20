import Phaser from "phaser";
import { GameState } from "../utils/gameState";

interface MapData {
  monsterIndex: number;
  defeatedIds: string[];
}

export class MapScene extends Phaser.Scene {
  private defeatedIds: string[] = [];
  private currentMonsterIndex: number = 0;

  constructor() {
    super("MapScene");
  }

  create(data: MapData) {
    this.defeatedIds = data.defeatedIds ?? [];
    this.currentMonsterIndex = data.monsterIndex ?? 0;

    const { width, height } = this.scale;
    const config = GameState.runConfig!;

    this.add.rectangle(0, 0, width, height, 0x0d0d1a).setOrigin(0);

    this.add
      .text(width / 2, 36, "THE GAUNTLET", { fontSize: "36px", color: "#ffd700", fontStyle: "bold" })
      .setOrigin(0.5);

    this.drawHeroPanel();
    this.drawMonsterNodes(config, width, height);
    this.drawManageMovesButton(width, height);

    if (this.defeatedIds.length === 5) {
      this.add
        .text(width / 2, height - 40, "YOU HAVE CONQUERED THE GAUNTLET!", {
          fontSize: "28px", color: "#ffd700", fontStyle: "bold",
        })
        .setOrigin(0.5);
    }
  }

  private drawHeroPanel() {
    const h = GameState.hero;
    const xpNeeded = h.level * (GameState.runConfig!.heroDefaults.xpPerLevel);
    const panel = this.add.rectangle(10, 80, 230, 130, 0x1a1a3a, 0.9).setOrigin(0);
    this.add.text(20, 90, `Knight  Lv.${h.level}`, { fontSize: "16px", color: "#ffd700", fontStyle: "bold" });
    this.add.text(20, 112, `HP: ${h.maxHp}  ATK: ${h.attack}  DEF: ${h.defense}  MAG: ${h.magic}`, { fontSize: "13px", color: "#ccc" });
    this.add.text(20, 132, `XP: ${h.xp} / ${xpNeeded}`, { fontSize: "13px", color: "#88aaff" });
    this.add.text(20, 152, `Equipped moves:`, { fontSize: "13px", color: "#aaa" });
    const moves = h.equippedMoves.map(id => GameState.runConfig!.moves[id]?.name ?? id).join(", ");
    this.add.text(20, 168, moves, { fontSize: "12px", color: "#fff", wordWrap: { width: 210 } });
    void panel; // suppress unused warning
  }

  private drawMonsterNodes(config: typeof GameState.runConfig, width: number, height: number) {
    const monsters = config!.monsters;
    const nodeY = height / 2;
    const spacing = (width - 120) / (monsters.length - 1);

    for (let i = 0; i < monsters.length; i++) {
      const m = monsters[i];
      const x = 60 + i * spacing;
      const isDefeated = this.defeatedIds.includes(m.id);
      const isNext = i === this.currentMonsterIndex && !isDefeated;
      const isLocked = i > this.currentMonsterIndex && !isDefeated;

      const color = isDefeated ? 0x2a5a2a : isNext ? 0x4a3a00 : 0x1a1a2a;
      const borderColor = isDefeated ? 0x44cc44 : isNext ? 0xffd700 : 0x444466;

      const node = this.add.rectangle(x, nodeY, 120, 100, color, 0.9)
        .setStrokeStyle(2, borderColor);

      if (!isLocked) {
        node.setInteractive({ useHandCursor: true });
        node.on("pointerover", () => node.setAlpha(0.75));
        node.on("pointerout", () => node.setAlpha(1));
        node.on("pointerdown", () => this.enterBattle(i));
      }

      const nameColor = isDefeated ? "#44cc44" : isNext ? "#ffd700" : "#666688";
      this.add.text(x, nodeY - 28, m.name, { fontSize: "14px", color: nameColor, fontStyle: "bold" }).setOrigin(0.5);
      this.add.text(x, nodeY - 10, `HP: ${m.stats.hp}`, { fontSize: "12px", color: "#aaa" }).setOrigin(0.5);
      this.add.text(x, nodeY + 6, `ATK: ${m.stats.attack} DEF: ${m.stats.defense}`, { fontSize: "11px", color: "#999" }).setOrigin(0.5);
      this.add.text(x, nodeY + 22, `MAG: ${m.stats.magic}`, { fontSize: "11px", color: "#999" }).setOrigin(0.5);

      const statusLabel = isDefeated ? "DEFEATED" : isNext ? "FIGHT" : "LOCKED";
      const statusColor = isDefeated ? "#44cc44" : isNext ? "#ffdd00" : "#555577";
      this.add.text(x, nodeY + 40, statusLabel, { fontSize: "13px", color: statusColor, fontStyle: "bold" }).setOrigin(0.5);

      // Connector line
      if (i < monsters.length - 1) {
        const lineColor = this.defeatedIds.includes(m.id) ? 0x44cc44 : 0x333355;
        this.add.line(0, 0, x + 60, nodeY, x + spacing - 60, nodeY, lineColor, 0.7).setOrigin(0);
      }
    }
  }

  private drawManageMovesButton(width: number, height: number) {
    const bg = this.add.rectangle(width - 10, height - 10, 200, 44, 0x2a2a5a, 0.9)
      .setOrigin(1, 1)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(width - 110, height - 32, "MANAGE MOVES", { fontSize: "16px", color: "#88aaff" }).setOrigin(0.5);

    bg.on("pointerover", () => { bg.setAlpha(1); txt.setColor("#ffffff"); });
    bg.on("pointerout", () => { bg.setAlpha(0.9); txt.setColor("#88aaff"); });
    bg.on("pointerdown", () => this.scene.launch("MoveManagementScene", { returnScene: "MapScene" }));
  }

  private enterBattle(monsterIndex: number) {
    const monster = GameState.runConfig!.monsters[monsterIndex];
    GameState.saveRun({
      currentMonsterIndex: monsterIndex,
      defeatedMonsterIds: this.defeatedIds,
      runConfig: GameState.runConfig!,
    });
    this.scene.start("BattleScene", {
      monster,
      monsterIndex,
      heroState: GameState.hero,
      defeatedIds: this.defeatedIds,
    });
  }
}
