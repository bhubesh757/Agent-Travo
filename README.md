# TravelForge AI --- Agentic Travel Planning & Booking Platform

> A production-oriented multi-agent travel assistant built with
> **LangGraph, Gemini, FastAPI, React, PostgreSQL, Human-in-the-Loop
> (HITL), and Guardrails**. It researches travel options, builds
> itineraries, validates budgets, and only executes bookings after
> explicit human approval.

## Project status

**Build strategy:** MVP first, production capabilities added
incrementally.

-   LLM: Google Gemini API (provider abstraction recommended)
-   Agent orchestration: LangGraph Supervisor
-   Backend: Python + FastAPI
-   Frontend: React + TypeScript
-   Primary database: PostgreSQL
-   Workflow persistence: LangGraph PostgreSQL checkpointer
-   Optional later additions: Redis, Kafka, pgvector, Prometheus,
    Grafana, Docker, Kubernetes, Terraform
-   Travel integrations: mock providers first; real providers only after
    credentials, terms, and booking permissions are confirmed

------------------------------------------------------------------------

## 1. Product vision

A traveler describes a trip in natural language. TravelForge AI
coordinates specialist agents to research flights, hotels, attractions,
weather, and routes; creates a day-by-day itinerary; estimates costs;
and presents a reviewable proposal.

The platform must **never make a purchase, reservation, cancellation, or
other consequential external change without explicit approval**.
Approval applies to an exact proposal snapshot. If a price, provider,
date, traveler, or other material booking detail changes, the previous
approval is invalid and fresh approval is required.

### Example request

> Plan a 5-day trip from Chennai to Bali for two people. Budget
> ₹1,00,000. Include flights, hotels, sightseeing, and food. Do not book
> anything without my approval.

### Expected result

1.  Validate the request and clarify missing essential information.
2.  Create a trip record.
3.  Supervisor decomposes the request into specialist tasks.
4.  Search agents gather options using approved tools.
5.  Itinerary agent builds a day-wise plan.
6.  Budget agent calculates estimated costs and checks constraints.
7.  Guardrails validate the proposal and tool outputs.
8.  User reviews the proposal and approves, rejects, or requests
    changes.
9.  Booking agent executes only approved actions.
10. Verify provider responses, persist records, and show the result.

------------------------------------------------------------------------

## 2. Goals and non-goals

### MVP goals

-   Natural-language trip creation.
-   Supervisor-driven multi-agent workflow.
-   Flight, hotel, destination research, itinerary, and budget agents.
-   Typed, validated tool interfaces.
-   PostgreSQL persistence for users, trips, proposals, approvals, tool
    calls, and bookings.
-   Durable LangGraph workflow with pause/resume for human approval.
-   Approval dashboard in the frontend.
-   Mock travel providers with deterministic fixtures.
-   Unit and integration tests, structured logs, and a local Docker
    Compose environment.

### Not in the initial MVP

-   Real-money payment processing.
-   Unattended or automatic purchases.
-   Scraping websites or bypassing provider restrictions.
-   Guaranteeing live availability or prices from mock data.
-   Storing raw payment-card details.
-   Microservices for every agent.
-   Kafka, Kubernetes, Terraform, and Redis before the core workflow is
    stable.

------------------------------------------------------------------------

## 3. Architecture

``` mermaid
flowchart TD
    U[Traveler] --> FE[React + TypeScript UI]
    FE --> API[FastAPI]
    API --> AUTH[Authentication and authorization]
    AUTH --> IG[Input guardrails]
    IG --> S[LangGraph Supervisor]
    S --> FA[Flight Agent]
    S --> HA[Hotel Agent]
    S --> RA[Destination Research Agent]
    S --> IA[Itinerary Agent]
    FA --> FT[Flight tools / provider adapter]
    HA --> HT[Hotel tools / provider adapter]
    RA --> RT[Places and weather tools]
    IA --> MT[Maps and distance tools]
    FT --> S
    HT --> S
    RT --> S
    MT --> S
    S --> BA[Budget Agent]
    BA --> OG[Output and policy guardrails]
    OG --> P[Travel proposal]
    P --> HITL[Human approval interrupt]
    HITL -->|Approve exact proposal| BOOK[Booking Agent]
    HITL -->|Reject| REJ[Mark rejected]
    HITL -->|Request changes| S
    BOOK --> BG[Booking tool guardrails]
    BG --> PROVIDER[Mock booking provider]
    PROVIDER --> VERIFY[Verify provider result]
    VERIFY --> DB[(PostgreSQL)]
    S --> DB
    API --> DB
    HITL --> DB
    FE --> API
```

