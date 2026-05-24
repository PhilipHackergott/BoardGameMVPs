# Lacuna online server

Authoritative WebSocket server for ranked online play — accounts, strength-based (Elo)
matchmaking, and server-validated matches. **Self-contained:** no external database or auth
provider. It reuses the pure game engine from `../app/src/engine` so the same rules run on
client and server, and the Elo math from `../app/src/rl/elo.ts`.

Implements Phases 1–3 of [`../08-production-plan.md`](../08-production-plan.md) (accounts →
private/authoritative online play → matchmaking + ranked Elo), minus chat, per the brief.

## Run

```bash
npm install
npm start          # ws://localhost:8787  (PORT to override)
npm test           # headless end-to-end: 2 accounts → queue → match → full game → Elo
npm run typecheck
```

Env:
- `PORT` — WebSocket port (default `8787`).
- `LACUNA_DATA_DIR` — where `players.json` / `matches.json` are written (default `./data`,
  git-ignored).

The web client connects to `ws://localhost:8787` by default; override with the Vite env var
`VITE_LACUNA_SERVER` (e.g. `VITE_LACUNA_SERVER=wss://play.example.com npm run build`).

## How it works

- **One WebSocket per client** carries JSON messages (`../app/src/net/protocol.ts`, shared
  verbatim with the client). A client authenticates, then may queue and play.
- **Auth** (`auth.ts`): email + password, hashed with `node:crypto` **scrypt**; opaque random
  session tokens (in-memory). Account management: change handle/email/password, delete.
- **Persistence** (`store.ts`): JSON files (`players.json`, `matches.json`) with atomic writes.
  Swap for Postgres later without touching callers.
- **Matchmaking** (`matchmaking.ts`): players queue with their Elo; the acceptance band widens
  with wait time so close matches form fast and nobody waits forever.
- **Match** (`rooms.ts`): server owns `GameState`, validates every action with the engine's
  `applyAction` (it throws on anything illegal), keeps the chess clock, handles
  disconnect/reconnect (45s grace → abandonment), and settles Elo with `updateElo` on game end
  (winner/loser/draw), persisting the result and updating both players' records.

## Notes / next

- Ranked is **1v1**; local hotseat (2–4) stays fully client-side.
- Built for the base game (powers/affinities cut on the ship branch). The action surface is
  `claim` / `place` / `pass`, all server-validated.
- Production hardening still owed (plan Phase 5): rate limiting, TLS/`wss`, horizontal scaling,
  monitoring — and the **IP clearance** before any public launch.
