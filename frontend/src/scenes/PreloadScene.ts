import Phaser from "phaser";
import { Scene, BG, BORDER, TXT, FONT } from "../constants";
import { MetaProgress, GameState, Cloud } from "../state";
import { MusicAsset, SFX_FILES } from "../audio";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(Scene.Preload);
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG.DARKEST).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 40, "Loading...", {
        fontSize: FONT.LOAD,
        color: TXT.GOLD,
      })
      .setOrigin(0.5);

    const bar = this.add
      .rectangle(width / 2 - 200, height / 2 + 10, 0, 20, BORDER.GOLD)
      .setOrigin(0, 0.5);
    this.add.rectangle(width / 2, height / 2 + 10, 400, 20, BG.LOAD_BAR_TRACK).setOrigin(0.5);

    this.load.on("progress", (v: number) => bar.setSize(400 * v, 20));

    this.load.spritesheet("monsters", "/assets/sprites/monsters.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("rogues", "/assets/sprites/rogues.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("bg_brick", "/assets/bg/brick.png");
    this.load.image("bg_sand", "/assets/bg/sand.png");
    this.load.image("stat_hp", "/assets/items/misc/Heart.png");
    this.load.image("stat_atk", "/assets/items/weapon/Iron Sword.png");
    this.load.image("stat_def", "/assets/items/weapon/Iron Shield.png");
    this.load.image("stat_mag", "/assets/items/weapon/Magic Wand.png");
    this.load.image("stat_mp", "/assets/items/misc/Rune Stone.png");

    // Potions
    this.load.image("potion_hp", "/assets/items/potion/Red Potion 3.png");
    this.load.image("potion_mp", "/assets/items/potion/Blue Potion 3.png");

    // Item icons
    this.load.image("item_iron_sword", "/assets/items/weapon/Iron Sword.png");
    this.load.image("item_steel_blade", "/assets/items/weapon/Silver Sword.png");
    this.load.image("item_arcane_staff", "/assets/items/weapon/Emerald Staff.png");
    this.load.image("item_leather_cap", "/assets/items/custom/wizard_hat_blue.png");
    this.load.image("item_iron_helm", "/assets/items/equipment/Iron Helmet.png");
    this.load.image("item_leather_vest", "/assets/items/equipment/Leather Armor.png");
    this.load.image("item_chain_mail", "/assets/items/equipment/Iron Armor.png");
    this.load.image("item_gauntlets", "/assets/items/custom/metal_glove.png");
    this.load.image("item_spell_gloves", "/assets/items/custom/blue_glove.png");
    this.load.image("item_ring_of_strength", "/assets/items/custom/ring_red_crystal.png");
    this.load.image("item_ring_of_fortitude", "/assets/items/custom/ring_plain.png");
    this.load.image("item_arcane_ring", "/assets/items/custom/ring_purple_green.png");

    // New items
    this.load.image("item_wooden_wand", "/assets/items/weapon/Wooden Wand.png");
    this.load.image("item_war_club", "/assets/items/weapon/War Club.png");
    this.load.image("item_battlemage_sword", "/assets/items/weapon/Battlemage Sword.png");
    this.load.image("item_dragonfang_blade", "/assets/items/weapon/Dragonfang Blade.png");
    this.load.image("item_archmage_staff", "/assets/items/weapon/Archmage Staff.png");
    this.load.image("item_iron_skullcap", "/assets/items/equipment/Iron Skullcap.png");
    this.load.image("item_battle_helm", "/assets/items/equipment/Battle Helm.png");
    this.load.image("item_crown_of_embers", "/assets/items/equipment/Crown of Embers.png");
    this.load.image("item_mage_robe", "/assets/items/equipment/Mage Robe.png");
    this.load.image("item_battle_plate", "/assets/items/equipment/Battle Plate.png");
    this.load.image("item_aegis_mantle", "/assets/items/equipment/Aegis Mantle.png");
    this.load.image("item_iron_gauntlets", "/assets/items/equipment/Iron Gauntlets.png");
    this.load.image("item_sorcerer_wraps", "/assets/items/equipment/Sorcerer Wraps.png");
    this.load.image("item_crimson_gauntlets", "/assets/items/custom/golden_glove.png");
    this.load.image("item_ring_of_insight", "/assets/items/custom/ring_plain_gold.png");
    this.load.image("item_ring_of_vigor", "/assets/items/custom/gem_green.png");
    this.load.image("item_ring_of_power", "/assets/items/custom/orb_orange.png");

    // Music
    this.load.audio(MusicAsset.Menu1, "/assets/music/menu_1.mp3");
    this.load.audio(MusicAsset.Menu2, "/assets/music/menu_2.mp3");
    this.load.audio(MusicAsset.Map1, "/assets/music/map_1.mp3");
    this.load.audio(MusicAsset.Map2, "/assets/music/map_2.mp3");
    this.load.audio(MusicAsset.Battle1, "/assets/music/battle_1.mp3");
    this.load.audio(MusicAsset.Battle2, "/assets/music/battle_2.mp3");
    this.load.audio(MusicAsset.Death, "/assets/music/death.mp3");
    this.load.audio(MusicAsset.Victory, "/assets/music/victory.mp3");

    // SFX
    for (const [key, file] of Object.entries(SFX_FILES)) {
      this.load.audio(key, `/assets/sfx/${file}`);
    }
  }

  async create() {
    // Cloud hydrate before any module reads localStorage. Soft-fails offline.
    await Cloud.loadFromCloud();
    MetaProgress.load();
    GameState.loadSelectedClass();
    this.scene.start(Scene.MainMenu);
  }
}