### Runtime responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  React frontend                      Trip form, progress view,
                                      itinerary, cost breakdown, approval
                                      UI, booking history

  FastAPI                             Authentication boundary, REST APIs,
                                      request validation, workflow
                                      start/resume

  Supervisor                          Understand goal, delegate work,
                                      route between agents, compile
                                      proposal

  Specialist agents                   Focused research and planning tasks

  Tools                               Typed, bounded operations against
                                      providers or internal services

  Guardrails                          Validate user input, agent output,
                                      tool permissions, budgets, and
                                      approval state

  PostgreSQL                          Durable business data, audit trail,
                                      approvals, and workflow checkpoint
                                      storage

  LangGraph checkpointer              Persist graph state so interrupted
                                      workflows can resume
  -----------------------------------------------------------------------

### Agent responsibilities

  -----------------------------------------------------------------------
  Agent                   Responsibilities        Example tools
  ----------------------- ----------------------- -----------------------
  Supervisor              Decompose request,      `delegate_task`,
                          delegate, coordinate,   `save_proposal`
                          retry safely, compile   
                          final proposal          

  Flight                  Search and compare      `search_flights`,
                          flight options          `get_flight_details`

  Hotel                   Search and compare      `search_hotels`,
                          accommodation           `get_hotel_details`

  Research                Find attractions,       `search_places`,
                          destination             `get_weather`
                          information, weather    

  Itinerary               Create day-wise plan    `calculate_distance`,
                          and route sequence      `get_route`

  Budget                  Normalize currency,     `calculate_budget`,
                          total estimates,        `validate_budget`
                          enforce budget          

  Booking                 Execute approved        `create_booking`,
                          booking requests and    `get_booking_status`,
                          verify results          `cancel_booking`
  -----------------------------------------------------------------------

The Booking Agent is isolated from planning agents. Planning agents must
not receive booking-write tools.

------------------------------------------------------------------------

## 4. Workflow and approval lifecycle

``` mermaid
stateDiagram-v2
    [*] --> REQUESTED
    REQUESTED --> VALIDATING
    VALIDATING --> PLANNING: valid
    VALIDATING --> NEEDS_INFORMATION: missing details
    NEEDS_INFORMATION --> VALIDATING: user responds
    PLANNING --> PROPOSAL_READY
    PROPOSAL_READY --> GUARDRAIL_REVIEW
    GUARDRAIL_REVIEW --> AWAITING_APPROVAL: checks pass
    GUARDRAIL_REVIEW --> PLANNING: revise proposal
    AWAITING_APPROVAL --> APPROVED: approve exact snapshot
    AWAITING_APPROVAL --> REJECTED: reject
    AWAITING_APPROVAL --> PLANNING: request changes
    APPROVED --> BOOKING_IN_PROGRESS
    BOOKING_IN_PROGRESS --> BOOKED: provider confirms
    BOOKING_IN_PROGRESS --> BOOKING_FAILED: provider fails
    BOOKING_FAILED --> AWAITING_APPROVAL: revised proposal needed
    BOOKED --> [*]
    REJECTED --> [*]
```

### Human-in-the-Loop rules

-   Approval must be an authenticated user action.
-   Approval references a persisted proposal ID and immutable proposal
    version/hash.
-   Display provider, dates, traveler count, cancellation terms when
    available, currency, price, taxes/fees when available, and total.
-   An approval is valid only for the exact proposal snapshot.
-   Re-price or revalidate before booking when the provider supports it.
-   If any material detail differs, stop and request fresh approval.
-   Reject and modify decisions must be persisted with actor, timestamp,
    and optional reason.
-   Resume the same LangGraph thread after approval; do not start an
    unrelated graph run.
-   Booking endpoints must independently verify approval. Never trust a
    frontend boolean such as `approved: true`.
