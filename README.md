# Tend — a personal spending diary

A local copy of the Tend budget tracker. Same frontend that runs inside
Claude.ai, wired up to a small Express + TypeScript server that persists
data to a JSON file on disk instead of the browser's `localStorage` — so
your data lives on whichever machine runs the server (e.g. a Raspberry Pi)
and is the same no matter which browser or device you open Tend from.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
npm install
npm run dev          # terminal 1 — the Vite frontend, http://localhost:5173
npm run dev:server   # terminal 2 — the storage API, http://localhost:3001
```

Open `http://localhost:5173`. Vite proxies `/api/*` requests to the server,
so the two behave as one app. Data is written to `server/data/tend-store.json`
(gitignored).

## Make changes

- All the app logic and UI lives in **`src/App.jsx`**. It's a single file.
- Vite hot-reloads as you save the frontend; `dev:server` hot-reloads the
  API the same way.
- Colors, fonts, and reusable UI classes (`.tend-card`, `.tend-chip`, etc.)
  are defined in a `styles` template string near the top of `App.jsx`,
  rather than a separate CSS file — edit that to restyle things.
- `src/storage-shim.ts` implements Claude.ai's `window.storage` API
  (`get`/`set`/`delete`/`list`) on top of `fetch` calls to the server, so
  `App.jsx` itself never needs to know whether it's running in Claude or
  standalone.
- The server lives in `server/src/` — `store.ts` is the JSON-file-backed
  key/value store, `routes/storage.ts` is the HTTP layer (Zod-validated),
  `app.ts` wires it together with serving the built frontend.
- `npm run typecheck` and `npm test` (vitest) cover the server + the shim.

## Build & run for real (e.g. the Raspberry Pi)

```bash
npm run build:all   # builds the frontend (dist/) and the server (server/dist/)
npm start            # one process, one port: serves the UI and the API
```

Open `http://localhost:3001` (or `http://<hostname>.local:3001` from
another machine on the network/Tailscale). Data is written to
`server/data/tend-store.json` by default — set the `DATA_FILE` env var to
point somewhere else (e.g. outside the repo checkout, for easier backups),
and `PORT` to change the port.

### Running it as a service on the Pi

See [`systemd/tend.service`](systemd/tend.service) — copy it to
`/etc/systemd/system/`, edit the `User`/`WorkingDirectory`/`DATA_FILE`
values for your setup, then `sudo systemctl enable --now tend` so it starts
on boot and restarts itself if it ever crashes.
