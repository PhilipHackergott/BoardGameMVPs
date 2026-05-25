# Balance & tuning — let the AI playtest the content for you

How to ship a build whose content is **tuned, not wildly broken** — using the pure engine + the AI as
a headless playtester. This is the row-6 requirement in `target-state.md`. Crawl it once you have a
content catalog and a difficulty ladder.

> Why this exists. Every content wave on **Cull the Crown** ended with "UNTUNED — a balance item," and
> **Lacuna** only became balanced after a measured sweep found one power that auto-won **99%** of games.
> Both shipped content nobody had verified was fair, because there was no cheap way to *measure* it.
> There is: a deterministic engine + an AI that plays it = an unlimited playtester. Lacuna's full method
> is in `projects/lacuna/07-balance-report.md`; this is the reusable recipe.

## The core idea

Our engine is **pure, deterministic, and headless-simulatable**, and our AI is a set of pure choosers
dispatched through the real actions (`patterns/ai.md`). Compose them: run thousands of **AI-vs-AI**
games over the engine with no UI, tally win rates per piece of content, and you have an objective
balance signal in seconds. The same harness verifies the **difficulty ladder**. This is a free,
repeatable balance lab — build it once per project, re-run it after every change.

## The harness (build it once)

Add a headless driver and an `npm run sim` script.

- **Replicate the App driver loop over the pure engine** — claim → place → resolve every sub-phase →
  pass, exactly as the UI driver does, but with no rendering. (Lacuna: `app/tests/sim/balance.test.ts`
  replicates the `App.tsx` driver; `package.json` `"sim"`.) For a single-player roguelike, "AI-vs-AI"
  becomes "AI plays the gauntlet at each stake/deck" — measure *clear rate per royal/blind*, run length,
  and gold curves instead of head-to-head win rate.
- **N games per category** (Lacuna used 600–800). More N = tighter intervals; expose `SIM_N`.
- **Seed every game** so a finding is reproducible (`{config, seed, action-log}` replays it exactly).
- **Output a table + raw JSON** (`balance-sim.json`) so runs are diffable across patches.

```
npm run sim          # AI-vs-AI sweep → win-rate table + balance-sim.json
SIM_N=2000 npm run sim   # tighter intervals before shipping a tuning decision
```

## Method that gives a clean signal

- **Randomize content assignment to seats** — assign powers/relics/decks *at random* to the seats,
  **not** via the in-game draft, so a piece's win rate isn't confounded by who drafted first.
- **Hold one variable as the control.** Seat 0 always moving first makes the **seat-0 win rate a clean
  first-player-advantage signal** (Lacuna: ~49–51% round-robin = fair). For the difficulty ladder,
  **alternate seats** so first-player cancels out and you measure *skill*, not seat.
