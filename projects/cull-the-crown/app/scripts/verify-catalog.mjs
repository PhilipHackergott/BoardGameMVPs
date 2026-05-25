import { chromium } from "playwright";
import { mkdirSync } from "fs";
const url = process.argv[2] || "http://localhost:4173";
const OUT = "catalog";
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const VIEW = { width: 1280, height: 860 };
// `p` is reassigned to a fresh context before the shop segment (see below); the helpers below close over
// it, so reassigning the `let` swaps every helper onto the new page.
let p = await b.newPage({ viewport: VIEW });
const log = [];
const shot = async (name) => { await p.screenshot({ path: `${OUT}/${name}.png` }); log.push(name); };
const wait = (ms) => p.waitForTimeout(ms);
const clickBtn = async (re) => {
  const el = p.getByRole("button", { name: re }).first();
  if (await el.count().catch(() => 0)) { try { await el.click({ timeout: 1500 }); return true; } catch { /* */ } }
  return false;
};
// drive the engine through the dev seam (window.__game)
const drive = (fn, arg) => p.evaluate(fn, arg);

await p.goto(url, { waitUntil: "networkidle" });
await wait(400);

// 1. First-run Rules/Help overlay auto-shows on a fresh profile.
await shot("01-help-overlay");
await clickBtn(/close|got it|ok/i);
await wait(300);

// 2. Title screen
await shot("02-title");

// 3. Title overlays — all Pixi modals now (canvas), opened via the DOM title button, closed with Esc.
await clickBtn(/new run|play/i); await wait(400); await shot("03-runsetup");
await p.keyboard.press("Escape"); await wait(250);
await clickBtn(/settings/i); await wait(350); await shot("04-settings");
await p.keyboard.press("Escape"); await wait(250);
await clickBtn(/past runs/i); await wait(350); await shot("05-pastruns");
await p.keyboard.press("Escape"); await wait(250);
await clickBtn(/compendium/i); await wait(400); await shot("06-compendium");
await p.keyboard.press("Escape"); await wait(250);

// 4. Combat — start a run via the dev seam
await drive(() => window.__game.getState().newRun("catalog"));
await wait(1500); // intro transition
await shot("07-combat");

// 5. Run-info (The Descent) tabs
await drive(() => window.__game.getState().setMapOpen(true));
await wait(450); await shot("08-runinfo-descent");
await drive(() => window.__game.getState().setMapOpen(false));
await wait(250);

// 6. Pause menu
await drive(() => window.__game.getState().setPaused(true));
await wait(350); await shot("09-pausemenu");
await drive(() => window.__game.getState().setPaused(false));
await wait(250);

// 7. Deck / pile modal
await drive(() => window.__game.getState().setPileModal("all"));
await wait(350); await shot("10-deckmodal");
await drive(() => window.__game.getState().setPileModal(null));
await wait(200);

// 8. Deck peek (hover preview of the draw pile)
await drive(() => window.__game.setState({ deckHover: true }));
await wait(300); await shot("11-deckpeek");
await drive(() => window.__game.setState({ deckHover: false }));
await wait(200);

// 9. Combat gate (win) — drop the royal to 1 HP, play a card, let the gate animate in
await drive(() => {
  const g = window.__game;
  g.setState((s) => ({ run: { ...s.run, combat: { ...s.run.combat, enemy: { ...s.run.combat.enemy, maxHealth: 1, damageTaken: 0 } } } }));
  const id = g.getState().run.hand[0].id;
  g.getState().toggleSelect(id);
  g.getState().playCards();
});
await wait(1500); await shot("12-combatgate-win");

// 10. Shop + packs. By now the sweep has mounted+destroyed several full-window Pixi modal apps (run
//     setup, settings, past runs, compendium, run-map, pause, deck, gate). Each is its own Pixi
//     Application/WebGL context; Chromium's per-process context pool is now exhausted, and even a fresh
//     same-browser context renders the shared felt BLANK in shop mode. A brand-new browser PROCESS gets a
//     clean GL pool — capture the shop + pack modals there. (Fresh browser → first-run Help shows again;
//     dismiss it.)
await b.close();
const b2 = await chromium.launch();
p = await b2.newPage({ viewport: VIEW });
await p.goto(url, { waitUntil: "networkidle" }); await wait(500);
await clickBtn(/close|got it|ok/i); await wait(300);
await drive(() => window.__game.getState().newRun("catalog-shop"));
await wait(1500);
// Win AND advance in the SAME synchronous tick: combatPlay sets outcome="won" and `advance` reads it
// immediately, so the run jumps straight to the shop and the Combat-Gate modal never renders. That
// matters because each Pixi modal is its own WebGL Application, and mounting+destroying the gate
// clobbers the persistent felt's GL context — leaving the shop blank. No gate frame ⇒ felt survives.
await drive(() => {
  const g = window.__game;
  g.setState((s) => ({ run: { ...s.run, combat: { ...s.run.combat, enemy: { ...s.run.combat.enemy, maxHealth: 1, damageTaken: 0 } } } }));
  const id = g.getState().run.hand[0].id;
  g.getState().toggleSelect(id);
  g.getState().playCards();
  g.getState().dispatch({ type: "advance" });
});
await wait(1900); await shot("13-shop");

// 11. Pack modal — crack open the first booster pack
await drive(() => {
  const shop = window.__game.getState().run.shop;
  if (shop && shop.packs[0]) window.__game.getState().dispatch({ type: "openPack", packId: shop.packs[0].id });
});
await wait(900); await shot("14-packmodal");
await drive(() => { try { window.__game.getState().dispatch({ type: "closePack" }); } catch { /* */ } });
await wait(250);

// 11b. Tarot pack opening — the deck-fan flow (inject a tarot pack so it's deterministic)
await drive(() => {
  const g = window.__game;
  g.setState((s) => ({ run: { ...s.run, gold: 50, shop: { ...s.run.shop, packs: [{ id: "catTp", kind: "tarot", size: "l", price: 4, contentIds: ["the-hierophant", "the-star", "strength", "the-fool", "the-sun"], picksRemaining: 1 }, ...s.run.shop.packs] } } }));
  g.getState().dispatch({ type: "openPack", packId: "catTp" });
});
await wait(700); await shot("17-pack-tarot-fan");
// arm a targeting tarot — the content tiles are Pixi-drawn now; The Hierophant is the leftmost tile.
// (centred 5-tile panel in a 1280×860 view → tile-0 centre ≈ 336,530; see PixiPackModal layout)
await p.mouse.click(336, 530);
await wait(400); await shot("18-pack-tarot-armed");
await drive(() => { try { window.__game.getState().dispatch({ type: "closePack" }); } catch { /* */ } });
await wait(250);

// 12. Event screen (force the phase + a known event); move the pointer off any data-tip first
await p.mouse.move(640, 430);
await drive(() => window.__game.setState((s) => ({ run: { ...s.run, phase: "event", eventId: "shrine" } })));
await wait(450); await p.mouse.move(640, 770); await wait(150); await shot("15-event");

// 13. End screen (force a loss for the catalogue)
await drive(() => window.__game.setState((s) => ({ run: { ...s.run, phase: "lost", notice: "The gauntlet claims you." } })));
await wait(800); await p.mouse.move(40, 40); await wait(150); await shot("16-endscreen");

console.log("captured:", log.join(", "));
await b2.close();
