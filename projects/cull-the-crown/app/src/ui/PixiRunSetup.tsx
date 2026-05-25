import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import { useGame, hasSavedRun, savedRunSummary, isDeckUnlocked, maxStakeUnlocked } from "./store";
import { DECK_LIBRARY, STAKE_IDS, STAKE_INFO, deckById } from "../engine/index";
import { sfx } from "../audio/chiptune";
import { ModalStage } from "../render/ui/modalStage";
import { THEME } from "../render/theme";
import { applyPixiFixes, releaseApp } from "../render/pixiFixes";

applyPixiFixes();

// The New Run / Continue setup, migrated onto the Pixi modal kit. Tabs + deck & stake carousels +
// position dots + a stake ladder, all drawn on a ModalStage. The one thing canvas can't do — typed
// text — is handled by a real DOM <input> positioned over the canvas where the seed field sits, shown
// only when "Seeded" is on. ✕ / click-outside = Back.

const PANEL_W = 600;
const PANEL_H = 460;
const PAD = 20;
const HEADER = 50;

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
      panelW: PANEL_W,
      panelH: PANEL_H,
      build: (mm) => {
        const w = mm.width;
        // --- tabs ---
        const tw = (w - 12) / 3;
        (["new", "continue", "challenges"] as Tab[]).forEach((id, i) => {
          const label = id === "new" ? "New Run" : id === "continue" ? "Continue" : "Challenges";
          const on = tab === id;
          const enabled = id === "new" || (id === "continue" && canContinue);
          mm.button(label, i * (tw + 6), 2, tw, 30, on ? THEME.gold : THEME.frameDim, enabled, () => setTab(id), 12);
        });

        if (tab === "continue") {
          if (!saved) {
            mm.text("No run in progress.", w / 2, 150, 13, THEME.parchmentEdge, { anchor: 0.5 });
            return;
          }
          mm.rect(0, 50, w, 200, 0x1c1430, { alpha: 0.9, radius: 10, stroke: THEME.gold });
          mm.sprite(`/art/decks/${saved.deckId}.svg`, 24, 70, 96, 134);
          mm.text(deckById(saved.deckId)?.name ?? "Run in progress", 140, 72, 16, THEME.goldBright, { bold: true });
          mm.text(`Royal   ${saved.royal} / ${saved.total}`, 140, 108, 13, 0xffffff);
          mm.text(`Gold    ◆ ${saved.gold}`, 140, 134, 13, THEME.goldBright);
          mm.text(`Seed    ${saved.seed || "—"}`, 140, 160, 12, THEME.parchmentEdge);
          mm.button("CONTINUE  ▸", 0, 270, w, 40, THEME.good, true, () => {
            sfx.buy();
            useGame.getState().continueRun();
          }, 15);
          return;
        }
        if (tab === "challenges") {
          mm.text("No challenges yet — coming in a later update.", w / 2, 150, 12, THEME.parchmentEdge, { anchor: 0.5 });
          return;
        }

        // --- NEW: deck carousel ---
        const cardW = 92;
        const cardH = 128;
        const cardX = 40;
        const cardY = 50;
        mm.button("‹", 0, cardY + cardH / 2 - 20, 28, 40, THEME.gold, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i - 1 + DECK_LIBRARY.length) % DECK_LIBRARY.length);
        }, 18);
        // deck card (art with a card-back fallback frame behind)
        mm.rect(cardX, cardY, cardW, cardH, deckUnlocked ? 0x241836 : 0x140a1e, { radius: 8, stroke: deckUnlocked ? THEME.gold : THEME.frameDim });
        mm.sprite(`/art/decks/${deck.id}.svg`, cardX + 4, cardY + 4, cardW - 8, cardH - 8);
        if (!deckUnlocked) mm.text("🔒", cardX + cardW / 2, cardY + cardH / 2, 28, THEME.frameDim, { anchor: 0.5, anchorY: 0.5 });
        // info to the right
        const ix = cardX + cardW + 18;
        const iw = w - ix - 16;
        mm.text(deck.name, ix, cardY + 4, 16, deckUnlocked ? THEME.goldBright : THEME.frameDim, { bold: true, wrap: iw });
        if (deckUnlocked) {
          let ly = cardY + 32;
          for (const t of deck.text) {
            mm.text(`• ${t}`, ix, ly, 11, THEME.parchmentLite, { wrap: iw });
            ly += 22;
          }
        } else {
          mm.text(`Win a run with ${deckById(deck.unlock)?.name ?? "another deck"} to unlock.`, ix, cardY + 34, 11, THEME.parchmentEdge, { wrap: iw });
        }
        mm.button("›", w - 28, cardY + cardH / 2 - 20, 28, 40, THEME.gold, true, () => {
          sfx.leaf();
          setDeckIdx((i) => (i + 1) % DECK_LIBRARY.length);
        }, 18);

        // position dots
        const dots = DECK_LIBRARY.length;
        const dotW = 8;
        const dotsW = dots * (dotW + 4) - 4;
        DECK_LIBRARY.forEach((_, i) => {
          mm.rect((w - dotsW) / 2 + i * (dotW + 4), cardY + cardH + 10, dotW, dotW, i === deckIdx ? THEME.gold : THEME.frameDim, { radius: 4 });
        });

        // --- stake carousel ---
        const sy = cardY + cardH + 32;
        mm.rect(0, sy, w, 52, 0x1c1430, { alpha: 0.85, radius: 8, stroke: hexNum(stake.color) });
        mm.button("‹", 8, sy + 11, 26, 30, THEME.gold, stakeIdx > 0, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.max(0, i - 1));
        }, 16);
        mm.rect(44, sy + 14, 24, 24, hexNum(stake.color), { radius: 6, stroke: THEME.ink });
        mm.text(`Stake — ${stake.name}`, 80, sy + 10, 13, hexNum(stake.color), { bold: true });
        mm.text(stake.text, 80, sy + 30, 10, THEME.parchmentEdge, { wrap: w - 80 - 40 });
        mm.button("›", w - 34, sy + 11, 26, 30, THEME.gold, stakeIdx < maxStake, () => {
          sfx.leaf();
          setStakeIdx((i) => Math.min(maxStake, i + 1));
        }, 16);

        // --- seeded toggle + PLAY (the seed <input> is a DOM overlay, see render) ---
        const fy = sy + 64;
        mm.button(seeded ? "✓ Seeded Run" : "Seeded Run", 0, fy, 170, 32, seeded ? THEME.good : THEME.frameDim, true, () => setSeeded((s) => !s));
        if (!seeded) mm.text("(random seed)", 184, fy + 10, 11, THEME.parchmentEdge);
        mm.button("PLAY  ▸", 0, fy + 42, w, 38, THEME.good, deckUnlocked, play, 16);
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
  // it (canvas can't take typed text). Shown only on the New tab with Seeded on.
  const showSeed = tab === "new" && seeded;
  const px = (window.innerWidth - PANEL_W) / 2;
  const py = (window.innerHeight - PANEL_H) / 2;
  // mirror the in-build layout: stake row sy = 50 + 128 + 32 = 210; fy = sy + 64 = 274; field beside toggle
  const seedLeft = px + PAD + 184;
  const seedTop = py + HEADER + 274;
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
            height: 30,
            zIndex: 9001,
            boxSizing: "border-box",
            padding: "0 10px",
            background: "#140a1e",
            border: "2px solid #8a6a2a",
            borderRadius: 6,
            color: "#ffe9a0",
            font: "13px 'Silkscreen', monospace",
            outline: "none",
          }}
        />
      )}
    </div>
  );
}
