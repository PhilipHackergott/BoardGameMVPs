# 08 — Production Plan

**From a local prototype to an online, ranked, account-based product.**

Status: planning artifact (no production code written yet). Drafted on the
`lacuna/alpha-0.1` branch alongside the ship-polish work. Each phase below ends at a
factory gate — this is a roadmap, not a licence to auto-build through the build gate.

---

## 0. Scope

`alpha-0.1` is **local hotseat + vs-CPU** with a cleaned-up menu. The production target the
user described:

- **Online multiplayer is the default way to play.** Hotseat becomes one option in setup.
- **Ranked ladder with an Elo rating system.**
- **Host games and invite friends directly.**
- **Accounts** — creation + management, with the standard account settings living in the
  Settings menu.

This document turns that into an architecture, a data model, a phased build order, and the
information architecture the menu should grow into. It also flags the one gate that now
becomes load-bearing (IP — §7).

## 1. The decisions that shape everything

1. **Server-authoritative, turn-based.** Lacuna's `app/src/engine/` is the asset that makes
   this tractable: it's a **pure, deterministic, serializable** reducer — `createGame(seed,
   config, …)` + `applyAction(state, action)` fully determine the game. Run the *same engine
   on the server* as the single source of truth. Clients send **intents** (actions); the
   server validates each with `applyAction` (it already throws on illegal moves), owns
   scoring, and broadcasts state. Because the game is turn-based we need **no rollback, no
   tick loop, no client-side prediction** — the hard parts of real-time netcode simply don't
   apply. This also means cheating is a non-issue for play (the client can't fabricate a
   score the server didn't compute).
2. **Reuse, don't rewrite.** Extract the existing pure modules into a shared package both
   client and server import:
   - `engine/` — rules, scoring, the action reducer.
   - `ai/ai.ts` — already drives seats; reuse it to **fill empty seats and cover
     disconnects** online.
   - `rl/elo.ts` — `expectedScore`, `updateElo`, `fitElo`, `rateVsFixed` are **already
     written and unit-tested**. The ladder's math exists today.
   - `rl/matchmaking.ts` — `pickOpponent` / baseline-1000 rating groundwork to seed the
     matchmaker.
   - The `SavedGame` snapshot concept in `state/store.ts` (serialize game + config + clocks)
     is exactly the reconnection payload.
3. **Buy the risky parts.** Don't roll our own auth/crypto. Use a managed identity provider
   (§2). Keep our custom code to the game server (where our engine lives) and the client.
4. **The IP question becomes real at public launch.** See §7 — decide it *before* Phase 1.

## 2. Recommended stack

| Layer | Recommendation | Why / alternatives |
|-------|----------------|--------------------|
| **Shared core** | `@lacuna/engine` workspace package (npm/pnpm workspaces), pure TS, no DOM | One source of truth for rules; imported by client + server. |
| **Realtime game server** | Node + TypeScript, **[Colyseus](https://colyseus.io)** (authoritative room framework: state sync, matchmaking hooks, reconnection built in) | Turn-based fits its room model perfectly. Alt: a lean custom `ws` server (more control, more plumbing). |
| **Auth + DB** | **Supabase** (managed Postgres + Auth with email/OAuth + Row-Level Security) as one-stop | Fastest path to accounts + persistence. Alts: Clerk/Auth0 for auth + Neon/RDS for Postgres; or self-host Auth.js/Lucia + Postgres. |
| **Client** | Existing React/Vite app + a thin net layer (Colyseus client or `ws`) + the auth SDK | No rewrite; the Mode toggle already stubs the seam. |
| **Hosting** | Client static on Vercel/Netlify/Cloudflare Pages; game server containerized on Fly.io/Railway/Render (regions near players); managed Postgres | Turn-based ⇒ rooms idle cheaply; cost scales with concurrent matches, not ticks. |

The match server holds a service credential to write authoritative match results (ratings,
history) to Postgres; clients never write game outcomes directly.

## 3. Architecture

```
        ┌───────────┐  auth (JWT)   ┌──────────────┐
        │  Client A │◀─────────────▶│ Auth provider│  (Supabase Auth / Clerk)
        │  (React)  │               └──────────────┘
        └─────┬─────┘
              │ WebSocket: {action, resign, rematch, chat}
              ▼
        ┌─────────────────────────┐      ┌───────────────┐
        │   Match server (Node)   │◀────▶│   Postgres    │  profiles, ratings,
        │  runs @lacuna/engine    │ svc  │  (Supabase)   │  matches, friends
        │  applyAction = truth    │ key  └───────────────┘
        │  server-side chess clock│
        └─────────────────────────┘
              ▲
              │ WebSocket: {state, youAre, matchOver:{result, eloDelta}}
        ┌─────┴─────┐
        │  Client B │   + a Matchmaker service that pairs queued players by rating
        └───────────┘     and spins up rooms.