-   Use idempotency keys for booking writes to reduce duplicate
    execution risk.
-   Do not claim a booking succeeded until the provider returns a
    verifiable confirmation.

------------------------------------------------------------------------

## 5. Guardrails and security

Implement defense in depth. Pydantic validation is necessary but not
sufficient.

### Input guardrails

-   Validate dates, origin, destination, traveler count, currency, and
    budget.
-   Reject impossible date ranges and unsupported traveler counts.
-   Ask the user for missing essential details rather than inventing
    them.
-   Enforce request-size and rate limits.
-   Treat user-supplied text as data, not system instructions.

### Agent and tool guardrails

-   Give each agent only the tools it needs.
-   Use explicit tool allowlists and Pydantic input/output schemas.
-   Validate all tool arguments before execution.
-   Set timeouts, retry limits, and response-size limits.
-   Treat provider descriptions, search results, and retrieved content
    as untrusted.
-   Defend against prompt injection in external content; external
    content cannot change system policy or grant tool permissions.
-   Never expose secrets to the model or frontend.
-   Separate read-only search tools from booking-write tools.

### Financial and booking guardrails

-   Enforce a server-side budget policy.
-   Use decimal arithmetic for money; never use floating-point values
    for persisted financial totals.
-   Store currency with every monetary amount.
-   Distinguish estimated prices from confirmed prices.
-   Require explicit approval for every booking and cancellation.
-   Revalidate approval, proposal hash, price, traveler, dates, and
    provider before execution.
-   Use idempotency keys and persist execution state.
-   Handle partial bookings and provider timeouts explicitly; do not
    blindly retry non-idempotent writes.
-   Never store card numbers, CVV, or payment credentials in application
    tables or LLM context.

### Output guardrails

-   Validate the itinerary structure and dates.
-   Verify all displayed prices came from tool results or are clearly
    labeled estimates.
-   Do not fabricate availability, booking references, hotel amenities,
    weather, or cancellation policies.
-   Mark missing data as unknown.
-   Return a clear explanation when a policy blocks an action.

### Example policy configuration

``` python
from decimal import Decimal
from pydantic import BaseModel, Field

class TravelPolicy(BaseModel):
    require_human_approval: bool = True
    allow_automatic_booking: bool = False
    max_travelers: int = Field(default=10, ge=1, le=10)
    currency: str = "INR"
    max_budget: Decimal = Decimal("100000.00")
```

Keep policy enforcement in trusted backend code, not solely in an LLM
prompt.

------------------------------------------------------------------------

## 6. PostgreSQL data model

Use UUID primary keys, timezone-aware timestamps, foreign keys, indexes,
and migrations with Alembic.

Core tables:

  -----------------------------------------------------------------------
  Table                               Important fields
  ----------------------------------- -----------------------------------
  `users`                             `id`, `email`, `name`, `created_at`

  `trips`                             `id`, `user_id`, `origin`,
                                      `destination`, `start_date`,
                                      `end_date`, `travelers`,
                                      `budget_amount`, `budget_currency`,
                                      `status`

  `agent_runs`                        `id`, `trip_id`, `thread_id`,
                                      `status`, `started_at`,
                                      `completed_at`

  `agent_messages`                    `id`, `agent_run_id`, `agent_name`,
                                      `message_type`, `content_json`,
                                      `created_at`

  `tool_executions`                   `id`, `agent_run_id`, `tool_name`,
                                      `input_json`, `output_json`,
                                      `status`, `idempotency_key`,
                                      `created_at`

  `itineraries`                       `id`, `trip_id`, `version`,
                                      `itinerary_json`, `created_at`

  `proposals`                         `id`, `trip_id`, `version`,
                                      `proposal_json`, `proposal_hash`,
                                      `total_amount`, `currency`,
                                      `status`

  `approvals`                         `id`, `proposal_id`,
                                      `proposal_hash`, `decision`,
                                      `actor_user_id`, `reason`,
                                      `created_at`

  `bookings`                          `id`, `trip_id`, `proposal_id`,
                                      `booking_type`, `provider`,
                                      `provider_reference`, `amount`,
                                      `currency`, `status`

  `audit_logs`                        `id`, `actor_type`, `actor_id`,
                                      `action`, `resource_type`,
                                      `resource_id`, `metadata_json`,
                                      `created_at`
  -----------------------------------------------------------------------

