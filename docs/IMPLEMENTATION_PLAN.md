# Implementation plan

## Current phase: authenticated trip flow and mock proposal

- [x] Inspect repository and product specification.
- [x] Create responsive React + TypeScript trip planning screen.
- [x] Connect the trip form to an authenticated API with validation and loading/error states.
- [x] Add SQLAlchemy persistence for users and trips with SQLite development default and PostgreSQL support.
- [x] Add owner-scoped trip create/list/detail API routes.
- [x] Add a deterministic planning preview clearly labeled as illustrative, not live data.
- [x] Add version-checked approve/reject decisions for the preview.
- [x] Document design choices, intended logic, source websites, and limitations.
- [x] Add Sign in with Google: backend token verification, session cookie, protected-route dependency, and gated frontend.
- [ ] Add Alembic migrations and provision durable PostgreSQL for hosted data.
- [ ] Implement agent graph and deterministic mock travel research providers.
- [ ] Store immutable proposal versions/hashes and a full approval audit record.
- [ ] Implement booking simulation with server-side authorization and idempotency.

## Phase boundaries

The trip form, saved journeys, and planning preview use the backend. The current preview is deterministic placeholder content, not agent output or live travel data. No provider search, booking, or cancellation is implemented. The API creates missing tables at startup; this is a development convenience until migrations are added. Real provider integrations remain out of scope until provider access and terms are reviewed.
