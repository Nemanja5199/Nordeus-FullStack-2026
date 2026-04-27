import Phaser from "phaser";

export interface ScrollableAreaOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  contentHeight?: number;
  scrollSpeed?: number;
}

export interface ScrollableArea {
  /**
   * Add children to this container. Their x/y is treated as relative to
   * (opts.x, opts.y) — i.e. y=0 corresponds to the top of the visible viewport.
   */
  container: Phaser.GameObjects.Container;
  setContentHeight(h: number): void;
  /** Re-evaluate which children are inside the viewport (call after adding/removing children). */
  refreshInputState(): void;
  destroy(): void;
}

/**
 * Vertically scrollable, mouse-wheel driven viewport.
 *
 * Children are clipped to a width×height window starting at (x, y).
 * Add children with positions relative to that origin (a child at y=0
 * sits at the top of the viewport). Scrolling moves the inner container,
 * clamped so you can't scroll past either edge.
 *
 * Wheel events are registered on the scene; cleanup runs on scene shutdown
 * or when destroy() is called.
 */
export function createScrollableArea(
  scene: Phaser.Scene,
  opts: ScrollableAreaOptions,
): ScrollableArea {
  const { x, y, width, height } = opts;
  const scrollSpeed = opts.scrollSpeed ?? 1;

  const container = scene.add.container(x, y);

  // Geometry mask covering the viewport — children outside it are clipped.
  // Add to display list (not just make.graphics) so children.removeAll(true) cleans it up too.
  const maskGfx = scene.add.graphics();
  maskGfx.fillStyle(0xffffff);
  maskGfx.fillRect(x, y, width, height);
  maskGfx.setVisible(false);
  container.setMask(maskGfx.createGeometryMask());

  let maxOffset = Math.max(0, (opts.contentHeight ?? 0) - height);

  // Geometry masks clip rendering but NOT input. Without this, off-viewport
  // children still receive clicks. Toggle interactivity (on each child and any
  // nested children) based on whether the child's bounding box overlaps the viewport.
  const setEnabledRecursive = (
    obj: Phaser.GameObjects.GameObject & { input?: Phaser.Types.Input.InteractiveObject | null; list?: Phaser.GameObjects.GameObject[] },
    enabled: boolean,
  ) => {
    if (obj.input) obj.input.enabled = enabled;
    if (Array.isArray(obj.list)) {
      for (const child of obj.list) setEnabledRecursive(child as typeof obj, enabled);
    }
  };

  const updateInputState = () => {
    if (!container.scene) return;
    const top = y;
    const bottom = y + height;
    for (const obj of container.list as Phaser.GameObjects.GameObject[]) {
      const sprite = obj as typeof obj & {
        getBounds?: () => Phaser.Geom.Rectangle;
        y?: number;
        displayHeight?: number;
        height?: number;
      };
      let visible: boolean;
      if (typeof sprite.getBounds === "function") {
        const b = sprite.getBounds();
        visible = b.bottom >= top && b.top <= bottom;
      } else {
        const sceneY = container.y + (sprite.y ?? 0);
        const halfH = (sprite.displayHeight ?? sprite.height ?? 0) / 2;
        visible = sceneY + halfH >= top && sceneY - halfH <= bottom;
      }
      setEnabledRecursive(sprite as Parameters<typeof setEnabledRecursive>[0], visible);
    }
  };

  const onWheel = (
    pointer: Phaser.Input.Pointer,
    _objects: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
  ) => {
    if (!container.scene) return;
    if (
      pointer.x < x ||
      pointer.x > x + width ||
      pointer.y < y ||
      pointer.y > y + height
    ) {
      return;
    }
    const next = Phaser.Math.Clamp(container.y - dy * scrollSpeed, y - maxOffset, y);
    if (next === container.y) return;
    container.y = next;
    updateInputState();
  };

  scene.input.on("wheel", onWheel);

  const cleanup = () => {
    scene.input.off("wheel", onWheel);
    if (maskGfx.scene) maskGfx.destroy();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);

  return {
    container,
    setContentHeight(h: number) {
      maxOffset = Math.max(0, h - height);
      container.y = Phaser.Math.Clamp(container.y, y - maxOffset, y);
      updateInputState();
    },
    refreshInputState: updateInputState,
    destroy() {
      cleanup();
      container.destroy();
    },
  };
}
