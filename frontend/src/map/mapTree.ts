export interface MapTreeNode {
  id: string;
  monsterId?: string; // absent for shop nodes
  level: number; // 1-5
  levelBand: { min: number; max: number };
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
