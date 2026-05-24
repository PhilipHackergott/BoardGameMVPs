# Driving the Compile MVP from your phone

The cloud "dispatch" trigger doesn't fit this factory (it's a local, non-git folder). Use the
documented path instead: the **Claude iOS app's Remote Control**, paired to a `claude` session on
this always-on PC. Whatever you type on the phone runs in the live local session against the real
files — no GitHub, no setup beyond pairing.

## One-time / each session

1. On the PC, open a terminal in the repo root (`c:\Users\phili\Documents\BoardGameMVPs`) and start
   a session: `claude`.
2. In the **Claude iOS app**, open **Remote Control** and pair to that running session.
3. You're now typing into the same session — `/status`, gate approvals, and the prompts below all
   work from the phone.

## What to send for Compile

- **Drop in real card data** (the only thing left for true 1:1):
  > "Here's the real Compile card text — encode it into projects/compile/app/src/engine/cards.ts and
  > set placeholder:false, then build + test." …then paste the card list (or a file path).
- **Tweak look / balance / rules:** plain English, e.g. "make the compile burst bigger" or "the AI
  should value face-down plays less."
- **Report a bug:** describe what you saw; I'll repro against `npm test` / the dev server.

After any change I'll run `npm run build` and `npm test` in `projects/compile/app` and report back.
I won't cross the build/ship gate without your OK.

## Where things are

- Card data (edit this for 1:1): `app/src/engine/cards.ts`
- Rules→code map + schema: `app/README.md`
- Project status: `project-state.json`
