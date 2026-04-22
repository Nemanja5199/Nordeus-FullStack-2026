import Phaser from "phaser";
import { BG_DARKEST, BG_LOAD_BAR_TRACK, BORDER_GOLD, TXT_GOLD } from "../ui/colors";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 40, "Loading...", {
        fontSize: "28px",
        color: TXT_GOLD,
      })
      .setOrigin(0.5);

    const bar = this.add
      .rectangle(width / 2 - 200, height / 2 + 10, 0, 20, BORDER_GOLD)
      .setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 10, 400, 20, BG_LOAD_BAR_TRACK).setOrigin(0.5);

    this.load.on("progress", (v: number) => bar.setSize(400 * v, 20));

    this.load.spritesheet("monsters", "/assets/32rogues/monsters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("rogues", "/assets/32rogues/rogues.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("bg_brick", "/assets/256x256/256_Brick 01 Mud.png");
    this.load.image("bg_sand", "/assets/256x256/256_Sand 01.png");
    this.load.image("stat_hp", "/assets/Items Assets/Misc/Heart.png");
    this.load.image("stat_atk", "/assets/Items Assets/Weapon & Tool/Iron Sword.png");
    this.load.image("stat_def", "/assets/Items Assets/Weapon & Tool/Iron Shield.png");
    this.load.image("stat_mag", "/assets/Items Assets/Weapon & Tool/Magic Wand.png");
  }

  create() {
    this.scene.start("MainMenuScene");
  }
}
