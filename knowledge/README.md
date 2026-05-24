# Knowledge Base

This is the factory's memory. It exists so each project ships faster and cleaner than the last.

**Every stage agent crawls this before it starts. Every finished project writes back to it.**
That read→act→write-back loop is the factory's self-improvement mechanism.

## What goes here

- **`index.md`** — the crawl entrypoint. A curated, linked map of everything in here. Agents read
  this first; keep it current.
- **`patterns/`** — reusable *engineering* knowledge: engine state shapes per mechanic, AI
  approaches, Pixi/React integration patterns, scaffolding, recurring build gotchas.
- **`playbooks/`** — reusable *process* knowledge: discovery heuristics, market patterns, spec
  practices that kept builds tight, playtest heuristics that caught real problems, IP precedents.

## What does NOT go here

- Project-specific facts (those live in the project folder).
- Anything unverified stated as fact.
- Raw dumps. Distill. A pattern is worth saving only if the next project can apply it.

## How entries are created

`/learn <slug>` runs at the end of a project: it writes the project's `retrospective.md`, then the
`qa-playtester` agent distills generalizable lessons into `patterns/` and `playbooks/` and updates
`index.md`. You can also add entries by hand any time you spot a durable lesson.

## Crawling the corpus

The whole repo is the training set, not just this folder. When an agent needs precedent it may
also read prior `projects/*/` artifacts (briefs, specs, retrospectives) and reuse `app/` code.
`index.md` should link to the standout examples worth copying.
