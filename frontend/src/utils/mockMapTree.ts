export interface MapTreeNode {
  id: string;
  monsterId?: string; // absent for shop nodes
  level: number; // 1-5
  children: string[]; // node IDs
  type?: "monster" | "boss" | "shop";
}

export interface MapTree {
  nodes: Record<string, MapTreeNode>;
  roots: string[]; // level-1 node IDs the player can choose from
}

export type TreeNodeState = "available" | "completed" | "locked";

export function getNodeState(
  nodeId: string,
  tree: MapTree,
  completedIds: string[],
  currentNodeId: string | null,
): TreeNodeState {
  if (completedIds.includes(nodeId)) return "completed";
  if (currentNodeId === null) {
    if (tree.roots.includes(nodeId)) return "available";
  } else {
    if (tree.nodes[currentNodeId]?.children.includes(nodeId)) return "available";
  }
  return "locked";
}

// ─── Mock tree (5 levels, merges included) ───────────────────────────────────
// Tier 1 (levels 1-2): goblin_warrior, goblin_mage
// Tier 2 (levels 3-4): giant_spider, witch
// Boss   (level 5):    dragon
//
// Merge examples:
//   n1a+n1b both lead to n2a (merge at level 2)
//   n2b+n2c both lead to n3b (merge at level 3)
//   n4a+n4b both lead to boss (converge)

export const MOCK_MAP_TREE: MapTree = {
  roots: ["n1a", "n1b", "n1c"],
  nodes: {
    // ── Level 1 (tier 1) ──────────────────────────────────────────────────
    n1a: { id: "n1a", monsterId: "goblin_warrior", level: 1, children: ["n2a"] },
    n1b: { id: "n1b", monsterId: "goblin_mage", level: 1, children: ["n2a", "n2b"] },
    n1c: { id: "n1c", monsterId: "goblin_warrior", level: 1, children: ["n2c"] },
    // ── Level 2 (tier 1) ──────────────────────────────────────────────────
    n2a: { id: "n2a", monsterId: "goblin_mage", level: 2, children: ["n3a"] },
    n2b: { id: "n2b", monsterId: "goblin_warrior", level: 2, children: ["n3a", "n3b"] },
    n2c: { id: "n2c", monsterId: "goblin_mage", level: 2, children: ["n3b"] },
    // ── Level 3 (tier 2) ──────────────────────────────────────────────────
    n3a: { id: "n3a", monsterId: "giant_spider", level: 3, children: ["n4a"] },
    n3b: { id: "n3b", level: 3, children: ["n4a", "n4b"], type: "shop" },
    // ── Level 4 (tier 2) ──────────────────────────────────────────────────
    n4a: { id: "n4a", monsterId: "witch", level: 4, children: ["boss"] },
    n4b: { id: "n4b", monsterId: "giant_spider", level: 4, children: ["boss"] },
    // ── Level 5 (boss) ────────────────────────────────────────────────────
    boss: { id: "boss", monsterId: "dragon", level: 5, children: [], type: "boss" },
  },
};

// Test state: player chose n1a → n2b → n3a, now picking between n4a and n4b
export const MOCK_COMPLETED: string[] = ["n1a", "n2b", "n3a"];
export const MOCK_CURRENT_NODE: string = "n3a";
