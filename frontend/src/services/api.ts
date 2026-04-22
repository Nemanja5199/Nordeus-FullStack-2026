import type { ActiveBuff, RunConfig } from "../types/game";

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
  };
  heroState: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    magic: number;
    activeBuffs: ActiveBuff[];
  };
  turnNumber: number;
  heroMoves: string[];
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

export const api = {
  getRunConfig: (seed?: number) =>
    request<RunConfig>(`/api/run/config${seed !== undefined ? `?seed=${seed}` : ""}`),

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
