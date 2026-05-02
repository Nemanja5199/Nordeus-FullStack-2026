import Phaser from "phaser";
import { Scene } from "./sceneKeys";
import { BG_DARKEST, BG_LOAD_BAR_TRACK, BORDER_GOLD, TXT_GOLD } from "../ui/colors";
import { FONT_LOAD } from "../ui/typography";
import { MetaProgress } from "../utils/metaProgress";
import { GameState } from "../utils/gameState";
import { Cloud } from "../utils/cloudSync";
import { MusicAsset } from "../utils/audio";
import { SFX_FILES } from "../utils/sfx";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(Scene.Preload);
  }

  preload() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, BG_DARKEST).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 40, "Loading...", {
        fontSize: FONT_LOAD,
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
    this.load.image("stat_mp", "/assets/Items Assets/Misc/Rune Stone.png");

    // Potions
    this.load.image("potion_hp", "/assets/Items Assets/Potion/Red Potion 3.png");
    this.load.image("potion_mp", "/assets/Items Assets/Potion/Blue Potion 3.png");

    // Item icons
    this.load.image("item_iron_sword", "/assets/Items Assets/Weapon & Tool/Iron Sword.png");
    this.load.image("item_steel_blade", "/assets/Items Assets/Weapon & Tool/Silver Sword.png");
    this.load.image("item_arcane_staff", "/assets/Items Assets/Weapon & Tool/Emerald Staff.png");
    this.load.image("item_leather_cap", "/assets/Items Assets/Custom/wizard_hat_blue.png");
    this.load.image("item_iron_helm", "/assets/Items Assets/Equipment/Iron Helmet.png");
    this.load.image("item_leather_vest", "/assets/Items Assets/Equipment/Leather Armor.png");
    this.load.image("item_chain_mail", "/assets/Items Assets/Equipment/Iron Armor.png");
    this.load.image("item_gauntlets", "/assets/Items Assets/Custom/metal_glove.png");
    this.load.image("item_spell_gloves", "/assets/Items Assets/Custom/blue_glove.png");
    this.load.image("item_ring_of_strength", "/assets/Items Assets/Custom/ring_red_crystal.png");
    this.load.image("item_ring_of_fortitude", "/assets/Items Assets/Custom/ring_plain.png");
    this.load.image("item_arcane_ring", "/assets/Items Assets/Custom/ring_purple_green.png");

    // New items
    this.load.image("item_wooden_wand", "/assets/Items Assets/Weapon & Tool/Wooden Wand.png");
    this.load.image("item_war_club", "/assets/Items Assets/Weapon & Tool/War Club.png");
    this.load.image("item_battlemage_sword", "/assets/Items Assets/Weapon & Tool/Battlemage Sword.png");
    this.load.image("item_dragonfang_blade", "/assets/Items Assets/Weapon & Tool/Dragonfang Blade.png");
    this.load.image("item_archmage_staff", "/assets/Items Assets/Weapon & Tool/Archmage Staff.png");
    this.load.image("item_iron_skullcap", "/assets/Items Assets/Equipment/Iron Skullcap.png");
    this.load.image("item_battle_helm", "/assets/Items Assets/Equipment/Battle Helm.png");
    this.load.image("item_crown_of_embers", "/assets/Items Assets/Equipment/Crown of Embers.png");
    this.load.image("item_mage_robe", "/assets/Items Assets/Equipment/Mage Robe.png");
    this.load.image("item_battle_plate", "/assets/Items Assets/Equipment/Battle Plate.png");
    this.load.image("item_aegis_mantle", "/assets/Items Assets/Equipment/Aegis Mantle.png");
    this.load.image("item_iron_gauntlets", "/assets/Items Assets/Equipment/Iron Gauntlets.png");
    this.load.image("item_sorcerer_wraps", "/assets/Items Assets/Equipment/Sorcerer Wraps.png");
    this.load.image("item_crimson_gauntlets", "/assets/Items Assets/Custom/golden_glove.png");
    this.load.image("item_ring_of_insight", "/assets/Items Assets/Custom/ring_plain_gold.png");
    this.load.image("item_ring_of_vigor", "/assets/Items Assets/Custom/gem_green.png");
    this.load.image("item_ring_of_power", "/assets/Items Assets/Custom/orb_orange.png");

    // Background music — two variants per scene group where applicable;
    // AudioManager picks randomly each play so back-to-back entries don't
    // repeat exactly. Death loops for the upgrades flow; victory is a
    // one-shot stinger on win.
    this.load.audio(MusicAsset.Menu1, "/assets/music/menu_1.mp3");
    this.load.audio(MusicAsset.Menu2, "/assets/music/menu_2.mp3");
    this.load.audio(MusicAsset.Map1, "/assets/music/map_1.mp3");
    this.load.audio(MusicAsset.Map2, "/assets/music/map_2.mp3");
    this.load.audio(MusicAsset.Battle1, "/assets/music/battle_1.mp3");
    this.load.audio(MusicAsset.Battle2, "/assets/music/battle_2.mp3");
    this.load.audio(MusicAsset.Death, "/assets/music/death.mp3");
    this.load.audio(MusicAsset.Victory, "/assets/music/victory.mp3");

    // SFX — every cue defined in sfx.ts. Iterating SFX_FILES keeps the
    // loader in lockstep with SfxAsset constants so adding a new SFX is
    // a one-place change.
    for (const [key, file] of Object.entries(SFX_FILES)) {
      this.load.audio(key, `/assets/sfx/${file}`);
    }
  }

  async create() {
    // Cloud hydrate first so MetaProgress/Settings/GameState read the
    // freshly-pulled localStorage values on their next access. Failure is
    // soft — if the network is down we fall through to the local cache.
    await Cloud.loadFromCloud();
    MetaProgress.load();
    GameState.loadSelectedClass();
    this.scene.start(Scene.MainMenu);
  }
}
