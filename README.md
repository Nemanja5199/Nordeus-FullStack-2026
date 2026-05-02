# RPG Gauntlet

A turn-based, branching-map RPG built for the Nordeus Job Fair 2026
Full-Stack Engineer challenge. Pick a class, climb a five-tier map of
monsters, manage gear and a moveset, and beat the dragon at the top.

## Play

**[nemanja5199.github.io/Nordeus-FullStack-2026](https://nemanja5199.github.io/Nordeus-FullStack-2026/)**

> First load may take ~30 s while the free-tier backend wakes up. Refresh
> after that and it's instant.

## Stack

| Layer    | Tech                                                  |
| -------- | ----------------------------------------------------- |
| Frontend | TypeScript, Phaser 3, Vite, Vitest                    |
| Backend  | Python, FastAPI, Pydantic, pytest                     |
| Database | Postgres (Supabase managed)                           |
| Hosting  | GitHub Pages, Render, Supabase                        |

## Features

- **Two playable classes** — Knight (tanky, physical) and Mage (glass cannon, magic)
- **Branching map** — five tiers of monsters, multiple paths, all roads lead to the dragon
- **Nine unique monsters** with hand-tuned movesets (goblins, undead, witch, slime, spider, death knight, dragon)
- **Move-effect system** — physical, magic, and heal moves with buffs, debuffs, drains, DOTs, mp-burn, hp-cost
- **Equipment** — five gear slots, three rarity tiers, level-gated shop
- **Move learning** — defeat a monster, learn one of its moves; equip up to four
- **Skill points** — spend per-level on stats
- **Meta-progression** — shards persist across runs to buy permanent upgrades
- **Cloud save** — sessions sync to Supabase, picks up across devices
- **Server-side AI** — depth-3 minimax monster move selection (server-authoritative)
- **Polish** — animations, screen shake on heavy hits, music, SFX, accessibility settings

## Architecture notes

A few non-obvious decisions worth flagging:

- **Stateless backend** — every request derives its result from the payload;
  no in-memory game state shared across requests. Multiple players hit the
  same endpoints concurrently with their own random `sessionId`.
- **Server-authoritative map** — `/api/run/start` returns a seeded layout;
  the client renders it but can't tamper with structure or monster placement.
- **Server-side AI** — monster moves are chosen by a depth-3 minimax search
  on the backend (`backend/app/routers/battle.py`). The evaluation function
  combines HP delta, buff value, and a repeat-penalty so the AI doesn't
  spam the same move.
- **Type-safe data layer** — static design data (`backend/app/data/*.py`)
  validates against Pydantic models at module import. A misshapen move or
  monster fails the server boot, not a runtime request.
- **Per-scene UI** — each Phaser scene's UI components live in
  `frontend/src/ui/<scene>/`; top-level `ui/` holds shared primitives
  (Button, ScrollableArea, TooltipManager, HeroPanel).

## Tests

```sh
# Frontend (Vitest, ~210 tests)
cd frontend && npx vitest run

# Backend (pytest, ~190 tests)
cd backend && python3 -m pytest tests/
```

Both suites run on every push.

## Run locally

The full local stack (real Postgres, the FastAPI backend, the Vite dev
server) is set up on a separate branch to keep `main` focused on what
gets deployed.

```sh
git checkout local-dev
```

Then follow that branch's `README.md`. Both `dev.sh` (macOS / Linux / WSL)
and `dev.bat` (Windows) are provided; one command spins up everything,
Ctrl+C / any-key tears it down.

Prerequisites: Docker Desktop, Python 3.10+, Node 20+.

## Deploy

For the full deploy plan — GitHub Pages workflow, Render setup, Supabase
secrets, end-to-end verification — see [`docs/HOSTING.md`](docs/HOSTING.md).

## Project layout

```
frontend/                Phaser game client (TypeScript)
  src/scenes/            one file per scene
  src/ui/<scene>/        per-scene UI components
  src/state/             GameState, MetaProgress, cloud sync
  src/combat/            damage / buff math (heavily tested)
  src/audio/             music + SFX
  src/sprites/           sprite frame maps + class display names
  src/constants/         design tokens (colors, layout, fonts)
  src/services/api.ts    typed wrapper over the backend
  src/types/game.ts      shared shapes (mirrored on the backend)

backend/
  app/main.py            FastAPI entrypoint, env-driven CORS
  app/models.py          Pydantic models (request/response + static data)
  app/routers/           run.py, battle.py, save.py
  app/data/              hand-edited config (monsters, moves, items, …)
  app/tree_generator.py  branching-map generator
  tests/                 pytest suite
  supabase/schema.sql    Postgres schema

docs/HOSTING.md          deploy plan
.github/workflows/       CI + frontend auto-deploy
```
