# BoardGameMVPs — Factory Operating Manual

This repository **is** a software factory. Its job: turn board games into playable
digital MVPs (web-first, then wrapped for desktop/mobile) through a 5-stage pipeline
with a human approval gate between every stage.

You (Claude) are the factory operator. This file tells you how to run it. Read it
fully before acting on any factory command.

---

## Mental model

```
discovery → [gate] → analysis → [gate] → specification → [gate] → build → [gate] → test/iterate → [gate] → shipped
  /find              /analyze            /spec                    /build           /test                   /learn
                                                                   ▲                                          │
                                                                   └──────── post-ship polish round ◀─────────┘
                                                              (shipped re-enters build → test → learn, no re-spec)
```

- Each **stage** is run by a dedicated subagent (see `.claude/agents/`) and triggered
  by a **slash command** (see `.claude/commands/`).
- **`shipped` is a returnable hub, not a terminus.** Most titles keep getting polished after v1.
  A shipped project can re-enter `build → test → learn` for a polish round **without** repeating
  discovery/analysis/spec; bump a `version` (`1.0 → 1.1`) per shipped round and let `/learn` append
  incrementally. The first ship is still a hard human gate; `archived` is the only terminal state.
  See `docs/orchestration-and-gates.md`.
- Each stage **produces one artifact** in the project folder and then **STOPS**.
- A **gate** is a human decision: approve → advance, or give feedback → revise in place.
- **Never auto-advance across a gate.** The whole point is human confirmation between steps.
- Multiple projects run **in parallel** — each is an independent folder with its own state.

## Where everything lives

| Path | Purpose |
|------|---------|
| `docs/` | The factory's own specifications (how the pipeline works). Start at `docs/00-architecture.md`. |
| `.claude/agents/` | One subagent per stage. |
| `.claude/commands/` | Slash commands that drive the pipeline. |
| `templates/` | Files copied into each new project folder. |
| `projects/<slug>/` | One folder per game. Self-contained: state, artifacts, and the `app/` code. |
| `registry/projects.json` | Index of all projects and their current stage/status. The source of truth for "what's in flight". |
| `registry/queue.json` | The work queue + auto-approve policy for unattended/remote operation (see `/queue`). |
| `knowledge/` | Accumulated, crawlable lessons. Read before every stage; written to after every project. This is how the factory self-improves. |

## State & the registry

Every project has `projects/<slug>/project-state.json` (schema in `docs/orchestration-and-gates.md`).
`registry/projects.json` is the roll-up index. **Keep both in sync.** After any stage
transition or gate decision, update the project state first, then the registry entry.

`stage`: `discovery | analysis | specification | build | test | shipped | archived`
`status`: `in-progress | awaiting-approval | approved | blocked`

## The golden rules

1. **One artifact, then stop at the gate.** Produce the stage deliverable, update state to
   `awaiting-approval`, summarize for the human, and wait. Do not start the next stage.
2. **Crawl before you create.** Before any stage, read `knowledge/index.md` and skim relevant
   prior `projects/*/` artifacts. Reuse what worked; avoid logged mistakes.
3. **Respect parallelism.** Operate on the project named in the command. Don't touch others.
   Use `/status` to see the whole board.
4. **Keep the engine pure.** Game rules go in a framework-agnostic `app/src/engine/` module
   (see `docs/stack-and-conventions.md`). UI consumes the engine; never the reverse.
5. **IP first.** No build starts until the rights/licensing check in `docs/legal-and-ip.md`
   has a recorded decision. Adaptations of others' IP are a real risk — surface it, don't bury it.
6. **Write down what you learned.** Every project ends with a `retrospective.md`, distilled
   into `knowledge/` via `/learn`.
7. **Respect the queue lock.** Before running a stage command, if `registry/queue.lock` exists
   and is fresh (< 30 min), a drainer or another operator is active — stand down. The queue may
   auto-approve **only** `discovery → analysis → specification`; it must **never** auto-cross the
   `build` or ship gates. (See "Remote & queued operation" below.)

## Running a command

When the user invokes a stage command (e.g. `/analyze lacuna`):
1. Load the matching agent and the project's current state.
2. Confirm the project is at the correct prior stage and `approved` (or this stage's revision).
3. Do the work per the agent's spec; write the artifact into `projects/<slug>/`.
4. Update `project-state.json` and `registry/projects.json`.
5. Post a short summary + the explicit gate question ("Approve to proceed to X, or send feedback?").

If a command's preconditions aren't met (wrong stage, missing approval, missing artifact),
say so and stop — don't improvise around the gate.

## Remote & queued operation

The factory can be driven from a phone and can run unattended between the safe gates.

- **From a phone:** the Claude iOS app's **Remote Control** pairs to a `claude` session running
  on the (always-on) PC. Whatever you type there runs in the live local session against the real
  files. So `/status`, `/queue` (view the board), `/queue add /spec lacuna` (or plain English,
  "queue a spec for lacuna"), and gate approvals all work from the phone — no GitHub, no cloud.
- **Notifications:** when the drainer parks a project at a hard gate it sends a `PushNotification`
  ("lacuna spec done → build gate awaiting you"); with Remote Control connected this reaches the
  phone. Use it to pull attention only for real gate decisions, not routine progress.
- **The queue:** `/queue drain` runs pending stage tasks, auto-approving `discovery → analysis →
  specification` and stopping at `build`/ship. It holds `registry/queue.lock` while running.
  Full semantics: `.claude/commands/queue.md` and `docs/orchestration-and-gates.md`.
- **Resume after usage limits:** `scripts/drain-queue.ps1` runs headless on a Windows Task
  Scheduler trigger (~30 min). It skips when locked, exits quietly when rate-limited, and resumes
  the queue on the first tick after a usage window lapses. Register it via
  `scripts/register-drain-task.txt`.

## First project

`projects/lacuna/` is seeded as the first title (manually). Its discovery artifact is a stub
to be filled by `/find lacuna` or, since it's a manual seed, by `/analyze lacuna` once the
candidate brief is confirmed. Treat real-world facts about the game as **unverified until the
analysis stage confirms them** — do not fabricate ratings, designer, or publisher data.
