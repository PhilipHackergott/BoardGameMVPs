---
description: Manage the factory work queue — enqueue tasks, view the board, or drain pending work (auto-approving the safe early stages, stopping at build/ship).
argument-hint: "[add <cmd> <slug> | list | drain | remove <id> | clear]"
---

Operate the **work queue** for the factory: `$ARGUMENTS`

The queue lets the factory run unattended (and be driven from a phone via Remote Control). It
holds an ordered list of stage commands to run. The drainer runs each, **auto-approves the safe
early stages** (discovery → analysis → specification), and **hard-stops before build and ship**
so a human always makes those calls. This is the "lights-out layer" from
`docs/00-architecture.md`; the build/ship gates still stand.

State lives in `registry/queue.json`:
- `policy.autoApproveStages` — stages whose gate the drainer may approve unattended.
- `policy.hardStopStages` — stages the drainer must never auto-cross (`build`, `test`/ship).
- `tasks[]` — `{ id, cmd, slug, status, enqueuedAt, note }`, `status` ∈ `pending | running | done | blocked | failed`.

Parse the first token of `$ARGUMENTS` as the subcommand. **Bare `/queue` (no args) = `list`.**

---

## `add <cmd> <slug>`
Also accept plain English (e.g. "queue a spec for lacuna") and map it to the right `cmd`/`slug`.

1. Validate `cmd` ∈ `/find /analyze /spec /build /test /learn` and `slug` exists in `registry/projects.json`.
2. Append a task: `{ id: "q<n>", cmd, slug, status: "pending", enqueuedAt: "<today>", note: "" }`
   (monotonic `id`). Bump `updated`. Confirm what was queued and its position.

## `list`  (also bare `/queue`)
Print a **short, mobile-friendly board** — built to read on a phone:
1. **Pending/running tasks**, one line each, in order: `q3  /spec lacuna  · pending`.
2. **Waiting on you** — projects at `awaiting-approval` in a hard-stop stage, with the exact next
   command (e.g. "lacuna · build gate → review `app/`, then `/build lacuna` or feedback").
3. A one-line **digest**: `N done · M waiting on you · K pending`.
Keep it terse. No tables wider than a phone screen.

## `remove <id>`
Drop that task (only if `pending`). Bump `updated`. Confirm.

## `clear`
Remove all `pending` tasks (leave `running`/`done` history untouched). Bump `updated`. Confirm count removed.

## `drain`  — the engine
Run pending work per policy until a hard gate, a usage limit, or the queue empties.

1. **Lock.** If `registry/queue.lock` exists and is fresh (< 30 min old), another drainer or the
   interactive operator is active → **stop, do nothing**. Otherwise write `registry/queue.lock`
   with the current timestamp. **Always delete the lock before returning**, including on early exit.
2. **Process `pending` tasks in order.** For each:
   a. Set the task `running`. Load `projects/<slug>/project-state.json`.
   b. Run that stage **exactly as its own command would** — same precondition checks and agent
      delegation in `docs/orchestration-and-gates.md` (operator routing checklist). Honor each
      command's own preconditions (e.g. `/build` still requires a valid IP decision; if missing,
      that stage sets `status: blocked` on its own). Write `project-state.json` first, then
      `registry/projects.json` (the existing invariant), then update the task.
   c. **When the stage lands `awaiting-approval`:**
      - If its stage ∈ `policy.autoApproveStages` → mark that gate `approved` in
        `project-state.json` (`gates.<stage>.notes = "auto-approved by /queue drain <today>"`),
        advance `stage` to the next, reset `status: in-progress`, sync the registry, set the task
        `done`, **enqueue the next stage's command** as a new `pending` task, and **continue**.
        (No IP check here — that's deferred to the human build gate.)
      - Else (stage ∈ `policy.hardStopStages`, i.e. `build` or ship) → leave the project
        `awaiting-approval`, set the task `done`, send a **`PushNotification`** with the gate
        question (e.g. "lacuna spec done → build gate awaiting you"), and **stop draining**.
   d. If a stage sets `status: blocked` → set the task `blocked`, `PushNotification` why, **stop draining**.
   e. **If a usage/rate limit is hit** → leave the current and remaining tasks `pending` (revert
      `running` → `pending`), release the lock, and stop gracefully. The Task Scheduler runner
      (`scripts/drain-queue.ps1`) retries after the window resets.
3. **Release the lock.** Print a summary: what advanced, what is now waiting on you, what remains pending.

**Mapping the next stage** (for auto-enqueue in 2c): `discovery→/analyze`, `analysis→/spec`,
`specification→/build`. (Build and beyond are never auto-enqueued — they're hard gates.)