```

**Message protocol (sketch).**

- Client → server: `joinRoom(code|queueTicket)`, `act(action: Action)`, `resign`,
  `offerRematch`, `chat(msg)`.
- Server → client: `youAre(seat)`, `state(GameState)` (full state is fine — Lacuna is
  perfect-information; switch to per-seat views only if a future title has hidden info),
  `clock(remainingMs[])`, `error(reason)`, `matchOver({ result, ratingDeltas })`.

**Reconnection.** The room retains state; a client rejoins with its token and receives a
fresh `state` (the `SavedGame` snapshot). A grace timer covers brief drops; on timeout the
server hands the seat to the `ai/` driver or forfeits per match rules.

**Clock authority.** The chess clock that currently ticks in the client (`tickClock`) moves
**server-side** — the server is the timekeeper, so a player can't pause by closing the tab.

## 4. Data model (Postgres sketch)

```
accounts        (id, email, …)                         -- managed by the auth provider
profiles        (user_id PK→accounts, handle UNIQUE, display_name, avatar, country, created_at)
ratings         (user_id, mode, rating DEFAULT 1000, rd, games, wins, losses, draws, season_id)
matches         (id, mode, ranked bool, seed, config jsonb, started_at, ended_at, result)
match_players   (match_id, user_id, seat, rating_before, rating_after, outcome)
friendships     (user_id, friend_id, status[pending|accepted|blocked], created_at)
invites/rooms   (code, host_id, settings jsonb, created_at, expires_at)   -- ephemeral; Redis/in-memory ok
```

Rating defaults to **1000**, matching `rl/matchmaking.ts`'s baseline and `fitElo`'s
`anchorMean` — the offline RL ladder and the live ladder share one scale, so trained CPU
opponents can be slotted onto the same number line as humans.

## 5. Phased roadmap

Each phase is a self-contained slice that ends at a human gate. Build them in order.

### Phase 0 — Foundation & a thin vertical slice *(de-risk first)*
- Extract `@lacuna/engine` shared package; make the client import it (no behaviour change).
- Stand up a minimal Colyseus/`ws` server that runs the engine for **one hardcoded room**.
- Wire a client net layer so **two browsers play one full game online**, server-authoritative,
  via a shared link — no auth, no rating yet. Stub reconnection.
- **Exit:** two real clients finish an online game; the server rejected at least one illegal
  move. This proves the whole premise cheaply before we build accounts on top of it.

### Phase 1 — Accounts & identity
- Integrate the auth provider: sign up / log in (email + password, magic link, Google OAuth),
  sessions/JWT, and **guest play** (anonymous account, upgradable to a real one).
- Profile creation: unique handle, display name, avatar/colour.
- **Settings → Account** (the user's "standard account-management stuff"): change
  email/password, link/unlink OAuth, sign out of all sessions, privacy controls, **export my
  data**, and **delete account** (GDPR-correct hard delete).
- **Exit:** a user creates an account, manages it, and is recognized across devices/sessions.

### Phase 2 — Online play, properly (private games first)
- **Lobbies:** create a private room → shareable **code + invite link**; join by code; host
  sets match options (players, timer); seat assignment; ready-up; start.
- Flip the menu's **Mode** toggle live: **Local (hotseat)** | **Online**. Hotseat is now
  formally one option, online is the headline.
- In-match: server-authoritative play, server-side chess clock, **resign**, **rematch**,
  **reconnection** (grace timer → AI takeover/forfeit), post-game summary.
- **Exit:** friends play a full private online match end-to-end, including a deliberate
  disconnect + reconnect.

### Phase 3 — Matchmaking + ranked ladder + Elo
- **Quick Match** queues: Casual and Ranked. Matchmaker pairs by rating within a widening
  band (seed from `rl/matchmaking.pickOpponent`); placement matches for new accounts.
- **Rating updates** via the existing `updateElo`. For 3–4-player games, convert final
  standings into pairwise results and apply `updateElo` per pair (simple, robust for v1);
  `fitElo` is available if we later batch-rate. Abandon = loss + penalty.
- **Leaderboard** (global / friends / seasonal); **seasons** (soft reset) v1; rank + rating
  shown on the profile.
- **Exit:** ranked results move ratings; the ladder is visible; placements work.

### Phase 4 — Social
- **Friends:** search by handle, request/accept/block, **presence** (online / in-game),
  recent opponents.
- **Invite friends directly:** from the friends list → creates a private room and notifies
  them; one-click **rematch**; optional spectate.
- **Exit:** invite a friend from the list into a game in two clicks.

### Phase 5 — Hardening, ops & launch readiness
- Rate limiting, server-side input validation, moderation (report/mute, handle/profanity
  filtering), anti-abuse review.
- Observability: structured logs, metrics (concurrent rooms, queue time, error rate),
  alerting; load-test the match server; horizontal scale (stateless matchmaker + sharded
  rooms, sticky-by-room).
- CI/CD from git (now that the factory is on branches/PRs), a staging environment, DB
  migrations + backups.
- Legal: Terms of Service, privacy policy, age gating, verified account deletion — **and the
  IP clearance in §7**. Cost model + monitoring.
- **Exit:** production launch checklist green.

**Rough effort (one builder, relative):** P0 S–M · P1 M · P2 M–L · P3 M · P4 S–M · P5 M–L.
This is a multi-month program; the gates keep it honest.

## 6. Menu / information architecture (the destination)

The redesigned `alpha-0.1` New Game screen already plants the seam (**Mode: Local |
Online**). The final IA it grows into:

```
Home
 ├─ Play ▸
 │   ├─ Quick Match — Ranked        (Phase 3)
 │   ├─ Quick Match — Casual        (Phase 3)
 │   ├─ Private Game (host/invite)  (Phase 2)
 │   ├─ vs CPU                      (today)
 │   └─ Local (hotseat)             (today — now one option, not the default)
 ├─ Continue                        (today)
 ├─ Profile        — rank, rating, record, history, avatar   (Phase 1/3)
 ├─ Leaderboard                                               (Phase 3)
 ├─ Friends        — list, requests, presence, invite          (Phase 4)
 └─ Settings ▸
     ├─ Account    — email/password, OAuth, delete, privacy    (Phase 1)  ◀ new
     ├─ Gameplay
     ├─ Audio                                                   (exists)
     └─ Display / Theme                                         (exists)