### Persistence principles

-   Use relational columns for searchable business fields and JSONB for
    flexible agent payloads.
-   Persist proposal versions; do not overwrite an approved proposal.
-   Add unique constraints for idempotency keys and provider references
    where appropriate.
-   Store only the minimum personal data needed.
-   Apply ownership checks so users can only read or modify their own
    trips.
-   Use database transactions for approval and booking state
    transitions.
-   Use the official LangGraph PostgreSQL checkpointer package for graph
    state; do not hand-roll checkpoint persistence.
-   Keep checkpointer tables separate from application business tables,
    even when they share a PostgreSQL server.

------------------------------------------------------------------------

## 7. API contract

Base path: `/api/v1`

  -------------------------------------------------------------------------------------
  Method                  Path                                  Purpose
  ----------------------- ------------------------------------- -----------------------
  `POST`                  `/trips`                              Create a trip

  `GET`                   `/trips`                              List the current user's
                                                                trips

  `GET`                   `/trips/{trip_id}`                    Get trip details and
                                                                status

  `POST`                  `/trips/{trip_id}/plan`               Start planning workflow

  `GET`                   `/trips/{trip_id}/itinerary`          Get itinerary

  `GET`                   `/trips/{trip_id}/proposals`          List proposal versions

  `GET`                   `/approvals/pending`                  List current user's
                                                                pending approvals

  `POST`                  `/approvals/{approval_id}/decision`   Approve, reject, or
                                                                request changes

  `POST`                  `/trips/{trip_id}/bookings`           Execute an approved
                                                                proposal

  `GET`                   `/bookings/{booking_id}`              Get booking status

  `GET`                   `/health`                             Liveness/readiness
                                                                health information
  -------------------------------------------------------------------------------------

Example trip request:

``` json
{
  "origin": "Chennai",
  "destination": "Bali",
  "start_date": "2027-02-10",
  "end_date": "2027-02-15",
  "travelers": 2,
  "budget": {
    "amount": "100000.00",
    "currency": "INR"
  },
  "interests": ["sightseeing", "food", "beaches"],
  "booking_requires_approval": true
}
```

Example approval decision:

``` json
{
  "decision": "approve",
  "proposal_id": "UUID",
  "proposal_version": 1,
  "proposal_hash": "server-issued-hash",
  "reason": null
}
```

The server must compare the submitted proposal identity and hash with
the persisted proposal and authenticated user. Never accept a
client-supplied hash as proof by itself.

------------------------------------------------------------------------

## 8. Tool interface design

Use small, typed tools with clear contracts. Keep provider-specific code
behind adapters.

``` python
from decimal import Decimal
from pydantic import BaseModel, Field

class FlightSearchInput(BaseModel):
    origin: str
    destination: str
    departure_date: str
    travelers: int = Field(ge=1, le=10)
    currency: str = "INR"

class FlightOption(BaseModel):
    provider: str
    provider_option_id: str
    airline: str
    departure_time: str
    arrival_time: str
    price: Decimal
    currency: str
    is_estimate: bool = True
```

Initial tools:

``` text
search_flights(input) -> list[FlightOption]
get_flight_details(provider_option_id) -> FlightDetails
search_hotels(input) -> list[HotelOption]
get_hotel_details(provider_hotel_id) -> HotelDetails
search_places(input) -> list[Place]
get_weather(input) -> WeatherResult
calculate_distance(origin, destination) -> DistanceResult
calculate_budget(items, currency) -> BudgetResult
validate_budget(total, budget) -> BudgetValidation
save_proposal(trip_id, proposal) -> ProposalReference
create_booking(approved_proposal, idempotency_key) -> BookingResult
get_booking_status(provider_reference) -> BookingStatus
cancel_booking(booking_id, approved_cancellation) -> CancellationResult
```

For the MVP, implement deterministic mock adapters. Mock responses must
be visibly labeled as mock/demo data. Do not present them as live
provider availability.

------------------------------------------------------------------------

## 9. LangGraph implementation guidance

### Shared state

Use a typed state object. Keep it compact; store large provider payloads
in PostgreSQL and pass references through graph state where practical.

