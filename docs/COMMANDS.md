# Project commands

This file records the shell commands used to set up, build, and run the current project. Commands are listed from the repository root unless a working directory is shown.

## Frontend setup

```sh
cd frontend
npm install
```

`npm install` was attempted first. In this environment it could not resolve `registry.npmjs.org`. A cached dependency set was available, so the production build could still run.

The environment's default Node binary was missing its ICU 74 library. Node 24.21.0 was available through nvm and was used explicitly:

```sh
cd frontend
PATH="/Users/bhubeshsr/.nvm/versions/node/v24.21.0/bin:$PATH" npm install --offline
```

The offline install also reported that the Vite React plugin metadata was not cached. The packages already present locally were sufficient to build the UI:

```sh
cd frontend
/Users/bhubeshsr/.nvm/versions/node/v24.21.0/bin/node node_modules/vite/bin/vite.js build
```

## Run the development server

On a machine with dependencies installed and Node 24 available:

```sh
cd frontend
npm run dev
```

The default Vite address is `http://127.0.0.1:5173/`. To launch with the available nvm runtime explicitly:

```sh
cd frontend
PATH="/Users/bhubeshsr/.nvm/versions/node/v24.21.0/bin:$PATH" npm run dev -- --host 127.0.0.1
```

The Codex execution environment denied opening a local listening socket (`EPERM`), so the server could not be started from that shell. The user later confirmed the app was available at `http://127.0.0.1:5173/#home`.

## Backend setup

Python 3.11 or newer is required. The backend uses its own virtual environment:

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
```

Then fill in `GOOGLE_OAUTH_CLIENT_ID` and `APP_SECRET_KEY` in `backend/.env`. See [AUTHENTICATION.md](AUTHENTICATION.md).

## Run the backend

```sh
cd backend
.venv/bin/uvicorn app.main:app --env-file .env --host 127.0.0.1 --port 8000 --reload --reload-dir app
```

The API is at `http://127.0.0.1:8000` and its interactive docs are at `http://127.0.0.1:8000/docs`. Restart the server after editing `.env`; `--reload` only watches code.

The frontend dev server forwards `/api` requests to this address, so run both to sign in.

## Run backend tests

```sh
cd backend
.venv/bin/python -m pytest -q tests
```

## Git initialization and commit

The project directory did not have a Git repository when work began. These are the commands to initialize and commit it in an environment that allows writing Git metadata:

```sh
git init
git add .
git commit -m "Build TravelForge UI scaffold"
```

Check the repository state with:

```sh
git status --short
git log -1 --oneline
```

`git init` was attempted here, but the environment denied creating `.git` (`Operation not permitted`). The workspace policy allows reading `.git` metadata but does not allow writing it, so no repository or commit was created in this session.
