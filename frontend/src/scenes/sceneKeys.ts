// Single source of truth for Phaser scene keys. Every scene transition
// (`scene.start`, `scene.stop`, `scene.launch`, `scene.bringToTop`) and any
// scene-data field that carries a return target (`returnScene`,
// `sourceScene`) goes through these constants instead of bare strings.
//
// `as const` over a TS `enum` because the values stay literal strings —
// matches Phaser's API, no runtime number-mapping overhead, and the union
// type below stays usable everywhere a scene-key string is expected.
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
