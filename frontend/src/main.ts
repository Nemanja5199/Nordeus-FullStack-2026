import Phaser from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { BattleScene } from "./scenes/BattleScene";
import { PostBattleScene } from "./scenes/PostBattleScene";
import { MoveManagementScene } from "./scenes/MoveManagementScene";
import { TreeMapScene } from "./scenes/TreeMapScene";
import { EquipmentScene } from "./scenes/EquipmentScene";
import { ShopScene } from "./scenes/ShopScene";
import { UpgradesScene } from "./scenes/UpgradesScene";
import { OptionsScene } from "./scenes/OptionsScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: "#0a0a1e",
  scene: [
    PreloadScene,
    MainMenuScene,
    CharacterSelectScene,
    BattleScene,
    PostBattleScene,
    MoveManagementScene,
    TreeMapScene,
    EquipmentScene,
    ShopScene,
    UpgradesScene,
    OptionsScene,
  ],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
};

new Phaser.Game(config);
