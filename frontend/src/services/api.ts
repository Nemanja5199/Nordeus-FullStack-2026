import type { ActiveBuff, ActiveDot, GearItem, HeroDefaults, MonsterConfig, MoveConfig, RunConfig } from "../types/game";
import type { MapTree } from "../utils/mockMapTree";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface BattleStatePayload {
  monsterId: string;
  monsterMoves: string[];
  monsterState: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
    activeBuffs: ActiveBuff[];
    activeDots: ActiveDot[];
  };
  heroState: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
    activeBuffs: ActiveBuff[];
    activeDots: ActiveDot[];
  };
  turnNumber: number;
  heroMoves: string[];
  lastMonsterMoves: string[];
}

export interface SavePayload {
  sessionId: string;
  hero: Record<string, unknown>;
  run?: Record<string, unknown> | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface GameMeta {
  monsters: MonsterConfig[];
  moves: Record<string, MoveConfig>;
  items: Record<string, GearItem>;
  heroDefaults: HeroDefaults;
}

export interface RunStart {
  mapTree: MapTree;
  seed: number;
}

let cachedMeta: GameMeta | null = null;

// Exported for tests; production callers should use api.getMeta().
export function _resetMetaCacheForTests(): void {
  cachedMeta = null;
}

export const api = {
  // Static config — fetched once per page session, then served from memory.
  // The payload is ~15 KB, so caching saves it on every retry/restart.
  getMeta: async (): Promise<GameMeta> => {
    if (!cachedMeta) cachedMeta = await request<GameMeta>("/api/run/meta");
    return cachedMeta;
  },

  // Run-specific data (~1.5 KB). Pass an existing seed to regenerate the same
  // map (used by Continue); omit to generate a fresh seed (used by New Game).
  startRun: (seed?: number) =>
    request<RunStart>(`/api/run/start${seed !== undefined ? `?seed=${seed}` : ""}`),

  // Convenience: meta + run combined into the legacy RunConfig shape.
  getRunConfig: async (seed?: number): Promise<RunConfig> => {
    const [meta, run] = await Promise.all([api.getMeta(), api.startRun(seed)]);
    return { ...meta, ...run };
  },

  getMonsterMove: (payload: BattleStatePayload) =>
    request<{ moveId: string; moveName: string }>("/api/battle/monster-move", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveGame: (payload: SavePayload) =>
    request<{ ok: boolean }>("/api/game/save", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  loadGame: (sessionId: string) =>
    request<{ hero: Record<string, unknown> | null; run: Record<string, unknown> | null }>(
      `/api/game/load/${sessionId}`,
    ),
};
