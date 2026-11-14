# CI and deployment

The `v1` deployment uses GitHub Actions for checks and Render for hosting.
The Render service serves the compiled React app and FastAPI API from the same
origin so the Google sign-in session cookie remains first-party. GitHub Pages
is not used because it cannot host this FastAPI app.

## What is deployed

- React + TypeScript frontend, built with `npm run build`
- FastAPI auth and trip APIs (`/api/v1/auth/*`, `/api/v1/trips`)
- Local SQLite by default; set `DATABASE_URL` to a durable PostgreSQL service before relying on hosted trip data
- Google sign-in, once a Google OAuth client ID is configured

The planning response is a deterministic illustrative preview. There are no
live agent/provider results, durable proposal hashes, or booking operations.
The service currently creates SQL tables on startup; Alembic migrations are
still needed before schema changes are managed in production.

## One-time setup

1. In Render, create a **Blueprint** from this GitHub repository and select the
   `v1` branch. Render reads [`render.yaml`](../render.yaml), creates the
   `travelforge-v1` web service, generates `APP_SECRET_KEY`, and prompts for
   `GOOGLE_OAUTH_CLIENT_ID` and `DATABASE_URL`. Supply a durable PostgreSQL
   connection string before the service's first deploy.
2. Wait for the first deployment, then copy the service URL from Render.
3. Confirm `DATABASE_URL` is set in the Render service environment. Production
   intentionally refuses to start without it; local SQLite is not suitable
   for Render's ephemeral filesystem. This project does not provision a
   database or select a paid database plan. Render's free PostgreSQL expires
   after 30 days; see [Render's free instance limits](https://render.com/docs/free)
   before storing data there long term.
4. In Google Cloud Console, add that URL (for example
   `https://travelforge-v1.onrender.com`) to the OAuth web client's authorized
   JavaScript origins. No redirect URI is required.
5. Confirm the same URL is present as the service's `FRONTEND_ORIGIN` if you
   have configured that variable manually. Render's `RENDER_EXTERNAL_URL` is
   allowed automatically.
6. In GitHub, protect `v1` if desired and ensure the `CI` workflow is enabled.

Do not upload `backend/.env` to GitHub. Put deployment configuration in the
Render service's environment settings. The OAuth client ID is not a client
secret, but the backend session signing key must remain private.

## CI/CD behavior

The GitHub Actions workflow at [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
runs on pull requests and pushes to `main` or `v1`, and on `1.*` version tags.
It installs backend and frontend dependencies, builds the frontend, and runs
the backend tests. The Render Blueprint is configured with `autoDeployTrigger:
checksPass` on `v1`, so Render deploys a new `v1` commit after its GitHub checks
pass.

The initial Render Blueprint deployment is a one-time manual setup. Subsequent
pushes to `v1` are deployed by Render after CI succeeds. To deploy a different
branch or a release tag, update the Render service's branch/deploy settings
deliberately; this blueprint only tracks `v1`.

## Local production-mode smoke test

From the repository root, build the frontend, install backend requirements,
and launch the API with `APP_ENV=production` and a 32-character-or-longer
`APP_SECRET_KEY`. Then verify:

```sh
curl -fsS http://127.0.0.1:8000/health
curl -fsSI http://127.0.0.1:8000/
```

The first request should return `{"status":"ok"}` and the second should return
an HTTP success response for the frontend entry point.
