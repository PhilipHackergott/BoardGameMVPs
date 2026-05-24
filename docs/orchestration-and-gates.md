# Orchestration, State & Gates

How the factory tracks work, runs projects in parallel, and enforces human approval between
stages. There is no daemon — the **operator session** (Claude Code with root `CLAUDE.md`
loaded) is the orchestrator, and **files are the state**.

## State machine

Each project advances through stages, with a status inside each stage:

```
            ┌──────────────┐  feedback   ┌──────────────┐
            │ in-progress  │◀────────────│ awaiting-    │
            │              │────────────▶│ approval     │
            └──────┬───────┘   (revise)  └──────┬───────┘
                   │                            │ approve
                   │ blocked                    ▼
            ┌──────▼───────┐            advance to next stage
            │   blocked    │            (status resets to in-progress)
            └──────────────┘
```

- `stage`: `discovery → analysis → specification → build → test → shipped` (or `archived`).
- `status`: `in-progress | awaiting-approval | approved | blocked`.
- A stage agent always ends in `awaiting-approval` (work done) or `blocked` (needs input/decision).
- The operator only moves `stage` forward after the human approves the current gate.

### `shipped` is a returnable hub, not a terminus (post-ship polish loop)

Shipping v1 is a milestone, not the end — most titles keep getting polished after they ship.
So `shipped` is a **stable, returnable state**, not a dead-end before `archived`:

```
   … → test ──approve──▶ shipped (v1.0)
                            ▲   │  polish round
                            │   ▼
                      build ◀── (re-enter build → test → learn, no re-spec)
```

- A `shipped` project may re-enter **`build → test → learn`** for a polish round **without**
  going back through discovery/analysis/specification. During a round its `status` cycles
  `in-progress → awaiting-approval → approved` as usual; the `stage` stays `shipped`.
- Track polish rounds with a **`version`** field (`"1.0"`, `"1.1"`, …) in `project-state.json`,
  bumped when a polish round ships. Each `/learn` **appends** a dated section to
  `retrospective.md` and the knowledge base for that version — `/learn` is incremental, run once
  per shipped milestone, not a one-time close.
- The **first ship is the hard human gate** (never auto-crossed, per the golden rules). Each
  later polish round is still human-confirmed before it ships, just repeatable.
- `archived` means **truly done or abandoned** — no further polish expected. It is the only
  terminal state; `shipped` is not.

## `project-state.json` schema

Lives at `projects/<slug>/project-state.json`.

```json
{
  "slug": "lacuna",
  "title": "Lacuna",
  "created": "2026-05-20",
  "updated": "2026-05-20",
  "stage": "discovery",
  "status": "awaiting-approval",
  "version": null,
  "source": "manual-seed",
  "targets": ["web", "desktop", "mobile"],
  "stack": "react-ts-pixi",
  "ip": { "status": "unknown", "decision": null, "notes": "" },
  "gates": {
    "discovery":     { "approved": false, "date": null, "notes": "" },
    "analysis":      { "approved": false, "date": null, "notes": "" },
    "specification": { "approved": false, "date": null, "notes": "" },
    "build":         { "approved": false, "date": null, "notes": "" },
    "test":          { "approved": false, "date": null, "notes": "" }
  },
  "artifacts": {
    "candidate_brief":  "01-candidate-brief.md",
    "market_analysis":  null,
    "mvp_spec":         null,
    "build_plan":       null,
    "playtest_report":  null,
    "retrospective":    null
  },
  "history": [
    { "ts": "2026-05-20", "event": "created", "by": "new-project" }
  ]
}
```

`ip.status`: `unknown | clear | risky | blocked` — see `legal-and-ip.md`. A `build` gate must
not be approved while `ip.status` is `unknown` or `blocked`.

## `registry/projects.json` (the roll-up)

A single index of every project, so `/status` and parallel tracking work without scanning folders.

```json
{
  "updated": "2026-05-20",
  "projects": [
    {
      "slug": "lacuna",
      "title": "Lacuna",
      "stage": "discovery",
      "status": "awaiting-approval",
      "ip": "unknown",
      "updated": "2026-05-20",
      "path": "projects/lacuna"
    }
  ]
}
```

