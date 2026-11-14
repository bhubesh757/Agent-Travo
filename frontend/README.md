# TravelForge frontend

React + TypeScript + Vite user interface. It has a Sign in with Google screen and the trip planning screen. The trip form's submit state is local and does not save a trip or call a planning service.

## Run locally

Install a current Node.js LTS release, then run:

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`.

Sign-in needs the backend running on `http://127.0.0.1:8000`; the dev server forwards `/api` to it. Setup steps are in [`../docs/AUTHENTICATION.md`](../docs/AUTHENTICATION.md).

See [`../docs/IMPLEMENTATION_NOTES.md`](../docs/IMPLEMENTATION_NOTES.md) for design decisions, planned application logic, and reference websites.
