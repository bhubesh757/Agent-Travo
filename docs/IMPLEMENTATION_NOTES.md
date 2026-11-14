# Implementation notes

Updated: 2026-11-14

## Product intent

TravelForge helps a traveler turn preferences into a reviewable trip proposal. The UI keeps the traveler in control: it collects constraints and preferences, later shows where recommendations came from, and makes approval a deliberate step. No consequential booking can be triggered just by submitting a planning request.

## What exists now

The first frontend screen lives in `frontend/src/App.tsx` and `frontend/src/styles.css`:

- A workspace shell with plan, journeys, and discovery navigation.
- A trip form for destination, dates, traveler count, budget, and optional preferences.
- Destination inspiration cards with illustrative starting prices.
- A responsive layout for desktop, tablet, and narrow mobile screens.
- A Google sign-in screen and session state backed by an HttpOnly cookie.
- An authenticated trip form that validates dates, saves a trip, requests a planning preview, and refreshes saved journeys.
- Trip loading, submission, planning, and API error states, plus an interactive saved-trip list.
- A sign-in screen (`frontend/src/auth/`). The planning screen renders only for a signed-in traveler, and the sidebar shows their Google name, email, and photo with a sign-out button.

The backend implements Sign in with Google: it verifies Google ID tokens, issues an HttpOnly session cookie, and exposes a `CurrentUser` dependency for protecting routes. See [AUTHENTICATION.md](AUTHENTICATION.md). It persists user profiles and trips, scopes each trip query to the signed-in Google subject, and provides a deterministic planning preview plus version-checked approve/reject decisions. The preview contains no live travel results and does not trigger a booking. The UI's inspiration-card prices are illustrative and must not be represented as live inventory or quotes.

## UI structure and logic

`main.tsx` wraps the app in `AuthProvider` and renders `SignIn` until a session exists. `App` loads the signed-in user's trips, submits validated form data, starts a mock planning preview, and refreshes the selected trip. `frontend/src/api/trips.ts` is the typed HTTP boundary. React state represents loading, saved, planning, and error states. Inputs use native controls for keyboard and browser accessibility. The request form is laid out with CSS Grid; breakpoints collapse the grid and navigation for mobile.

Visual direction: calm, editorial travel planning rather than a dense booking search page. A restrained green palette signals planning and trust; warm accent colors and destination photography add travel character. Typography separates an expressive headline from compact utility labels. Cards, clear labels, visible budget/date fields, and a persistent approval assurance make the task legible.

The destination images currently use Unsplash image URLs as visual placeholders. For production, use a licensed, reviewed image source and a local or optimized CDN pipeline. Google Fonts are also loaded remotely in CSS; provide local/system fallbacks for offline or privacy-sensitive deployments.

## Planned application boundaries

1. **Frontend (`frontend/`)**: collect trip constraints, show workflow status, render a proposal and its estimate provenance, and capture an explicit approval decision.
2. **API (`backend/app/api/`)**: validate requests and return typed responses. Route handlers should call services and should not own workflow or persistence logic.
3. **Services and repositories**: `backend/app/services/trips.py` owns trip/proposal operations, while route handlers in `backend/app/api/routes/` handle HTTP concerns. SQLAlchemy sessions and records live in `backend/app/db/` and `backend/app/models/`.
4. **Workflow (`backend/app/agents/`, `backend/app/graph/`)**: coordinate bounded research/planning agents; use a shared typed state and deterministic mock tools first.
5. **Guardrails and approval**: enforce schemas, tool permissions, budget checks, ownership, and approval against an immutable proposal version/hash on the server.
6. **Providers**: isolate travel data and booking calls behind interfaces; start with fixtures. Booking-write capability must remain unavailable to planning agents.

The current flow is: validate request → persist trip → create a deterministic, illustrative day outline → persist the preview → record an approve/reject choice only for the current preview version. The future target flow adds provider research, budget checks, immutable proposal hashes, and a durable pause/resume workflow. No future booking can proceed based on this preview approval implementation.

## Engineering techniques

- Use TypeScript types at the UI/API boundary and Pydantic models at the Python boundary; validate again on the server because browser validation is not a security control.
- Keep money as decimal amounts with a currency code in persisted records. Label estimates separately from confirmed prices.
- Use deterministic mock providers and fixtures before connecting travel services. Never imply mock output is live availability.
- Give each agent only the read or write tools required for its job. Validate tool arguments and outputs, bound timeouts/retries, and treat provider text as untrusted input.
- Persist workflow transitions and approval audit details. Use idempotency keys for eventual booking writes; do not blindly retry uncertain non-idempotent operations.
- Keep proposal review and approval tied to a persisted immutable snapshot. Revalidate provider state when possible and require fresh approval after material changes.
- The current SQLAlchemy models use `Base.metadata.create_all()` at API startup. This is not a schema migration strategy; use Alembic before production schema evolution.
- SQLite is the local default. The API accepts a PostgreSQL `DATABASE_URL`, but hosted persistence requires a configured durable PostgreSQL service.
- Keep the interface progressively usable: semantic form controls, visible labels, keyboard focus, and narrow-screen layouts.

## Reference websites

These references explain the implementation techniques or establish the security/product constraints. The README is the project's requirements source; external sources inform implementation and do not override it.

| Reference | What we use it for |
|---|---|
| [React: Managing State](https://react.dev/learn/managing-state) | Keep transient UI state in React and derive visual states from it. |
| [React: Responding to Events](https://react.dev/learn/responding-to-events) | Handle form submission and user actions as explicit event handlers. |
| [Vite Guide](https://vite.dev/guide/) | Frontend dev server and production build structure. |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | Typed application code and safer refactoring. |
| [MDN: HTML forms](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms) | Native controls, labels, and browser form behavior. |
| [MDN: CSS media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries) | Responsive presentation at viewport breakpoints. |
| [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/) | Planned API routing, request models, and generated API documentation. |
| [Pydantic documentation](https://docs.pydantic.dev/latest/) | Planned server-side schema validation and typed data contracts. |
| [LangGraph documentation](https://docs.langchain.com/oss/python/langgraph/overview) | Planned stateful workflow orchestration and pause/resume. |
| [PostgreSQL documentation](https://www.postgresql.org/docs/current/) | Planned durable relational storage and transaction boundaries. |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | Security review baseline for the eventual web application and API. |
| [Sign in with Google for Web](https://developers.google.com/identity/gsi/web/guides/overview) | Google button, ID token flow, and server-side token verification. |
| [Unsplash License](https://unsplash.com/license) | Check image rights and permitted use before shipping the current visual placeholders. |

## Next backend and UI steps

Add migrations and configure durable PostgreSQL for the hosted service. Replace the mock planning service with bounded research providers and an agent graph, keeping all output labeled with source and freshness. Add proposal version/hash records and an approval audit trail before any booking tool is introduced. Replace illustrative destination prices with clearly sourced estimates. The backend must ask for essential missing dates rather than invent them.
