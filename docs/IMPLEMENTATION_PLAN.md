# Implementation plan

## Current phase: UI first, other areas skeleton only

- [x] Inspect repository and product specification.
- [x] Create responsive React + TypeScript trip planning screen.
- [x] Add UI interaction skeleton and clearly label demo-only behavior.
- [x] Add FastAPI health-check skeleton and backend extension points.
- [x] Document design choices, intended logic, source websites, and limitations.
- [x] Add Sign in with Google: backend token verification, session cookie, protected-route dependency, and gated frontend.
- [ ] Persist users in a `users` table and add server-side session revocation.
- [ ] Connect trip form to validated API and persistent trip records.
- [ ] Implement agent graph and deterministic mock research providers.
- [ ] Implement proposal review, approval persistence, and booking simulation in later phases.

## Phase boundaries

UI work can proceed independently against a documented API contract. Do not represent agent planning or booking as active until the relevant backend phases exist. Real provider integrations remain out of scope until provider access and terms are reviewed.