- **`winRate = (wins + 0.5·draws) / appearances`.** A balanced piece sits near **50%**. Track a
  secondary domain metric too (Lacuna's `colorMargin`) — it catches "wins anyway" dominance.
- **Sanity-gate the run:** assert 0 errors and 0 non-terminating games. A power that hangs the sim is
  a power that can hang the UI.

## The two targets

1. **Compress the win-rate spread.** Goal: from "24%→99%" toward **~42–58%**, with most content inside
   35–65%. Anything near 50% is fine; the outliers are the work. Re-sim after each change.
2. **Verify the difficulty ladder actually climbs.** A separate test: harder tier vs. easier tier,
   seats alternated. Lacuna's ladder reads **Hard beats Medium 78–84%, both beat Low ~100%**. Before
   this test, "Hard" was secretly ≈ Medium — the ladder *looked* like three tiers and wasn't. **If you
   ship multiple difficulties, you must prove the ladder, or it's cosmetic.**

## The patch → re-sim loop (this is the whole job)

```
sim → read the outliers → classify each → patch → sim → repeat until the spread is compressed
```

Classify every outlier before touching it — the fix is different:

- **Numbers problem** → tune constants (radius, bonus size, price, HP mult). Most outliers. Lacuna
  nerfed Procrastinator's cluster-collect to "+1, first 3 placements only"; buffed Hoarder's threshold.
- **Design problem** → the mechanic itself is broken/dull; rework it, don't re-number it. Lacuna's
  Repeller "pushed flowers away" (which only hurt its owner) — no constant fixed it; it was **redesigned
  into a pull/harvest ("Magnet")**, 32% → 54%. Flexible's "extra turn" was a no-op reorder until it
  granted a *genuine extra pawn*.
- **AI-blind** → see below. The number is untrustworthy; fix the AI or flag it, don't tune it.

## The two insights that save you from chasing ghosts

These are the non-obvious lessons that cost Lacuna real time — internalize them.

### 1. Balance is *relative to AI skill* — and it moves when the AI improves

Win rates are measured *under a specific AI*. When Lacuna's Hard AI went from greedy+rival to a 2-ply
lookahead, the numbers **reshuffled**: Warding jumped to 83% (a smarter AI exploits placement-denial),
and the first-player edge *flipped* to second-player (a sharper opponent punishes the opener). So:

- **Re-tune against the AI you ship.** Tuning against a weak AI, then shipping a strong one, invalidates
  the tuning. Lock the ladder first, *then* balance against the top tier.
- **Don't over-fit to noise.** Per-piece CI is ~±8% at N=800; **±5-point moves are noise.** Leave
  "mildly hot" content alone rather than chasing a moving target. Bump `SIM_N` before a close call.

### 2. AI-blind content reads artificially low — that's a floor, not a verdict

A greedy/shallow AI **cannot use** optional actives, information effects, or multi-turn combos, so
content that depends on them scores low *for the wrong reason*. Lacuna's Nomad/Flexible (unused
actives), Controlling (lens-denial meaningless to an AI that ignores the lens), and Momentum/Flying
(planning-dependent) all read 22–37% — not because they're weak, but because the **measurement is
blind to them**. The discipline:

- **Tell the two apart.** If a real human would obviously use it but the AI doesn't, treat the low score
  as an **AI-undervalued floor**, not imbalance.
- **Fix the instrument when you can.** Teaching the AI to use Nomad's redeploy moved it 24% → 61% — the
  *content* was fine. Improving the AI is often the real balance fix.
- **Flag the rest for `/test`.** Planning-heavy or information content (Momentum, Flying, "see the
  projection" powers) needs **human playtests or a planning AI** to judge. Record it; don't buff it into
  being broken vs. humans to make a blind number look right.

> Corollary: a stronger AI is *both* a better opponent and a better balance instrument. Investing in the
> ladder pays twice. This is why row 5 (AI ladder) and row 6 (balance) of the target state are built
> together.

## What the build does vs. what `/test` does

This keeps the gates honest while still shipping a tuned game:

- **Build stage (this playbook):** stand up the harness, lock the difficulty ladder, run a tuning pass
  until the spread is compressed and nothing is auto-win or dead. Write a **one-paragraph balance note**
  (where it landed, what's still flagged) into the build summary / `project-state.json` history.
- **`/test` stage:** deeper tuning under human play and a planning AI; resolve the AI-blind flags;
  fine-tune the curve. A balance report graduates to `projects/<slug>/0X-balance-report.md` (see
  Lacuna's as the format).

## Reusable assets

- **Sim harness pattern** — `projects/lacuna/app/tests/sim/balance.test.ts` + the `sim` script; copy the
  driver-loop-over-pure-engine shape and the random-assignment / alternate-seats methodology.
- **Report format** — `projects/lacuna/07-balance-report.md` (method, headline findings, per-piece
  table with verdicts, patch notes, after-results, the AI-skill caveat).
- **AI ladder** — `patterns/ai.md` (one shared `estimate()`; Low heuristic+jitter / Med greedy / Hard
  lookahead) and `projects/lacuna/app/src/ai/ai.ts`.

## Pitfalls

- **Tuning a single piece in isolation** misses interaction/dominance — measure the whole catalog each
  run, and watch the secondary metric (margin), not just win/loss.
- **Shipping difficulties you never sim'd** — "three tiers" that all play the same is the most common
  hidden defect; the ladder test is one assertion and catches it.
- **Treating every low number as weak** — re-read insight #2 before you buff. Half of Lacuna's "weak"
  content was just AI-blind.
- **Over-fitting to noise** — re-read insight #1. ±5pt at N=800 is nothing.