```

The current setup screen's **Match options** (timer) and **Seats** blocks carry straight into
the Private-Game host flow.

## 7. Risks — and the load-bearing IP gate ⚠️

- **IP exposure jumps at a public, account-based launch.** `project-state.json` records IP as
  **risky**: the *Lacuna* name is trademarked; the recorded decision was to build with the
  name + pond/flower theme using **original art**, with the MVP **UNPUBLISHED** and CMYK
  (publisher) licensing **deferred** — explicitly noting it "MUST revisit licensing /
  clean-room before any public release." A ranked, account-based online product *is* that
  public release. Per factory **golden rule 5** and `docs/legal-and-ip.md`, resolve this
  **before Phase 1** (accounts are the point of no easy return — branding/SEO/users
  accrete):
  - **(a) License** from CMYK / the designer, or
  - **(b) Re-theme to fully original IP** under our own name. Game *mechanics* aren't
    copyrightable and our engine + art are ours, so a re-skin (the theme system already
    supports reskins — see `ui/theme.ts`) is the cheapest clean path **while we still have no
    users**.
- **Scope / sequencing.** Multi-month effort — keep each phase behind its gate; do not let
  the queue auto-cross build/ship.
- **Matchmaking liquidity** at low population — fill with CPU (we have a rated AI ladder) and
  Casual; widen rating bands over time.
- **Account-deletion / GDPR correctness** — test the hard-delete path; it's a launch blocker.
- **Toxicity** — turn-based, text-only chat keeps the moderation surface small; still need
  report/mute.
- **Server cost** stays low while idle (turn-based), scales with concurrent matches.

## 8. Smallest next step

Cut a working branch off the alpha line and build **Phase 0** only:

```powershell
scripts\new-worktree.ps1 lacuna online-mp lacuna/alpha-0.1
```

First task in it: extract `@lacuna/engine` and stand up the two-client authoritative echo of
actions. Everything else waits behind the Phase 0 gate — and the IP decision (§7) should be
made before Phase 1 starts.
