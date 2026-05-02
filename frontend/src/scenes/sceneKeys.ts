// Phaser scene keys. Used by scene.start/stop/launch/bringToTop and
// returnScene/sourceScene fields in scene data.
export const Scene = {
  Preload: "PreloadScene",
  MainMenu: "MainMenuScene",
  CharacterSelect: "CharacterSelectScene",
  Battle: "BattleScene",
  PostBattle: "PostBattleScene",
  TreeMap: "TreeMapScene",
  Equipment: "EquipmentScene",
  Shop: "ShopScene",
  Upgrades: "UpgradesScene",
  MoveManagement: "MoveManagementScene",
  Options: "OptionsScene",
} as const;

export type SceneKey = typeof Scene[keyof typeof Scene];
