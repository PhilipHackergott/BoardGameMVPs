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
// tabs at the top with a ▼ pointer over the active one; a deck "card" flanked by FULL-HEIGHT, RED ‹ / ›
// gallery arrows; a stake ladder beside the deck (activated stake = colour chip, unlocked-but-inactive
// = grey box, still-locked = small grey dot); and the deck/stake blurbs on light parchment boxes. The
// whole panel + type is scaled up (S) and rendered at a higher resolution for crisp pixel text. The one
// thing canvas can't do — typed text — is a real DOM <input> over the canvas (Seeded on only). The stake
// row is its own gallery with full-height arrows too. ✕ / click-outside / Esc = Back.

// Compact Balatro-style panel — small centred modal, NOT a full-screen takeover. Mirrors the reference
// run-setup screenshot: 3 tabs, deck card with side arrows + name + description, stake row, seeded
// toggle, big PLAY button, smaller Back button at the bottom.
const z = (n: number) => n; // no-scale layout (was 1.66×; the larger panel overwhelmed the title screen)

const PANEL_W = 540;
const PANEL_H = 472; // tabs + deck + tall description + stake + form + PLAY + Back, w/ breathing room
const PAD = 20; // must match ModalStage's content-origin pad (the panel is headerless)

// content-relative layout (content begins at the top pad). The DESCRIPTION box is intentionally
// TALLER than the deck card image so multi-bullet deck blurbs (Bannerman / Fool's Pouch / Occult)
// don't clip — the parchment extends below the card art.
const TABS_Y = 8;
const TAB_H = 30;
const DECK_Y = 56;
const CARD_W = 76;
const CARD_H = 108;
const DESC_H = 148; // ↑ taller than CARD_H so the bullets fit
const ARROW_W = 28;
const CARD_X = ARROW_W + 8; // 36
const LADDER_X = CARD_X + CARD_W + 8; // 120
const LADDER_W = 18;
const INFO_X = LADDER_X + LADDER_W + 10; // 148
const STAKE_Y = DECK_Y + DESC_H + 14; // 218 (gap below the taller description box)
const STAKE_H = 50;
const FORM_Y = STAKE_Y + STAKE_H + 16; // 284
const TOGGLE_W = 140;
const PLAY_Y = FORM_Y + 40; // 324
const PLAY_H = 44;
const BACK_Y = PLAY_Y + PLAY_H + 10; // 378
const BACK_H = 30;