``` python
from typing import TypedDict, Any

class TravelState(TypedDict, total=False):
    trip_id: str
    user_id: str
    thread_id: str
    request: dict[str, Any]
    tasks: list[dict[str, Any]]
    flight_results: list[dict[str, Any]]
    hotel_results: list[dict[str, Any]]
    research_results: list[dict[str, Any]]
    itinerary: dict[str, Any]
    budget_result: dict[str, Any]
    proposal_id: str
    proposal_version: int
    proposal_hash: str
    approval_decision: dict[str, Any]
    booking_results: list[dict[str, Any]]
    errors: list[dict[str, Any]]
```

### Graph nodes

``` text
validate_request
    -> supervisor_plan
    -> parallel_specialist_agents
    -> compile_itinerary
    -> calculate_budget
    -> validate_proposal
    -> persist_proposal
    -> human_approval_interrupt
        -> approved: revalidate_approval -> booking_agent -> verify_booking -> complete
        -> rejected: persist_rejection -> complete
        -> changes_requested: supervisor_revise -> validate_proposal
```

Use LangGraph conditional edges for routing and parallel execution where
useful. Use a persistent PostgreSQL checkpointer and stable `thread_id`
per workflow. Configure graph interrupts before deployment. On resume,
load the authenticated user's pending proposal from the database; do not
trust arbitrary resume payloads.

------------------------------------------------------------------------

## 10. Frontend screens

1.  **Trip Planner** --- origin, destination, dates, travelers, budget,
    interests.
2.  **Planning Progress** --- current workflow stage and agent activity,
    without exposing secrets or private chain-of-thought.
3.  **Trip Proposal** --- flights, hotels, daily itinerary, estimated
    cost, assumptions, and data freshness.
4.  **Approval Center** --- exact proposal snapshot,
    approve/reject/request changes.
5.  **Trip Details** --- itinerary and status.
6.  **Booking History** --- provider references, booking status,
    timestamps.
7.  **Audit / Activity View** --- user-visible actions and state
    transitions.

The approval page must clearly distinguish estimated options from
confirmed bookings and show any known cancellation/refund terms.

------------------------------------------------------------------------

## 11. Suggested repository structure

``` text
travelforge-ai/
├── README.md
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Makefile
├── backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── migrations/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   └── security.py
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   └── routes/
│   │   │       ├── trips.py
│   │   │       ├── proposals.py
│   │   │       ├── approvals.py
│   │   │       └── bookings.py
│   │   ├── agents/
│   │   │   ├── supervisor.py
│   │   │   ├── flight_agent.py
│   │   │   ├── hotel_agent.py
│   │   │   ├── research_agent.py
│   │   │   ├── itinerary_agent.py
│   │   │   └── budget_agent.py
│   │   ├── graph/
│   │   │   ├── state.py
│   │   │   ├── workflow.py
│   │   │   └── routing.py
│   │   ├── tools/
│   │   │   ├── flights.py
│   │   │   ├── hotels.py
│   │   │   ├── places.py
│   │   │   ├── weather.py
│   │   │   ├── maps.py
│   │   │   ├── budget.py
│   │   │   └── booking.py
│   │   ├── providers/
│   │   │   ├── interfaces.py
│   │   │   └── mock/
│   │   ├── guardrails/
│   │   │   ├── input_validation.py
│   │   │   ├── output_validation.py
│   │   │   ├── tool_permissions.py
│   │   │   └── booking_policy.py
│   │   ├── approvals/
│   │   │   └── service.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   └── services/
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── frontend/
│   ├── package.json
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       │   ├── trips/
│       │   ├── proposals/
│       │   ├── approvals/
│       │   └── bookings/
│       └── lib/
├── infra/
│   ├── docker/
│   ├── monitoring/
│   ├── kubernetes/       # later phase
│   └── terraform/        # later phase
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── threat-model.md
└── scripts/
```

------------------------------------------------------------------------

## 12. Local development

### Prerequisites

-   Python 3.11 or newer (use a version supported by the selected
    LangGraph dependencies).
-   Node.js LTS.
-   Docker and Docker Compose.
-   PostgreSQL can run through Docker Compose.
-   Gemini API key for live LLM calls; mock mode should work without
    one.

