# Backend storage and API notes

The API persists users and trips through SQLAlchemy. Local development defaults to `sqlite:///./travelforge.db`; the database file is created in the backend working directory. Hosted production must set `DATABASE_URL` to a durable PostgreSQL database. The app accepts `postgresql://`, `postgres://`, and `postgresql+psycopg://` URLs. It intentionally refuses to start in production without `DATABASE_URL`, rather than silently storing trip records on an ephemeral local disk.

Current schema setup calls SQLAlchemy `create_all` at process startup. This is a temporary MVP bootstrap: it creates missing tables but does not migrate existing tables when model columns change. Add and apply Alembic migrations before evolving a production schema.

## Trip API

All trip endpoints require the signed-in Google session cookie.

- `POST /api/v1/trips`: create a trip, attach it to the current user's Google subject, and persist the request.
- `GET /api/v1/trips`: list only the current user's trips.
- `GET /api/v1/trips/{trip_id}`: return an owned trip; other users' trips return `404`.
- `POST /api/v1/trips/{trip_id}/plan`: persist an illustrative itinerary preview. It is labeled mock and contains no live provider data.
- `POST /api/v1/trips/{trip_id}/decision`: approve or reject the exact proposal version. This records a decision only; no booking action exists.

Changing routes that write records require the request `Origin` to match `FRONTEND_ORIGIN` when a browser sends that header. Booking still needs a separate server-side execution path and must re-check the approved proposal snapshot.
