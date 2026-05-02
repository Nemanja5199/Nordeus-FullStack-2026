@echo off
REM Spin up the full local stack for Windows: Postgres+PostgREST+nginx
REM (Docker), then backend (FastAPI), then frontend (Vite).
REM
REM Usage (from CMD or PowerShell, in the repo root):
REM     dev.bat
REM
REM Requires: Docker Desktop, Python 3.10+, Node 20+
REM
REM On Linux/macOS/WSL, use ./dev.sh instead.
setlocal EnableDelayedExpansion

cd /d "%~dp0"

REM ── Prerequisites ────────────────────────────────────────────────────────
where docker >nul 2>nul || (echo X Missing: docker. Install Docker Desktop. & exit /b 1)
where python >nul 2>nul || (echo X Missing: python. Install Python 3.10+. & exit /b 1)
where node   >nul 2>nul || (echo X Missing: node. Install Node 20+. & exit /b 1)
where npm    >nul 2>nul || (echo X Missing: npm. Should ship with Node. & exit /b 1)

REM Need 'docker compose' (v2). Older 'docker-compose' (v1) also works.
docker compose version >nul 2>nul
if not errorlevel 1 (
    set DC=docker compose
) else (
    where docker-compose >nul 2>nul || (echo X Neither 'docker compose' nor 'docker-compose' available. & exit /b 1)
    set DC=docker-compose
)

REM ── Start the DB stack ───────────────────────────────────────────────────
echo ^> Starting local DB (Postgres + PostgREST + nginx)...
%DC% -f local-dev\docker-compose.yml up -d --quiet-pull
if errorlevel 1 (
    echo X Docker compose failed.
    exit /b 1
)

echo   Waiting for the stack to be ready...
set ATTEMPTS=0
:WAIT_DB
curl -sf http://localhost:54321/health >nul 2>nul
if not errorlevel 1 goto DB_READY
set /a ATTEMPTS+=1
if %ATTEMPTS% geq 60 (
    echo X DB stack failed to come up within 60s. Logs:
    %DC% -f local-dev\docker-compose.yml logs --tail=20
    goto CLEANUP
)
timeout /t 1 /nobreak >nul
goto WAIT_DB
:DB_READY
echo   OK DB stack ready at http://localhost:54321

REM ── Backend ──────────────────────────────────────────────────────────────
echo ^> Setting up backend...
if not exist backend\.venv (
    echo   Creating Python venv...
    python -m venv backend\.venv
    if errorlevel 1 (
        echo X Failed to create venv. Install Python 3.10+ and try again.
        goto CLEANUP
    )
)

REM Install deps in the venv
backend\.venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt
if errorlevel 1 (
    echo X pip install failed.
    goto CLEANUP
)

echo ^> Starting backend (FastAPI on :8000) in a new window...
start "RPG Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate.bat && set SUPABASE_URL=http://localhost:54321 && set SUPABASE_KEY=local-dev-anon-key && set CORS_ALLOWED_ORIGINS=http://localhost:3000 && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Wait for backend /health
set ATTEMPTS=0
:WAIT_BE
curl -sf http://localhost:8000/health >nul 2>nul
if not errorlevel 1 goto BE_READY
set /a ATTEMPTS+=1
if %ATTEMPTS% geq 30 (
    echo X Backend failed to come up. Check the "RPG Backend" window for errors.
    goto CLEANUP
)
timeout /t 1 /nobreak >nul
goto WAIT_BE
:BE_READY
echo   OK Backend ready at http://localhost:8000

REM ── Frontend ─────────────────────────────────────────────────────────────
echo ^> Setting up frontend...
if not exist frontend\node_modules (
    echo   Installing npm packages...
    pushd frontend
    call npm install --silent
    if errorlevel 1 (
        popd
        echo X npm install failed.
        goto CLEANUP
    )
    popd
)

echo ^> Starting frontend (Vite on :3000) in a new window...
start "RPG Frontend" cmd /k "cd /d %~dp0frontend && set VITE_API_URL=http://localhost:8000 && npm run dev -- --host 127.0.0.1"

echo.
echo =================================================================
echo   RPG Gauntlet -- running locally
echo.
echo     Game:     http://localhost:3000
echo     API:      http://localhost:8000
echo     DB API:   http://localhost:54321/rest/v1
echo     Postgres: localhost:5432  (user: postgres / pass: localdev)
echo.
echo   Backend and Frontend are running in separate windows.
echo   Press any key here to stop everything cleanly.
echo =================================================================
echo.
pause >nul

:CLEANUP
echo.
echo ^> Shutting down...
taskkill /F /FI "WINDOWTITLE eq RPG Backend"  >nul 2>nul
taskkill /F /FI "WINDOWTITLE eq RPG Frontend" >nul 2>nul
%DC% -f local-dev\docker-compose.yml down
echo   OK All stopped.
endlocal