### Environment variables

Create `.env` from `.env.example`. Never commit `.env`.

``` dotenv
APP_ENV=development
APP_SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=postgresql+psycopg://travel_user:travel_password@localhost:5432/travelforge
LANGGRAPH_CHECKPOINT_DATABASE_URL=postgresql://travel_user:travel_password@localhost:5432/travelforge
GOOGLE_API_KEY=
GEMINI_MODEL=
TRAVEL_PROVIDER_MODE=mock
FRONTEND_ORIGIN=http://localhost:5173
LOG_LEVEL=INFO
```

Use a separate least-privilege database role for production. Avoid using
example credentials outside local development.

### Start services

``` bash
docker compose up --build
```

Expected local services:

-   Frontend: `http://localhost:5173`
-   Backend API: `http://localhost:8000`
-   OpenAPI docs: `http://localhost:8000/docs`
-   PostgreSQL: `localhost:5432`

Apply migrations:

``` bash
cd backend
alembic upgrade head
```

Run backend tests:

``` bash
pytest -q
```

Run frontend checks:

``` bash
cd frontend
npm install
npm run lint
npm run build
```

Exact commands should be aligned with the scripts generated in
`package.json` and `pyproject.toml`.

------------------------------------------------------------------------

## 13. Implementation phases

### Phase 1 --- Foundation

-   Create monorepo structure.
-   Configure FastAPI, React, PostgreSQL, SQLAlchemy, Alembic.
-   Add health endpoint and configuration management.
-   Add trip CRUD and database tests.
-   Add Docker Compose and `.env.example`.

**Exit criteria:** A user can create and retrieve a trip, and the data
persists after restart.

### Phase 2 --- Agent workflow

-   Define shared LangGraph state.
-   Implement Supervisor and specialist agents.
-   Add mock flight, hotel, places, maps, weather, and budget tools.
-   Run independent research tasks in parallel.
-   Persist run status and results.

**Exit criteria:** A trip request produces a structured proposal using
mock data.

### Phase 3 --- Guardrails

-   Add request and output schemas.
-   Add tool allowlists and agent-specific permissions.
-   Add budget and currency validation.
-   Add untrusted-content handling.
-   Add structured errors and bounded retries.

**Exit criteria:** Invalid requests and unauthorized tool calls are
blocked by tests.

### Phase 4 --- Human approval

-   Persist immutable proposal versions and hashes.
-   Add LangGraph interrupt/resume with PostgreSQL checkpointer.
-   Build approval UI and API.
-   Verify user ownership and proposal snapshot before resuming.
-   Require fresh approval when material details change.

**Exit criteria:** A workflow pauses, survives backend restart, resumes
after approval, and cannot book after rejection.

### Phase 5 --- Booking simulation

-   Implement mock booking provider.
-   Add idempotency and booking state transitions.
-   Verify provider response before marking booking confirmed.
-   Test timeouts, duplicate requests, partial failure, and stale
    approval.

**Exit criteria:** Only an approved, unchanged proposal can execute the
mock booking tool.

### Phase 6 --- Real integrations and production readiness

-   Select travel providers with approved API access.
-   Implement provider adapters and credential management.
-   Add Redis only where caching or coordination needs justify it.
-   Add Kafka for durable asynchronous domain events if required.
-   Add Prometheus/Grafana, tracing, alerting, CI/CD.
-   Add Kubernetes and Terraform after containerized deployment is
    stable.
-   Perform security, privacy, load, and recovery testing.

**Exit criteria:** Production deployment has documented operational
controls, monitoring, backup/restore, and provider-specific failure
handling.

------------------------------------------------------------------------

## 14. Testing strategy

### Unit tests

-   Date and traveler validation.
-   Currency and decimal calculations.
-   Budget boundaries.
-   Tool input/output schemas.
-   Agent routing decisions.
-   Proposal hash generation.
-   Permission checks.

### Integration tests

-   PostgreSQL persistence and migrations.
-   LangGraph checkpointer persistence.
-   Interrupt/resume after process restart.
-   Approval ownership and proposal version checks.
-   Mock provider success/failure.
-   Idempotent booking behavior.

