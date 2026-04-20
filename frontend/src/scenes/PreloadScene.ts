import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0d0905).setOrigin(0);
    this.add.text(width / 2, height / 2 - 40, "Loading...", {
      fontSize: "28px", color: "#c8a035",
    }).setOrigin(0.5);

    const bar = this.add.rectangle(width / 2 - 200, height / 2 + 10, 0, 20, 0x7a5828).setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 10, 400, 20, 0x2a2010).setOrigin(0.5);

    this.load.on("progress", (v: number) => bar.setSize(400 * v, 20));

    this.load.spritesheet("monsters", "/assets/32rogues/monsters.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("rogues",   "/assets/32rogues/rogues.png",   { frameWidth: 32, frameHeight: 32 });
    this.load.image("bg_brick", "/assets/256x256/256_Brick 01 Mud.png");
    this.load.image("stat_hp",  "/assets/Items Assets/Misc/Heart.png");
    this.load.image("stat_atk", "/assets/Items Assets/Weapon & Tool/Iron Sword.png");
    this.load.image("stat_def", "/assets/Items Assets/Weapon & Tool/Iron Shield.png");
    this.load.image("stat_mag", "/assets/Items Assets/Weapon & Tool/Magic Wand.png");
  }

  create() {
    this.scene.start("MainMenuScene");
  }
}
