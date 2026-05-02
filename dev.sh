#!/usr/bin/env bash
# Spin up the full local stack: Postgres+PostgREST+nginx (Docker), then
# backend (FastAPI), then frontend (Vite). Ctrl+C tears everything down.
#
# Usage:
#   ./dev.sh
#
# Requires: docker, python3.10+, node 20+
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO"

# ── Prerequisites ────────────────────────────────────────────────────────
need() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "✗ Missing prerequisite: $1"
        echo "  $2"
        exit 1
    fi
}

need docker  "Install Docker Desktop or Docker Engine: https://docs.docker.com/get-docker/"
need python3 "Install Python 3.10+: https://www.python.org/downloads/"
need node    "Install Node 20+: https://nodejs.org/"
need npm     "npm should ship with Node"

# Some systems use 'docker-compose' (v1) instead of 'docker compose' (v2).
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo "✗ Neither 'docker compose' nor 'docker-compose' is available."
    exit 1
fi

# ── Start the DB stack ───────────────────────────────────────────────────
echo "▶ Starting local DB (Postgres + PostgREST + nginx)…"
$DC -f local-dev/docker-compose.yml up -d --quiet-pull

echo "  Waiting for the stack to be ready…"
ATTEMPTS=0
until curl -sf http://localhost:54321/health >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -gt 60 ]; then
        echo "✗ DB stack failed to come up within 30s. Logs:"
        $DC -f local-dev/docker-compose.yml logs --tail=20
        exit 1
    fi
    sleep 0.5
done
echo "  ✓ DB stack ready at http://localhost:54321"

# ── Backend ──────────────────────────────────────────────────────────────
echo "▶ Setting up backend…"
cd backend
if [ ! -d .venv ]; then
    echo "  Creating Python venv…"
    python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
cd ..

echo "▶ Starting backend (FastAPI on :8000)…"
(
    cd backend
    # shellcheck disable=SC1091
    source .venv/bin/activate
    SUPABASE_URL=http://localhost:54321 \
    SUPABASE_KEY=local-dev-anon-key \
    CORS_ALLOWED_ORIGINS=http://localhost:3000 \
        exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) &
BACKEND_PID=$!

# Wait for /health
ATTEMPTS=0
until curl -sf http://localhost:8000/health >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -gt 30 ]; then
        echo "✗ Backend failed to come up. Did it crash?"
        kill "$BACKEND_PID" 2>/dev/null || true
        exit 1
    fi
    sleep 0.5
done
echo "  ✓ Backend ready at http://localhost:8000"

# ── Frontend ─────────────────────────────────────────────────────────────
echo "▶ Setting up frontend…"
cd frontend
if [ ! -d node_modules ]; then
    echo "  Installing npm packages…"
    npm install --silent
fi
cd ..

echo "▶ Starting frontend (Vite on :3000)…"
(
    cd frontend
    VITE_API_URL=http://localhost:8000 exec npm run dev -- --host 127.0.0.1
) &
FRONTEND_PID=$!

# ── Cleanup ──────────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo "▶ Shutting down…"
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    $DC -f local-dev/docker-compose.yml down
    echo "  ✓ All stopped."
    exit 0
}
trap cleanup INT TERM

cat <<EOF

═════════════════════════════════════════════════════════════════
  RPG Gauntlet — running locally

    Game:     http://localhost:3000
    API:      http://localhost:8000
    DB API:   http://localhost:54321/rest/v1
    Postgres: localhost:5432  (user: postgres / pass: localdev)

  Press Ctrl+C to stop everything.
═════════════════════════════════════════════════════════════════

EOF

# Block until either the backend or frontend exits. Polling instead of
# `wait -n` because bash 3.2 (default on macOS) doesn't support -n.
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done
cleanup
