import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame, hasSavedRun, savedRunSummary, isDeckUnlocked, maxStakeUnlocked } from "./store";
import { DECK_LIBRARY, STAKE_IDS, STAKE_INFO, deckById } from "../engine/index";
import { sfx } from "../audio/chiptune";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";

applyPixiFixes();

// The New Run / Continue setup, on the Pixi modal kit, laid out the Balatro way: NO title bar — three
// tabs at the top with a ▼ pointer over the active one; a deck "card" flanked by FULL-HEIGHT ‹ / ›
// gallery arrows; a stake ladder beside the deck showing the current rung; and the deck/stake blurbs
// on light parchment boxes so the prose reads off the dark panel. The one thing canvas can't do —
// typed text — is a real DOM <input> over the canvas where the seed field sits (Seeded on only). The
// stake row is its own gallery with full-height arrows too. ✕ / click-outside / Esc = Back.

const PANEL_W = 620;
const PANEL_H = 440;
const PAD = 20;

// content-relative layout (the modal is headerless, so content begins at the top pad)
const TABS_Y = 24;
const TAB_H = 34;
const DECK_Y = 72;
const CARD_W = 100;
const CARD_H = 140;
const ARROW_W = 36;
const CARD_X = ARROW_W + 10; // 46
const LADDER_X = CARD_X + CARD_W + 12; // 158
const LADDER_W = 22;
const INFO_X = LADDER_X + LADDER_W + 14; // 194
const STAKE_Y = DECK_Y + CARD_H + 16; // 228
const STAKE_H = 60;
const FORM_Y = STAKE_Y + STAKE_H + 14; // 302
const PLAY_Y = FORM_Y + 44; // 346

const INK_BODY = 0x3a2a18; // dark body text on parchment
const INK_MUTE = 0x6a5238; // muted dark on parchment (secondary / locked)

// STAKE_INFO.color is a CSS hex string → a Pixi colour int.
function hexNum(c: string): number {
  const h = c.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return parseInt(full, 16) || THEME.gold;
}

type Tab = "new" | "continue" | "challenges";

