# TravelForge build notes

This folder is the working record for how TravelForge is built. Start here when implementing a feature or reviewing the current design. The product requirements and full target architecture remain in the repository [README](../README.md).

## Documents

- [Implementation notes](IMPLEMENTATION_NOTES.md): UI decisions, interaction logic, architecture boundaries, and source links.
- [Implementation plan](IMPLEMENTATION_PLAN.md): current phase and remaining work.
- [Authentication](AUTHENTICATION.md): Sign in with Google setup, flow, endpoints, and security decisions.
- [Commands](COMMANDS.md): how to install, run, and test the frontend and backend.
- [Frontend guide](../frontend/README.md): local setup and current UI limitations.

## Current state

The React frontend is gated behind Sign in with Google and uses the authenticated API for saved trips and a deterministic planning preview. The backend persists users and trips, enforces per-user access, and records preview decisions tied to a proposal version. The preview is mock content, no live travel data is fetched, and no agent or booking action runs yet. SQLite is the local default; hosted use needs `DATABASE_URL` set to durable PostgreSQL. Database tables are currently initialized with `create_all`; migrations remain future work.
