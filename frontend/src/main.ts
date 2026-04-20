import Phaser from "phaser";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { MapScene } from "./scenes/MapScene";
import { BattleScene } from "./scenes/BattleScene";
import { PostBattleScene } from "./scenes/PostBattleScene";
import { MoveManagementScene } from "./scenes/MoveManagementScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: "#0a0a1e",
  scene: [MainMenuScene, MapScene, BattleScene, PostBattleScene, MoveManagementScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
