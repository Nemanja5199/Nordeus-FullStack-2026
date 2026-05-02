# Hosting

## Stack

```
GitHub Pages    →  frontend (static dist/)
Render          →  backend (FastAPI in Docker)
Supabase        →  cloud Postgres (already external; nothing to host)
```

All three are free at the traffic levels expected for a job-fair submission.
Total monthly cost: $0.

### Why these choices

- **GitHub Pages over Vercel/Netlify** — the repo is the audit trail; reviewer
  visiting `github.com/<user>/<repo>` sees the code and clicks through to the
  live deploy at `<user>.github.io/<repo>`. Single source of truth, no extra
  account to provision.
- **Render** — free Web Service tier, Docker-based, GitHub-connected for
  auto-deploys on push. (Fly.io would be the no-cold-start alternative but
  its free tier was removed in late 2024.)
- **Supabase already chosen** — the save/load flow uses it; no migration.

### The Render cold-start tradeoff

Render's free Web Service **sleeps after 15 min of inactivity** and takes
~30 s to wake on the first request afterwards. For an evaluator clicking
once and waiting, that 30 s feels broken.

Two ways to handle it:

1. **Accept it** — first hit is slow, subsequent hits are fast. Document the
   delay in the README so the reviewer knows it's normal.
2. **Keep it warm** — set up [UptimeRobot](https://uptimerobot.com) (free) to
   ping `https://<service>.onrender.com/health` every 14 min. The service
   never idles long enough to sleep. Recommended for the demo window.

## Multi-user readiness

The architecture is already concurrency-safe; **no code changes needed** to
support many simultaneous players.

- `sessionId` is generated client-side as `crypto.randomUUID()` per browser
  (`frontend/src/state/cloudSync.ts`). No collisions.
- The FastAPI backend is stateless — every request derives its result from the
  request body. No shared mutable state across requests.
- Supabase tables (`hero_progress`, `run_saves`) are keyed on `session_id`;
  each player gets their own rows.

What's _not_ in place (nice-to-have, not blocking for a demo):

- No rate limiting on the API. A malicious user could spam
  `/api/battle/monster_move` and burn CPU. Fine for evaluation.
- No auth — anyone with a `session_id` can read/write that row. Sessions are
  random UUIDs so collision/guessing is unrealistic.

---

## Pre-deploy state

The `hosting` branch contains the prep work needed before either deploy will
work:

- `backend/app/main.py` — env-driven CORS (was `["*"]`); reads
  `CORS_ALLOWED_ORIGINS` and adds it on top of localhost dev origins.
- `backend/Dockerfile` — drops `--reload` (dev only), respects `$PORT` env so
  Render's router can map external traffic.
- `backend/.env.example` — clarifies that `SUPABASE_KEY` must be the
  **service role** key (not anon), since the backend bypasses RLS.
- `frontend/vite.config.ts` — reads `BASE_PATH` env so prod builds get the
  GitHub Pages sub-path baked in.
- `.github/workflows/deploy-frontend.yml` — auto-deploy on push to `main`
  when anything under `frontend/` changes.

---

## Deploying the frontend (GitHub Pages)

Fully automated via the workflow once these one-time settings are in place:

### 1. Enable Pages on the repo

Repo → Settings → Pages → **Source: GitHub Actions**.

### 2. Add the backend URL as a repo secret

Repo → Settings → Secrets and variables → Actions → New repository secret.

- **Name:** `VITE_API_URL`
- **Value:** `https://<your-service>.onrender.com` (set this _after_ the
  Render deploy in the next section)

If this secret is missing or wrong, the built game will try to call
`http://localhost:8000` and silently fail.

### 3. Push to main

The workflow runs on push to `main` whenever `frontend/**` changes. It:

1. Installs Node 20 + frontend deps
2. Runs `tsc --noEmit` and `vitest run` (build aborts if either fails)
3. Builds with `BASE_PATH=/<repo-name>/` and `VITE_API_URL=$secret`
4. Uploads `frontend/dist/` and deploys

Expected URL: `https://<github-user>.github.io/<repo-name>/`.

### 4. Manual trigger

Workflow includes `workflow_dispatch` — re-run from the Actions tab if a
secret changes and you want to redeploy without a code push.

---

## Deploying the backend (Render)

One-time setup via the Render dashboard:

### 1. Create the Web Service

- Sign in at [render.com](https://render.com) (GitHub OAuth is easiest).
- New → **Web Service** → connect this repo.
- Settings:
  - **Name:** `<your-service>` (becomes the URL prefix)
  - **Region:** closest to expected traffic
  - **Branch:** `main`
  - **Root Directory:** `backend`
  - **Runtime:** **Docker** (Render reads the Dockerfile)
  - **Instance Type:** Free
- Leave the build/start commands blank — the Dockerfile handles both.

### 2. Set environment variables

Same screen, "Environment" section:

| Key                      | Value                                       |
| ------------------------ | ------------------------------------------- |
| `SUPABASE_URL`           | `https://<project>.supabase.co`             |
| `SUPABASE_KEY`           | `<service-role-key>` (from Supabase dashboard) |
| `CORS_ALLOWED_ORIGINS`   | `https://<github-user>.github.io`           |

> `PORT` is set automatically by Render — the Dockerfile reads it via
> `${PORT:-8000}` so no manual config needed.

### 3. Create

Click "Create Web Service". Render builds the Docker image, deploys, and
shows logs. First build takes 3–5 min.

### 4. Verify

Once the service is live:

```sh
curl https://<your-service>.onrender.com/health
# → {"status":"ok"}

curl https://<your-service>.onrender.com/api/run/meta | head -c 200
# → JSON config
```

Copy the `https://<your-service>.onrender.com` URL — this is what goes into
the `VITE_API_URL` repo secret in the frontend section above.

### 5. Subsequent deploys

Render auto-deploys on every push to `main` that touches `backend/**` (it
watches the connected repo). No CLI tool needed; check status in the Render
dashboard.

### 6. Optional: keep-warm pinger

To avoid cold starts during the evaluation window:

- Sign up at [uptimerobot.com](https://uptimerobot.com).
- Add a HTTP(S) monitor pointing at `https://<your-service>.onrender.com/health`
  every 5 min (free tier).
- The free Render Web Service stays awake as long as it's pinged within the
  15-min idle window.

---

## End-to-end verification

After both deploys are live:

1. Open `https://<github-user>.github.io/<repo-name>/` in an incognito tab.
2. Open dev tools, watch the Network panel.
3. Click "New Game" → confirm `/api/run/meta` and `/api/run/start` return 200
   from the Render URL.
4. Pick a class, win a battle, watch `/api/game/save` POST succeed.
5. Close tab, reopen → "Continue" → confirm `/api/game/load/<session_id>` GET
   returns the saved hero.
6. Open in a second incognito window → confirm a different `session_id` is
   issued (concurrent multi-user check).

If any step 404s, check:

- CORS — is `CORS_ALLOWED_ORIGINS` set on Render to the exact GitHub Pages
  origin (no trailing slash, includes `https://`)?
- API base — is `VITE_API_URL` set on the GitHub repo and was the workflow
  re-run after setting it?
- Supabase — do the tables exist? `supabase/` directory has the schema.

---

## Rough costs

| Service        | Free tier limit                          | This game's usage  |
| -------------- | ---------------------------------------- | ------------------ |
| GitHub Pages   | 1 GB storage, 100 GB/mo bandwidth        | ~5 MB, negligible  |
| Render         | 750 hours/month, 512 MB RAM, sleeps      | 1 service, idle most of the time |
| Supabase       | 500 MB DB, 2 GB bandwidth, 50 K MAU      | <1 MB DB, low      |

Free tiers will not be exceeded by demo traffic. Render's 750 hr/mo limit is
~31 days × 24 hr; one always-on service uses 720 hr — fits with margin.