const INK_BODY = 0x3a2a18; // dark body text on parchment
const INK_MUTE = 0x6a5238; // muted dark on parchment (secondary / locked)
const LADDER_BOX = 0x47434f; // unlocked-but-inactive stake (grey box)
const LADDER_BOX_EDGE = 0x6b6676;
const LADDER_DOT = 0x37333f; // still-locked stake (small grey dot)
const LADDER_DOT_EDGE = 0x55505e;

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
        const tw = (w - z(12)) / 3;
        const tabs: Tab[] = ["new", "continue", "challenges"];
        tabs.forEach((id, i) => {
          const label = id === "new" ? "New Run" : id === "continue" ? "Continue" : "Challenges";
          const on = tab === id;
          const enabled = id === "new" || (id === "continue" && canContinue);
          mm.button(label, i * (tw + z(6)), TABS_Y, tw, TAB_H, on ? THEME.gold : THEME.frameDim, enabled, () => setTab(id), z(13));
        });
        const activeIdx = tabs.indexOf(tab);
        mm.text("▼", activeIdx * (tw + z(6)) + tw / 2, z(4), z(16), THEME.goldBright, { anchor: 0.5 });

        if (tab === "continue") {
          if (!saved) {
            mm.text("No run in progress.", w / 2, DECK_Y + z(60), z(15), THEME.parchmentEdge, { anchor: 0.5 });
            return;
          }
          mm.rect(0, DECK_Y, CARD_W, CARD_H, 0x241836, { radius: z(10), stroke: THEME.gold });
          mm.sprite(`/art/decks/${saved.deckId}.svg`, z(5), DECK_Y + z(5), CARD_W - z(10), CARD_H - z(10));
          const ix = CARD_W + z(16);
          const iw = w - ix;
          mm.rect(ix, DECK_Y, iw, CARD_H, THEME.parchment, { radius: z(8), stroke: THEME.gold });
          mm.text(deckById(saved.deckId)?.name ?? "Run in progress", ix + z(14), DECK_Y + z(14), z(17), THEME.ink, { bold: true, wrap: iw - z(28) });
          mm.text(`Royal   ${saved.royal} / ${saved.total}`, ix + z(14), DECK_Y + z(48), z(14), INK_BODY);
          mm.text(`Gold    ◆ ${saved.gold}`, ix + z(14), DECK_Y + z(76), z(14), INK_BODY);
          mm.text(`Seed    ${saved.seed || "—"}`, ix + z(14), DECK_Y + z(104), z(13), INK_MUTE);
          mm.button("CONTINUE  ▸", 0, DECK_Y + CARD_H + z(22), w, PLAY_H, THEME.good, true, () => {
            sfx.buy();
            useGame.getState().continueRun();
          }, z(17));
          return;
        }
        if (tab === "challenges") {
          mm.text("No challenges yet —", w / 2, DECK_Y + z(54), z(15), THEME.parchmentEdge, { anchor: 0.5 });
          mm.text("coming in a later update.", w / 2, DECK_Y + z(84), z(15), THEME.parchmentEdge, { anchor: 0.5 });
          return;
        }

        // --- NEW: deck gallery (full-height RED ‹ / › arrows flank the card row) ---
        mm.button("‹", 0, DECK_Y, ARROW_W, CARD_H, THEME.red, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i - 1 + DECK_LIBRARY.length) % DECK_LIBRARY.length);
        }, z(30));
        // deck card (art with a framed back behind)
        mm.rect(CARD_X, DECK_Y, CARD_W, CARD_H, deckUnlocked ? 0x241836 : 0x140a1e, { radius: z(10), stroke: deckUnlocked ? THEME.gold : THEME.frameDim });
        mm.sprite(`/art/decks/${deck.id}.svg`, CARD_X + z(5), DECK_Y + z(5), CARD_W - z(10), CARD_H - z(10));
        if (!deckUnlocked) mm.text("🔒", CARD_X + CARD_W / 2, DECK_Y + CARD_H / 2, z(30), THEME.frameDim, { anchor: 0.5, anchorY: 0.5 });

        // stake ladder beside the deck (#2): activated = colour chip, unlocked-inactive = grey box,
        // still-locked = small grey dot. Lowest stake at the bottom, climbing upward.
        const n = STAKE_IDS.length;
        const lgap = z(4);
        const chipH = (CARD_H - (n - 1) * lgap) / n;
        for (let i = 0; i < n; i++) {
          const si = STAKE_INFO[STAKE_IDS[i]];
          const yy = DECK_Y + (n - 1 - i) * (chipH + lgap);
          const isCur = i === stakeIdx;
          const unlocked = i <= maxStake;
          if (isCur) {
            mm.rect(LADDER_X, yy, LADDER_W, chipH, hexNum(si.color), { radius: z(4), stroke: THEME.goldBright });
          } else if (unlocked) {
            mm.rect(LADDER_X, yy, LADDER_W, chipH, LADDER_BOX, { radius: z(4), stroke: LADDER_BOX_EDGE });
          } else {
            const d = Math.min(chipH * 0.66, z(13));
            mm.rect(LADDER_X + (LADDER_W - d) / 2, yy + (chipH - d) / 2, d, d, LADDER_DOT, { radius: d / 2, stroke: LADDER_DOT_EDGE });
          }
          if (unlocked) mm.hit(LADDER_X, yy, LADDER_W, chipH, () => setStakeIdx(i));
        }

        // deck blurb on a light parchment box (#4)
        const infoW = rightArrowX - INFO_X - z(10);
        mm.rect(INFO_X, DECK_Y, infoW, CARD_H, THEME.parchment, { radius: z(8), stroke: deckUnlocked ? THEME.parchmentEdge : THEME.frameDim });
        mm.text(deck.name, INFO_X + z(14), DECK_Y + z(12), z(17), deckUnlocked ? THEME.ink : INK_MUTE, { bold: true, wrap: infoW - z(28) });
        if (deckUnlocked) {
          let ly = DECK_Y + z(42);
          for (const t of deck.text) {
            mm.text(`• ${t}`, INFO_X + z(14), ly, z(13), INK_BODY, { wrap: infoW - z(28) });
            ly += z(24);
          }
        } else {
          mm.text(`Win a run with ${deckById(deck.unlock)?.name ?? "another deck"} to unlock.`, INFO_X + z(14), DECK_Y + z(44), z(13), INK_MUTE, { wrap: infoW - z(28) });
        }
        mm.button("›", rightArrowX, DECK_Y, ARROW_W, CARD_H, THEME.red, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i + 1) % DECK_LIBRARY.length);
        }, z(30));

        // --- stake gallery (full-height RED ‹ / › arrows; blurb on parchment) ---
        mm.button("‹", 0, STAKE_Y, ARROW_W, STAKE_H, THEME.red, stakeIdx > 0, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.max(0, i - 1));
        }, z(28));
        const boxX = CARD_X;
        const boxW = rightArrowX - boxX - z(10);
        mm.rect(boxX, STAKE_Y, boxW, STAKE_H, THEME.parchment, { radius: z(8), stroke: hexNum(stake.color) });
        mm.rect(boxX + z(14), STAKE_Y + (STAKE_H - z(28)) / 2, z(28), z(28), hexNum(stake.color), { radius: z(6), stroke: THEME.ink });
        mm.text(`Stake — ${stake.name}`, boxX + z(54), STAKE_Y + z(12), z(15), THEME.ink, { bold: true });
        mm.text(stake.text, boxX + z(54), STAKE_Y + z(36), z(12), INK_BODY, { wrap: boxW - z(54) - z(14) });
        mm.button("›", rightArrowX, STAKE_Y, ARROW_W, STAKE_H, THEME.red, stakeIdx < maxStake, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.min(maxStake, i + 1));
        }, z(28));

        // --- seeded toggle + PLAY + Back (Balatro layout: toggle row, big PLAY, smaller orange Back) ---
        mm.button(seeded ? "✓ Seeded Run" : "Seeded Run", 0, FORM_Y, TOGGLE_W, 30, seeded ? THEME.good : THEME.frameDim, true, () => setSeeded((s) => !s), 12);
        if (!seeded) mm.text("(random seed)", TOGGLE_W + 12, FORM_Y + 9, 11, THEME.parchmentEdge);
        mm.button("PLAY  ▸", 0, PLAY_Y, w, PLAY_H, THEME.good, deckUnlocked, play, 17);
        // Back button — explicit dismissal (mirrors the reference; ✕ is still there too).
        mm.button("Back", 0, BACK_Y, w, BACK_H, THEME.frameDim, true, onClose, 12);
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      // higher resolution floor (≥3) → crisp pixel text on the scaled-up panel
      await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: Math.max(3, Math.min(4, Math.round(window.devicePixelRatio || 2))), autoDensity: true });
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
  // toggle at content (TOGGLE_W + z(16), FORM_Y).
  const showSeed = tab === "new" && seeded;
  const px = (window.innerWidth - PANEL_W) / 2;
  const py = (window.innerHeight - PANEL_H) / 2;
  const seedLeft = px + PAD + TOGGLE_W + 12;
  const seedTop = py + PAD + FORM_Y - 2;
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
            width: 180,
            height: 30,
            zIndex: 9001,
            boxSizing: "border-box",
            padding: "0 10px",
            background: "#140a1e",
            border: "2px solid #8a6a2a",
            borderRadius: 6,
            color: "#ffe9a0",
            font: "12px 'Silkscreen', monospace",
            outline: "none",
          }}
        />
      )}
    </div>
  );
}
