# RPG Gauntlet

A turn-based, branching-map RPG built for the Nordeus Job Fair 2026
Full-Stack Engineer challenge. Choose Knight or Mage, climb a 5-tier map of
monsters, manage gear and a moveset, and beat the dragon at the top.

**Live demo:** [nemanja5199.github.io/Nordeus-FullStack-2026](https://nemanja5199.github.io/Nordeus-FullStack-2026/)

> First visit may take ~30 s while the Render free-tier backend wakes up.
> Refresh once it does.

## Stack

| Layer    | Tech                                                 |
| -------- | ---------------------------------------------------- |
| Frontend | TypeScript, Phaser 3, Vite, Vitest                   |
| Backend  | Python, FastAPI, Pydantic, pytest                    |
| Database | Postgres (Supabase in prod, plain Postgres locally)  |
| Hosting  | GitHub Pages (frontend), Render (backend), Supabase  |

## Run locally

One command spins up everything: a real Postgres database, the FastAPI
backend, and the Vite dev server.

```sh
./dev.sh
```

Prerequisites: **Docker**, **Python 3.10+**, **Node 20+**.

The script:

1. Starts a local Postgres + PostgREST + nginx stack via Docker Compose
   (mimics Supabase's REST surface so the backend code is unchanged
   between local and prod)
2. Creates a Python venv, installs backend deps, starts FastAPI on `:8000`
3. Installs frontend deps, starts Vite on `:3000`
4. Traps Ctrl+C to shut everything down cleanly

Then open **http://localhost:3000** and play. Save data persists across
restarts because the local Postgres has a named volume.

To wipe local save state and start fresh:

```sh
docker compose -f local-dev/docker-compose.yml down -v
```

## Tests

```sh
# Frontend (Vitest)
cd frontend
npx vitest run

# Backend (pytest)
cd backend
python3 -m pytest tests/
```

Both suites run on every push via the GitHub Actions workflow.

## Project layout

```
frontend/                Phaser game client
  src/
    scenes/              one file per scene (battle, treemap, shop, …)
    ui/                  per-scene UI components, organised in subfolders
    state/               GameState, MetaProgress, cloud sync
    combat/              pure damage/buff math (heavily tested)
    audio/               music + SFX layer
    sprites/             monster + hero frame maps; class display names
    constants/           grouped design tokens (colors, layout, fonts, …)
    services/api.ts      typed wrapper over the backend
    types/game.ts        shared shapes (mirrored on the backend)

backend/
  app/
    main.py              FastAPI entrypoint, env-driven CORS
    models.py            Pydantic models — request/response + static data
    routers/
      run.py             /api/run/meta, /api/run/start (config + map)
      battle.py          /api/battle/monster_move (minimax AI)
      save.py            /api/game/save, /api/game/load (Supabase upsert)
    data/                hand-edited config (monsters, moves, items, …)
    tree_generator.py    Slay-the-Spire-style branching map generator
  tests/                 pytest suite (~200 tests)
  supabase/schema.sql    Postgres schema (used by both prod + local-dev)

local-dev/
  docker-compose.yml     Postgres + PostgREST + nginx for local dev
  nginx.conf             /rest/v1/* → PostgREST root mapping

docs/
  HOSTING.md             Full deploy plan (GitHub Pages + Render + Supabase)

.github/workflows/
  deploy-frontend.yml    Auto-deploy to GitHub Pages on push to main
```

## Design notes

A few non-obvious decisions worth flagging:

- **Stateless backend.** Every request derives its result from the payload;
  no in-memory game state is shared across requests. Multiple players hit
  the same endpoints concurrently with their own random `sessionId`.
- **Map seed is server-authoritative.** `/api/run/start` returns a seeded
  layout; the client renders it but can't tamper with the structure.
- **Monster AI is server-side minimax** with a depth-3 search. The
  evaluation function combines HP delta, buff value, and a repeat-penalty
  to discourage spam. See `backend/app/routers/battle.py`.
- **Type-safe data layer.** Static design data (`backend/app/data/*.py`)
  validates against Pydantic models at module import — a malformed move or
  monster fails the server boot, not a runtime request.
- **UI lives in `ui/<scene>/` subfolders** so each scene's components are
  discoverable and the top-level `ui/` stays focused on shared primitives.

For deploy details (env vars, secrets, verification checklist), see
[`docs/HOSTING.md`](docs/HOSTING.md).
