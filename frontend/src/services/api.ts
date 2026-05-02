import type { ActiveBuff, ActiveDot, GearItem, HeroClass, HeroDefaults, MetaUpgrade, MonsterConfig, MoveConfig, RunConfig } from "../types/game";
import type { MapTree } from "../map";

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

// Sections optional — backend only updates the columns we send.
export interface SavePayload {
  sessionId: string;
  hero?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  run?: Record<string, unknown> | null;
}

export interface LoadGameResponse {
  hero: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  run: Record<string, unknown> | null;
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
  heroClasses: Record<HeroClass, HeroDefaults>;
  upgrades: MetaUpgrade[];
}

export interface RunStart {
  mapTree: MapTree;
  seed: number;
}

let cachedMeta: GameMeta | null = null;

export function _resetMetaCacheForTests(): void {
  cachedMeta = null;
}

export const api = {
  // Static ~15 KB payload; cached for the page session.
  getMeta: async (): Promise<GameMeta> => {
    if (!cachedMeta) cachedMeta = await request<GameMeta>("/api/run/meta");
    return cachedMeta;
  },

  // Pass a seed to regenerate the same map (Continue); omit for fresh seed.
  startRun: (seed?: number) =>
    request<RunStart>(`/api/run/start${seed !== undefined ? `?seed=${seed}` : ""}`),

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
    request<LoadGameResponse>(`/api/game/load/${sessionId}`),
};
