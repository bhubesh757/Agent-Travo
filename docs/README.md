# TravelForge build notes

This folder is the working record for how TravelForge is built. Start here when implementing a feature or reviewing the current design. The product requirements and full target architecture remain in the repository [README](../README.md).

## Documents

- [Implementation notes](IMPLEMENTATION_NOTES.md): UI decisions, interaction logic, architecture boundaries, and source links.
- [Implementation plan](IMPLEMENTATION_PLAN.md): current phase and remaining work.
- [Authentication](AUTHENTICATION.md): Sign in with Google setup, flow, endpoints, and security decisions.
- [Commands](COMMANDS.md): how to install, run, and test the frontend and backend.
- [Frontend guide](../frontend/README.md): local setup and current UI limitations.

## Current state

The React frontend is the first working surface, and it is gated behind Sign in with Google. The backend verifies the Google sign-in and issues a session cookie; that is its only working feature besides the health check. The trip form is a front-end demonstration only. No trip is saved, no live travel data is fetched, and no agent or booking action runs yet. Data, workflow, and provider directories are scaffolds for subsequent implementation.
