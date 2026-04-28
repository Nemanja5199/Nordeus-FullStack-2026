import random
from typing import Any

# Tier pools — depth 1 uses base goblins, depth 2 uses elite variants
TIER1_MONSTERS = ["goblin_warrior", "goblin_mage"]
TIER2_MONSTERS = ["giant_spider", "witch"]
BOSS_MONSTERS  = ["dragon"]
TIER1_ELITE_MONSTERS = ["skeleton", "lich"]

# Per-monster level bands: monsterLevel = clamp(heroLevel, min, max)
# 5% scaling per level: scaleFactor = 1 + 0.05 * (monsterLevel - 1)
MONSTER_LEVEL_BANDS: dict[tuple[str, int], dict] = {
    ("goblin_warrior",  1): {"min": 1,  "max": 3},
    ("goblin_mage",     1): {"min": 1,  "max": 2},
    ("skeleton",        2): {"min": 4,  "max": 6},
    ("lich",            2): {"min": 4,  "max": 5},
    ("giant_spider",    3): {"min": 13, "max": 14},
    ("giant_spider",    4): {"min": 23, "max": 23},
    ("witch",           3): {"min": 7,  "max": 10},
    ("witch",           4): {"min": 12, "max": 13},
    ("dragon",          5): {"min": 28, "max": 30},
}

# Probability that a node has 2 children instead of 1 (sparse branching)
BRANCH_PROB = 0.30


def generate_map_tree(seed: int | None = None) -> dict[str, Any]:
    """
    Generates a Slay the Spire-style branching map tree.

    Rules enforced:
    - 5 levels deep; boss at level 5
    - Each level has 2-3 nodes
    - Adjacent-column connections only (±1 position)
    - Sparse branching: ~30% chance of 2 children
    - All level-4 nodes converge to the boss
    - Every node must be reachable
    """
    rng = random.Random(seed)

    # Decide how many nodes per level (2 or 3)
    counts = [
        rng.choice([2, 3]),  # level 1
        rng.choice([2, 3]),  # level 2
        rng.choice([2, 3]),  # level 3
        rng.choice([2, 3]),  # level 4
        1,                   # level 5 (boss)
    ]

    # Build nodes
    nodes: dict[str, Any] = {}
    by_level: list[list[str]] = []

    for lvl_idx, count in enumerate(counts):
        level = lvl_idx + 1
        ids = [f"n{level}{chr(ord('a') + i)}" for i in range(count)]
        by_level.append(ids)

        for nid in ids:
            if level == 5:
                monster_id = rng.choice(BOSS_MONSTERS)
                node_type  = "boss"
            elif level == 2:
                monster_id = rng.choice(TIER1_ELITE_MONSTERS)
                node_type  = "monster"
            elif level == 1:
                monster_id = rng.choice(TIER1_MONSTERS)
                node_type  = "monster"
            else:
                monster_id = rng.choice(TIER2_MONSTERS)
                node_type  = "monster"

            nodes[nid] = {
                "id":        nid,
                "monsterId": monster_id,
                "level":     level,
                "levelBand": MONSTER_LEVEL_BANDS.get((monster_id, level), {"min": 1, "max": 1}),
                "children":  [],
                "type":      node_type,
            }

    boss_id = by_level[4][0]

    def pos(i: int, n: int) -> float:
        return i / (n - 1) if n > 1 else 0.5

    def adjacent(pi: int, n_p: int, ci: int, n_c: int) -> bool:
        return abs(pos(pi, n_p) - pos(ci, n_c)) <= 1.0 / max(n_p, n_c) + 0.05

    # Wire connections level by level
    for lvl_idx in range(4):
        parents  = by_level[lvl_idx]
        children = by_level[lvl_idx + 1]
        n_p = len(parents)
        n_c = len(children)

        # For each parent: which children are adjacent?
        adj_for_parent: list[list[int]] = []
        for pi in range(n_p):
            adj = [ci for ci in range(n_c) if adjacent(pi, n_p, ci, n_c)]
            if not adj:
                # nearest fallback
                adj = [min(range(n_c), key=lambda ci: abs(pos(pi, n_p) - pos(ci, n_c)))]
            adj_for_parent.append(adj)

        # For each child: which parents are adjacent?
        adj_for_child: list[list[int]] = []
        for ci in range(n_c):
            adj = [pi for pi in range(n_p) if adjacent(pi, n_p, ci, n_c)]
            if not adj:
                adj = [min(range(n_p), key=lambda pi: abs(pos(pi, n_p) - pos(ci, n_c)))]
            adj_for_child.append(adj)

        # Guarantee every child is reachable (each child gets ≥1 parent)
        for ci in range(n_c):
            pi = rng.choice(adj_for_child[ci])
            _add_child(nodes, parents[pi], children[ci])

        # Guarantee every parent has ≥1 child
        for pi, pid in enumerate(parents):
            if not nodes[pid]["children"]:
                ci = rng.choice(adj_for_parent[pi])
                _add_child(nodes, pid, children[ci])

        # Sparse extra branching: some parents get a 2nd child
        for pi, pid in enumerate(parents):
            if rng.random() < BRANCH_PROB:
                extras = [
                    ci for ci in adj_for_parent[pi]
                    if children[ci] not in nodes[pid]["children"]
                ]
                if extras:
                    _add_child(nodes, pid, children[rng.choice(extras)])

    # All level-4 nodes must connect to boss
    for pid in by_level[3]:
        if boss_id not in nodes[pid]["children"]:
            nodes[pid]["children"].append(boss_id)

    roots = by_level[0]
    return {"nodes": nodes, "roots": roots}


def _add_child(nodes: dict[str, Any], parent_id: str, child_id: str) -> None:
    if child_id not in nodes[parent_id]["children"]:
        nodes[parent_id]["children"].append(child_id)