### End-to-end acceptance scenarios

  -----------------------------------------------------------------------
  Scenario                            Expected behavior
  ----------------------------------- -----------------------------------
  Valid request within budget         Proposal is generated

  Missing travel dates                Ask user for dates

  Invalid date range                  Reject request

  Budget exceeded                     Revise or explain; do not request
                                      booking approval

  User rejects proposal               No booking tool call

  User requests changes               Re-plan and create a new proposal
                                      version

  Proposal price changes after        Invalidate approval and request
  approval                            approval again

  Duplicate booking request           Do not create a duplicate booking

  Provider timeout                    Mark outcome uncertain; reconcile
                                      before retry

  Backend restarts during approval    Pending workflow can resume

  User accesses another user's trip   Return authorization error
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Observability and operational requirements

Capture structured events and metrics without logging secrets or
unnecessary personal data.

Recommended metrics:

-   Request and workflow completion rates.
-   Per-agent latency and error rates.
-   Tool call latency and provider failure rates.
-   LLM token usage and estimated cost per trip.
-   Guardrail rejection counts.
-   Approval wait time and decision rates.
-   Booking success, failure, and uncertain outcomes.
-   PostgreSQL connection and query health.

Use correlation IDs across API requests, graph runs, tool executions,
and bookings. Log state transitions and action metadata, not private
model reasoning.

------------------------------------------------------------------------

## 16. Codex build instructions

Use this README as the project specification. Implement the application
incrementally; do not attempt to generate every feature in one pass.

### Working rules for Codex

1.  Inspect the repository before changing files. Preserve existing
    useful code.
2.  Create a short implementation plan and track tasks in
    `docs/IMPLEMENTATION_PLAN.md`.
3.  Build Phase 1 completely before starting Phase 2.
4.  Use typed Python, Pydantic schemas, clear interfaces, and small
    modules.
5.  Keep provider integrations behind adapter interfaces. Use
    deterministic mock providers initially.
6.  Keep business logic out of FastAPI route handlers.
7.  Keep booking-write tools inaccessible to planning agents.
8.  Implement approval verification on the backend, not only in the UI.
9.  Add tests with each feature. Do not leave core security behavior
    untested.
10. Run formatting, linting, tests, and builds after each phase; fix
    failures before proceeding.
11. Do not fabricate live travel results. Clearly label all mock data.
12. Do not add secrets, real payment handling, or automatic booking.
13. Do not silently skip unfinished requirements. Document limitations
    and remaining work.
14. Keep dependencies pinned or constrained and document setup commands.
15. Update this README when actual implementation choices differ from
    the specification.

### First Codex task

Implement **Phase 1 only**:

-   Inspect the repository and report its current state.
-   Create the monorepo folders and configuration.
-   Create FastAPI app with `/health`.
-   Create React + TypeScript app with a basic TravelForge landing page
    and trip request form.
-   Configure PostgreSQL with Docker Compose.
-   Add SQLAlchemy models and Alembic migration for `users` and `trips`.
-   Implement `POST /api/v1/trips`, `GET /api/v1/trips`, and
    `GET /api/v1/trips/{trip_id}`.
-   Add request validation and basic tests.
-   Add `.env.example`, `.gitignore`, and setup instructions.
-   Run tests and frontend build; report exact results.

Do not implement agents or booking in Phase 1. Once Phase 1 passes,
proceed to Phase 2.

------------------------------------------------------------------------

## 17. Definition of done

The project is not complete merely because agents return text. The MVP
is complete when:

-   A user can submit a trip request from the UI.
-   The Supervisor coordinates specialist agents and tools.
-   A structured itinerary and transparent cost breakdown are generated.
-   Guardrails validate the request, results, and actions.
-   The proposal is saved as an immutable version in PostgreSQL.
-   The graph pauses and persists while waiting for human approval.
-   The user can approve, reject, or request changes.
-   Only an authenticated approval for the exact proposal can authorize
    booking.
-   The mock booking provider is called at most once for an idempotency
    key.
-   Booking results and audit events are persisted.
-   Automated tests verify both successful and blocked paths.

**Core principle:** Plan autonomously, validate rigorously, and execute
consequential actions only with explicit human authorization.
# Agent-Travo