export default function PixiRunSetup({ onClose }: { onClose: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const canContinue = hasSavedRun();
  const saved = canContinue ? savedRunSummary() : null;
  const [tab, setTab] = useState<Tab>(canContinue ? "continue" : "new");
  const [deckIdx, setDeckIdx] = useState(0);
  const [stakeIdx, setStakeIdx] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const [seed, setSeed] = useState("");
  // mirror state into a ref so the (stable) rebuild closure always reads the latest
  const st = useRef({ tab, deckIdx, stakeIdx, seeded });
  st.current = { tab, deckIdx, stakeIdx, seeded };
  const [, forceTick] = useState(0); // re-render the seed input overlay on resize

  const maxStake = maxStakeUnlocked();

  const play = () => {
    const deck = DECK_LIBRARY[st.current.deckIdx];
    if (!isDeckUnlocked(deck)) return;
    sfx.buy();
    useGame.getState().newRun(seeded ? seed : "", deck.id, STAKE_IDS[st.current.stakeIdx]);
  };

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const { tab, deckIdx, stakeIdx, seeded } = st.current;
    const deck = DECK_LIBRARY[deckIdx];
    const deckUnlocked = isDeckUnlocked(deck);
    const stake = STAKE_INFO[STAKE_IDS[stakeIdx]];

    m.show({
      title: "New Run",
      header: false, // Balatro-style: the tab row is the top of the panel, no title band
      panelW: PANEL_W,
      panelH: PANEL_H,
      build: (mm) => {
        const w = mm.width;
        const rightArrowX = w - ARROW_W;

        // --- tabs + the ▼ "currently selected" pointer above the active one ---
        const tw = (w - 12) / 3;
        const tabs: Tab[] = ["new", "continue", "challenges"];
        tabs.forEach((id, i) => {
          const label = id === "new" ? "New Run" : id === "continue" ? "Continue" : "Challenges";
          const on = tab === id;
          const enabled = id === "new" || (id === "continue" && canContinue);
          mm.button(label, i * (tw + 6), TABS_Y, tw, TAB_H, on ? THEME.gold : THEME.frameDim, enabled, () => setTab(id), 13);
        });
        const activeIdx = tabs.indexOf(tab);
        mm.text("▼", activeIdx * (tw + 6) + tw / 2, 4, 16, THEME.goldBright, { anchor: 0.5 });

        if (tab === "continue") {
          if (!saved) {
            mm.text("No run in progress.", w / 2, DECK_Y + 60, 15, THEME.parchmentEdge, { anchor: 0.5 });
            return;
          }
          mm.rect(0, DECK_Y, CARD_W, CARD_H, 0x241836, { radius: 10, stroke: THEME.gold });
          mm.sprite(`/art/decks/${saved.deckId}.svg`, 5, DECK_Y + 5, CARD_W - 10, CARD_H - 10);
          const ix = CARD_W + 16;
          const iw = w - ix;
          mm.rect(ix, DECK_Y, iw, CARD_H, THEME.parchment, { radius: 8, stroke: THEME.gold });
          mm.text(deckById(saved.deckId)?.name ?? "Run in progress", ix + 14, DECK_Y + 14, 17, THEME.ink, { bold: true, wrap: iw - 28 });
          mm.text(`Royal   ${saved.royal} / ${saved.total}`, ix + 14, DECK_Y + 48, 14, INK_BODY);
          mm.text(`Gold    ◆ ${saved.gold}`, ix + 14, DECK_Y + 76, 14, INK_BODY);
          mm.text(`Seed    ${saved.seed || "—"}`, ix + 14, DECK_Y + 104, 13, INK_MUTE);
          mm.button("CONTINUE  ▸", 0, DECK_Y + CARD_H + 22, w, 46, THEME.good, true, () => {
            sfx.buy();
            useGame.getState().continueRun();
          }, 17);
          return;
        }
        if (tab === "challenges") {
          mm.text("No challenges yet —", w / 2, DECK_Y + 54, 15, THEME.parchmentEdge, { anchor: 0.5 });
          mm.text("coming in a later update.", w / 2, DECK_Y + 84, 15, THEME.parchmentEdge, { anchor: 0.5 });
          return;
        }

        // --- NEW: deck gallery (full-height ‹ / › arrows flank the card row) ---
        mm.button("‹", 0, DECK_Y, ARROW_W, CARD_H, THEME.gold, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i - 1 + DECK_LIBRARY.length) % DECK_LIBRARY.length);
        }, 30);
        // deck card (art with a framed back behind)
        mm.rect(CARD_X, DECK_Y, CARD_W, CARD_H, deckUnlocked ? 0x241836 : 0x140a1e, { radius: 10, stroke: deckUnlocked ? THEME.gold : THEME.frameDim });
        mm.sprite(`/art/decks/${deck.id}.svg`, CARD_X + 5, DECK_Y + 5, CARD_W - 10, CARD_H - 10);
        if (!deckUnlocked) mm.text("🔒", CARD_X + CARD_W / 2, DECK_Y + CARD_H / 2, 30, THEME.frameDim, { anchor: 0.5, anchorY: 0.5 });

        // stake ladder beside the deck — a level meter of the eight stakes, current rung ringed (#2)
        const n = STAKE_IDS.length;
        const lgap = 3;
        const chipH = (CARD_H - (n - 1) * lgap) / n;
        for (let i = 0; i < n; i++) {
          const si = STAKE_INFO[STAKE_IDS[i]];
          const yy = DECK_Y + (n - 1 - i) * (chipH + lgap); // lowest stake at the bottom — climb upward
          const locked = i > maxStake;
          const isCur = i === stakeIdx;
          mm.rect(LADDER_X, yy, LADDER_W, chipH, locked ? 0x241836 : hexNum(si.color), {
            radius: 4,
            stroke: isCur ? THEME.goldBright : locked ? THEME.frameDim : THEME.ink,
            alpha: locked ? 0.4 : i <= stakeIdx ? 1 : 0.5,
          });
          if (!locked) mm.hit(LADDER_X, yy, LADDER_W, chipH, () => setStakeIdx(i));
        }

        // deck blurb on a light parchment box (#4)
        const infoW = rightArrowX - INFO_X - 10;
        mm.rect(INFO_X, DECK_Y, infoW, CARD_H, THEME.parchment, { radius: 8, stroke: deckUnlocked ? THEME.parchmentEdge : THEME.frameDim });
        mm.text(deck.name, INFO_X + 14, DECK_Y + 12, 17, deckUnlocked ? THEME.ink : INK_MUTE, { bold: true, wrap: infoW - 28 });
        if (deckUnlocked) {
          let ly = DECK_Y + 42;
          for (const t of deck.text) {
            mm.text(`• ${t}`, INFO_X + 14, ly, 13, INK_BODY, { wrap: infoW - 28 });
            ly += 24;
          }
        } else {
          mm.text(`Win a run with ${deckById(deck.unlock)?.name ?? "another deck"} to unlock.`, INFO_X + 14, DECK_Y + 44, 13, INK_MUTE, { wrap: infoW - 28 });
        }
        mm.button("›", rightArrowX, DECK_Y, ARROW_W, CARD_H, THEME.gold, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i + 1) % DECK_LIBRARY.length);
        }, 30);

        // --- stake gallery (full-height ‹ / › arrows; blurb on parchment) ---
        mm.button("‹", 0, STAKE_Y, ARROW_W, STAKE_H, THEME.gold, stakeIdx > 0, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.max(0, i - 1));
        }, 28);
        const boxX = CARD_X;
        const boxW = rightArrowX - boxX - 10;
        mm.rect(boxX, STAKE_Y, boxW, STAKE_H, THEME.parchment, { radius: 8, stroke: hexNum(stake.color) });
        mm.rect(boxX + 14, STAKE_Y + (STAKE_H - 28) / 2, 28, 28, hexNum(stake.color), { radius: 6, stroke: THEME.ink });
        mm.text(`Stake — ${stake.name}`, boxX + 54, STAKE_Y + 12, 15, THEME.ink, { bold: true });
        mm.text(stake.text, boxX + 54, STAKE_Y + 36, 12, INK_BODY, { wrap: boxW - 54 - 14 });
        mm.button("›", rightArrowX, STAKE_Y, ARROW_W, STAKE_H, THEME.gold, stakeIdx < maxStake, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.min(maxStake, i + 1));
        }, 28);

        // --- seeded toggle + PLAY (the seed <input> is a DOM overlay, see render) ---
        mm.button(seeded ? "✓ Seeded Run" : "Seeded Run", 0, FORM_Y, 180, 34, seeded ? THEME.good : THEME.frameDim, true, () => setSeeded((s) => !s), 13);
        if (!seeded) mm.text("(random seed)", 196, FORM_Y + 11, 12, THEME.parchmentEdge);
        mm.button("PLAY  ▸", 0, PLAY_Y, w, 46, THEME.good, deckUnlocked, play, 18);
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2))), autoDensity: true });
      try {
        await Promise.all([document.fonts.load("12px 'Silkscreen'"), document.fonts.load("16px 'Press Start 2P'")]);
      } catch {
        /* system font fallback */
      }
      if (cancelled) {
        releaseApp(app);
        return;
      }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        const cv = app.canvas;
        cv.style.position = "fixed";
        cv.style.inset = "0";
        cv.style.width = "100vw";
        cv.style.height = "100vh";
        cv.style.zIndex = "9000";
        cv.style.imageRendering = "pixelated";
      }
      const modal = new ModalStage(app);
      modal.onClose = onClose;
      modalRef.current = modal;
      rebuild();
    })();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onResize = () => forceTick((n) => n + 1);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      const m = modalRef.current;
      modalRef.current = null;
      if (m) {
        m.destroy();
        releaseApp(m.app);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // repaint on any setup-state change
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, deckIdx, stakeIdx, seeded, seed]);

  // The seed text field: a real DOM <input> positioned over the canvas where the Pixi layout reserves
  // it (canvas can't take typed text). Shown only on the New tab with Seeded on. Mirrors the in-build
  // coords: content origin is (px+PAD, py+PAD) now the modal is headerless; the field sits beside the
  // toggle at content (196, FORM_Y).
  const showSeed = tab === "new" && seeded;
  const px = (window.innerWidth - PANEL_W) / 2;
  const py = (window.innerHeight - PANEL_H) / 2;
  const seedLeft = px + PAD + 196;
  const seedTop = py + PAD + FORM_Y + 1;
  return (
    <div ref={hostRef} className="pixi-modal-host">
      {showSeed && (
        <input
          autoFocus
          value={seed}
          placeholder="enter seed"
          aria-label="Seed"
          onChange={(e) => setSeed(e.target.value)}
          style={{
            position: "fixed",
            left: seedLeft,
            top: seedTop,
            width: 220,
            height: 32,
            zIndex: 9001,
            boxSizing: "border-box",
            padding: "0 10px",
            background: "#140a1e",
            border: "2px solid #8a6a2a",
            borderRadius: 6,
            color: "#ffe9a0",
            font: "14px 'Silkscreen', monospace",
            outline: "none",
          }}
        />
      )}
    </div>
  );
}
