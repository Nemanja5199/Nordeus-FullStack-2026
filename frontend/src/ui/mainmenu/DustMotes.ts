import Phaser from "phaser";
import { DUST_MOTE_COLOR } from "../../constants";

// Sprinkles ~80 small drifting circles across the screen to give static
// menu backgrounds a sense of atmosphere. Static — no animation.
export function spawnDustMotes(scene: Phaser.Scene, width: number, height: number, count = 80): void {
  for (let i = 0; i < count; i++) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(0, height);
    const size = Math.random() < 0.3 ? 2 : 1;
    scene.add.circle(x, y, size, DUST_MOTE_COLOR, Math.random() * 0.35 + 0.05);
  }
}