**Invariant:** after any state change, write `project-state.json` first, then update the
matching registry entry. They must never disagree on `stage`/`status`.

## Gates — the rules

1. Every stage command **ends at a gate**. The agent produces its artifact, sets
   `status: awaiting-approval`, and the operator posts a concise summary plus an explicit
   question: *"Approve to proceed to <next stage>, or send feedback to revise?"*
2. **Approval is per-project and per-stage.** Approving Lacuna's analysis says nothing about
   its build, and nothing about any other project.
3. **Feedback → revise in place.** On feedback, stay in the same stage, re-run the agent with
   the notes, overwrite/extend the artifact, return to the gate. Record the round in `history`.
4. **No skipping, no bundling.** Don't run two stages in one command. Don't pre-empt a gate
   "to save time." The gates are the product.
5. **Blocked is a first-class outcome.** If a stage can't complete (missing rights decision,
   ambiguous rules, failing build it can't fix), set `status: blocked`, explain what's needed,
   and stop.

## Parallelism

- Projects are isolated folders; any number can be mid-pipeline simultaneously.
- A command names its target (`/analyze lacuna`) and touches only that folder + the registry.
- `/status` reads `registry/projects.json` and reports a board: each project, its stage/status,
  and specifically **which ones are waiting on the human** (the actionable queue).
- Long-running build/test work for one project may be delegated to a subagent (optionally in
  the background) so the operator can advance other projects' gates meanwhile. The gate on the
  delegated project still waits for its artifact + human approval.

## The queue (lights-out layer)

The factory can run unattended between human gates. This is the "later evolution layered on top"
from `docs/00-architecture.md` — **the gates still stand**; the queue only automates the work
*between* the safe ones.

- **State:** `registry/queue.json` — an ordered `tasks[]` of stage commands plus a `policy`:
  - `autoApproveStages`: `discovery`, `analysis`, `specification` — the drainer may approve these
    gates unattended and auto-enqueue the next stage.
  - `hardStopStages`: `build`, `test`/ship — the drainer **never** auto-crosses these; it parks
    the project at `awaiting-approval` and notifies the human.
- **Command:** `/queue add|list|drain|remove|clear` (`.claude/commands/queue.md`). Bare `/queue`
  = `list`, a phone-friendly board.
- **Drain semantics:** run each pending task as its own command would (same preconditions, same
  agent). On `awaiting-approval`: auto-approve + advance if the stage is in `autoApproveStages`,
  else park-and-`PushNotification`. On a usage limit, leave tasks `pending` and stop — a scheduled
  runner retries after the window resets.
- **IP note:** the queue does **not** gate on IP. The IP decision still lands on a human because
  `build` is a hard stop (and `/build`'s own precondition still demands a recorded IP decision —
  see golden rule #5). IP gating can be moved into the queue policy later.

### The lock

Because an interactive operator (possibly steering from a phone via Remote Control) and a
scheduled drainer can both touch the files, `/queue drain` takes a lock at `registry/queue.lock`
(timestamped, considered fresh < 30 min) and releases it on exit. Anyone holding a fresh lock
means another run is active → stand down. The interactive operator should respect the same lock
before running stage commands.

### Resuming after a usage limit

On an always-on PC, `scripts/drain-queue.ps1` runs headless on a Windows Task Scheduler trigger
(~every 30 min). Each run is independent: it skips when locked, exits quietly when rate-limited,
and otherwise drains. So when a usage window lapses, the next tick simply resumes the queue.

## Operator routing checklist (per command)

1. Parse target slug; load `projects/<slug>/project-state.json`.
2. **Precondition check**: is the project at the expected prior stage with that gate `approved`
   (or is this a revision of the current stage)? If not → explain and stop.
3. For build/test: confirm `ip.status` is `clear` or an explicit `risky`-but-approved decision.
4. Invoke the stage agent (per `.claude/agents/`), passing the project path + relevant prior
   artifacts + a pointer to `knowledge/index.md`.
5. Write the artifact; update `project-state.json` and `registry/projects.json`; append `history`.
6. Post summary + gate question. Stop.
