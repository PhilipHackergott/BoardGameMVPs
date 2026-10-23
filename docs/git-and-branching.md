# Version control & branching

> Status: **default for all projects** as of 2026-05-24. This document governs how
> the factory uses git. It is referenced from the root `CLAUDE.md` (golden rule 8).

The factory is one git repository. Every project folder under `projects/` is tracked
in it. From discovery stub to shipped app, all work happens under version control so
that nothing is lost, changes are reviewable, and **multiple Claude Code consoles can
work different titles or branches at the same time**.

---

## 1. Repo model — one repo, many projects (monorepo)

```
BoardGameMVPs/            ← the git repo root (.git lives here)
├─ registry/projects.json ← still the index of "what's in flight"
├─ projects/<slug>/        ← one folder per game, tracked
├─ docs/  knowledge/  templates/  scripts/  .claude/
```

We keep **one repo**, not one-repo-per-game, because:

- the registry, knowledge base, docs, and shared agents/commands are cross-cutting —
  they version together with the projects that use them;
- a single `git worktree` pool lets many consoles run in parallel (see §3);
- it matches the existing self-contained-folder design.

If a single title ever needs to ship as its own public repo, split it out later with
`git subtree split` — nothing here prevents that.

## 2. Branch model

| Branch | Meaning |
|--------|---------|
| `main` | The integration line. Always the latest **shippable / approved** state of every project. Protected by the gates — work doesn't land here until it's passed its human gate. |
| `<slug>/<topic>` | A working branch for one project. Examples: `lacuna/online-mp`, `cull-the-crown/roguelike`, `compile/real-cards`. |
| `<slug>/<release>` | A release / polish line for a project heading to ship. Examples: `lacuna/alpha-0.1`, `war-of-the-ring/v1`. |

Rules of thumb:

- **Always namespace a branch with its project slug.** This is what makes parallel work
  safe and legible — `git branch` reads as a board of who's doing what to which title.
- **Branch off `main`** unless you are explicitly stacking on another in-flight branch.
- **One branch = one project's work.** Don't mix two titles in one branch; it breaks the
  parallelism and muddies the gate review.
- The release line (e.g. `lacuna/alpha-0.1`) can legitimately **diverge** from `main` — it
  is where we cut features we want to ship without (yet) cutting them everywhere. That is
  exactly why Lacuna's powers/affinities are removed on `lacuna/alpha-0.1` but still live
  on `main`: the branch *is* the stash.

### Commit & merge cadence (ties into the gates)

- Commit at every **meaningful checkpoint** — minimally, at each stage transition
  (`/spec`, `/build`, `/test`, `/learn`) and before/after any risky refactor.
- A stage gate approval is the natural point to **merge the working branch into `main`**
  (fast-forward or `--no-ff` merge commit, operator's choice).
- Per the factory's standing rule, the operator (Claude) **commits and pushes only when
  asked** — but "track this project in git" / "advance this stage" is such an ask. When in
  doubt about pushing to a shared remote, surface it rather than assume.
- Never force-push `main`. Force-push only your own un-merged working branch, and only when
  needed.

## 3. Parallel consoles → git worktrees

A worktree is a second working directory backed by the **same** `.git`. It lets a second
(or third) Claude Code console check out a *different* branch simultaneously, with no
clone and no clobbering.

```powershell
# From the main repo. Create a branch + its own working dir in one go:
scripts\new-worktree.ps1 lacuna online-mp          # off main (default)
scripts\new-worktree.ps1 lacuna online-mp main     # explicit base

# …or by hand:
git worktree add ..\BoardGameMVPs-lacuna-online-mp -b lacuna/online-mp main
```

Then **open a new Claude Code console with its working directory set to that worktree**
(`..\BoardGameMVPs-lacuna-online-mp`). It behaves like a normal checkout; commits there
go to that branch and are visible to every worktree.

```powershell
git worktree list                                  # see every active worktree + its branch
git worktree remove ..\BoardGameMVPs-lacuna-online-mp   # when the branch is merged/abandoned
git worktree prune                                 # tidy stale entries
```

Constraints to respect:

- **Two worktrees cannot have the same branch checked out.** One branch, one worktree.
- Each console operates on the project(s) for *its* branch only — the same
  "respect parallelism" rule as before, now enforced by the filesystem.
- `node_modules/` is per-checkout (it's git-ignored): run `npm install` in a fresh
  worktree's `app/` before building.

## 4. What is and isn't tracked

`.gitignore` (repo root) excludes:

- `node_modules/` — every project's `app/node_modules`.
- build output — `dist/`, `build/`, `.vite/`, `*.tsbuildinfo`.
- RL artifacts — `.rl-chrome/` (a throwaway Chrome profile the trainer spawns),
  `rl-checkpoints/`, `*.weights.bin`, `*.ckpt`, `*.onnx`.
- secrets — `.env*` (commit a `.env.example` instead).
- OS/editor cruft and `registry/queue.lock`.

Line endings are normalized to **LF in the repo** (`.gitattributes`, `core.autocrlf=false`)
so the eventual Linux multiplayer/account servers get clean files; Windows checkouts are
unaffected.

> **Large binaries:** Magical Athlete carries ~80 MB of PNG/HEIC test-reference images.
> They're under GitHub's 100 MB/file limit so they're committed as-is for now. If the repo
> grows heavy, migrate `**/tests/refs/**` to **Git LFS** — that's the first thing to reach
> for, not history rewriting.

## 5. Remotes (GitHub)

Both repos are published as **private** repos under the `PhilipHackergott` account:

| Repo | Remote | Branches |
|------|--------|----------|
| The factory monorepo | `https://github.com/PhilipHackergott/BoardGameMVPs` | `main` (default), plus each `<slug>/<topic>` working branch |
| Späti (standalone) | `https://github.com/PhilipHackergott/spaeti` | `main` (default), `godot-vertical-slice` |

Späti is a **separate repo**, not a submodule — it sits as a nested git repo at
`projects/spaeti/` and is gitignored by the parent. Commit and push it from inside that
folder; the factory repo neither tracks nor pushes it.

Auth is via the GitHub CLI acting as git's credential helper (`gh auth setup-git`), so no
token prompt appears on push. If a push ever fails with `Repository not found` on a repo
that does exist, that helper has been displaced — re-run `gh auth setup-git`.

Every local branch tracks its `origin` counterpart, so a bare `git push` publishes the
current branch from any worktree. Open a PR per project branch to review at the gate.

> Pushing remains **on request only** — see §3. A configured remote is not standing
> permission to publish.
