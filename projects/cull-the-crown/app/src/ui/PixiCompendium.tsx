import { useEffect, useRef, useState } from "react";
import { Application } from "pixi.js";
import {
  JOKER_LIBRARY,
  TAROT_LIBRARY,
  SPECTRAL_LIBRARY,
  DECK_LIBRARY,
  SIGIL_INFO,
  SIGIL_IDS,
  DECREE_LIBRARY,
  DECREE_SEVERITY,
  TIER_STATS,
  FIGHTING_STYLE_IDS,
  FIGHTING_STYLE_NAME,
  FIGHTING_STYLE_PER_LEVEL,
} from "../engine/index";
import { ModalStage } from "../render/ui/modalStage";
import { STYLE_ART_SLUG } from "../render/sidebarStage";
import { THEME } from "../render/theme";
import { applyPixiFixes } from "../render/pixiFixes";

applyPixiFixes();

// The Compendium, migrated onto the Pixi modal kit: a left nav (How to Play / Compendium) + a measured
// scroll region (ModalStage.scroll + para()) that renders either long-form rules prose, a data-driven
// gallery of every card/joker/sigil/etc., or the Royals & Decrees page. Read-only; ✕ / outside = close.

type Page =
  | "overview" | "suits" | "combos" | "economy" | "modifiers"
  | "jokers" | "tarots" | "spectrals" | "styles" | "decks" | "sigils" | "enemies";

const ARCANA = TAROT_LIBRARY.filter((t) => !t.id.startsWith("drill-"));
const STYLE_PLAYED: Record<string, string> = {
  twoHanded: "a single card", swordShield: "2 cards", spear: "3 cards", dualWield: "4 cards", mage: "5 cards", mounted: "any play with an Animal Companion (Ace)",
};
const SEVERITY_TINT: Record<string, number> = { mild: 0x3d8a4c, standard: 0xc89a3a, severe: 0xb5402e, finisher: 0x8a5cc0 };
const SEVERITY_LABEL: Record<string, string> = { mild: "Jack · mild", standard: "Queen · standard", severe: "King · severe", finisher: "Final King · finisher" };
const ROYAL_TIERS: { tier: "jack" | "queen" | "king"; name: string; note: string }[] = [
  { tier: "jack", name: "Jacks", note: "The opening rank. Each bears a single mild decree." },
  { tier: "queen", name: "Queens", note: "Tougher, with a standard decree." },
  { tier: "king", name: "Kings", note: "Enrage at half health (+5 attack). A severe decree plus a stacked mild one — the final King carries the finisher." },
];

const NAV: { group: string; items: { id: Page; label: string; count?: number }[] }[] = [
  { group: "How to Play", items: [
    { id: "overview", label: "Overview" }, { id: "suits", label: "Suits & Powers" }, { id: "combos", label: "Combos & Styles" },
    { id: "economy", label: "Shop & Packs" }, { id: "modifiers", label: "Sigils & Seals" },
  ] },
  { group: "Compendium", items: [
    { id: "jokers", label: "Jokers", count: JOKER_LIBRARY.length }, { id: "tarots", label: "Tarot Cards", count: ARCANA.length },
    { id: "spectrals", label: "Spectral", count: SPECTRAL_LIBRARY.length }, { id: "styles", label: "Fighting Styles", count: FIGHTING_STYLE_IDS.length },
    { id: "decks", label: "Decks", count: DECK_LIBRARY.length }, { id: "sigils", label: "Sigils", count: SIGIL_IDS.length },
    { id: "enemies", label: "Royals & Decrees", count: ROYAL_TIERS.length + DECREE_LIBRARY.length },
  ] },
];
const TITLE: Record<Page, string> = {
  overview: "Overview", suits: "Suits & Powers", combos: "Combos & Fighting Styles", economy: "Shop & Packs", modifiers: "Sigils, Seals & Editions",
  jokers: "Jokers", tarots: "Tarot Cards", spectrals: "Spectral Cards", styles: "Fighting Styles", decks: "Decks", sigils: "Sigils", enemies: "Royals & Decrees",
};

type Block = { k: "lead" | "h" | "p" | "li"; t: string };
const RULES: Record<string, Block[]> = {
  overview: [
    { k: "lead", t: "A solo card-battler. A gauntlet of 12 royals stands between you and the throne — four Jacks, then four Queens, then four Kings. Topple every one and the crown is culled." },
    { k: "h", t: "A turn, step by step" },
    { k: "li", t: "Play 1–5 cards from your hand at the royal. Their total value is your attack; each card's suit fires a power (see Suits & Powers)." },
    { k: "li", t: "The royal takes the damage. If it survives, it strikes back." },
    { k: "li", t: "Cover the strike with shield, or discard cards worth at least the incoming hit. Fail and the run ends." },
    { k: "h", t: "Between fights" },
    { k: "p", t: "Winning pays gold — land the exact killing blow for a bonus. In the shop, open booster packs, recruit jokers into your guild, and use Tarot and Spectral cards to reshape your deck. Build an engine strong enough for the Kings." },
    { k: "p", t: "Tip: use the sidebar to read any system in detail, or browse every card in the game." },
  ],
  suits: [
    { k: "lead", t: "Damage is the value you play. On top of that, each suit triggers its own power equal to the value played (plus any suit upgrade you've earned)." },
    { k: "li", t: "♥ Hearts — Heal: return that many cards from the discard to the bottom of your deck." },
    { k: "li", t: "♦ Diamonds — Draw: pull that many cards from your deck into your hand." },
    { k: "li", t: "♣ Clubs — Double: your attack's damage counts twice." },
    { k: "li", t: "♠ Spades — Shield: reduce the royal's next counter-attack (it stacks)." },
    { k: "h", t: "Immunity" },
    { k: "p", t: "A royal is immune to its own suit — that suit's power does nothing against it (the damage still lands). Play a mixed-suit combo to fire several powers at once and route around the immunity." },
  ],
  combos: [
    { k: "lead", t: "A play is either a single card, or a combo of 2–5 cards of equal rank whose values sum to 10 or less. Every play may use at most 5 cards." },
    { k: "h", t: "Animal Companions" },
    { k: "p", t: "The four Aces are Animal Companions (value 1). One may be added to any play — alone, paired with another card, or stacked onto a combo — adding its value and its suit's power." },
    { k: "h", t: "Fighting Styles" },
    { k: "p", t: "The number of cards you play sets that play's Fighting Style. Leveling a style (via Training packs and Drills) scales the suit powers of plays made in that style — bigger plays scale harder per level." },
    ...FIGHTING_STYLE_IDS.map((id) => ({ k: "li" as const, t: `${FIGHTING_STYLE_NAME[id]} — played with ${STYLE_PLAYED[id]}. +${Math.round(FIGHTING_STYLE_PER_LEVEL[id] * 100)}% of base per level.` })),
  ],
  economy: [
    { k: "lead", t: "The shop between fights is where runs are built. Everything is bought with gold; reroll refreshes the offers for a price." },
    { k: "h", t: "Booster packs" },
    { k: "p", t: "Packs come in five kinds and four sizes. Opening a pack lets you pick a number of its contents and keep them:" },
    { k: "li", t: "S — choose 1 of 2    •    M — choose 1 of 3    •    L — choose 1 of 5    •    XL — choose 2 of 5" },
    { k: "li", t: "Card packs — basic cards, sometimes already bearing a sigil." },
    { k: "li", t: "Joker packs — guild members with passive engine effects." },
    { k: "li", t: "Training packs — Drills that level your Fighting Styles." },
    { k: "li", t: "Tarot packs — the Arcana: reshape and enhance your deck." },
    { k: "li", t: "Spectral packs — powerful, risky deck-altering cards." },
    { k: "h", t: "Also in the shop" },
    { k: "li", t: "Loose offers — single items you can buy outright." },
    { k: "li", t: "Jokers fill your guild slots (passive, always-on powers)." },
    { k: "li", t: "Remove a card — thins your deck; the cost rises with each use." },
    { k: "li", t: "Edicts — one per Act, a run-shaping choice." },
  ],
  modifiers: [
    { k: "lead", t: "Three kinds of permanent upgrade let you tune individual cards and jokers." },
    { k: "h", t: "Sigils" },
    { k: "p", t: "A sigil is a stamp on a single card that boosts or changes how it resolves (e.g. raises its value, fires an extra suit, or converts its kind). Browse all sigils in the Compendium." },
    { k: "h", t: "Seals" },
    { k: "p", t: "A seal is a coloured wax mark that adds a bonus when the card is played, held, or felled: Gold earns gold, Red adds value, Blue triggers on a felled royal, Purple triggers on discard." },
    { k: "h", t: "Editions" },
    { k: "p", t: "An edition is a foil-like finish applied to a joker — Burnished, Haloed, Prismatic, or Shadow — adding flat or multiplicative output to that slot." },
  ],
};

interface GItem { art?: string; glyph?: string; gcolor?: number; name: string; text: string; tag?: { label: string; color: number } }
function galleryItems(page: Page): GItem[] {
  switch (page) {
    case "jokers": return JOKER_LIBRARY.map((j) => ({ art: `/art/jokers/${j.id}.svg`, name: j.name, text: j.text }));
    case "tarots": return ARCANA.map((t) => ({ art: `/art/tarots/${t.id}.svg`, name: t.name, text: t.text }));
    case "spectrals": return SPECTRAL_LIBRARY.map((t) => ({ art: `/art/spectrals/${t.id}.svg`, name: t.name, text: t.text }));
    case "decks": return DECK_LIBRARY.map((d) => ({ art: `/art/decks/${d.id}.svg`, name: d.name, text: d.text.join(" · ") }));
    case "styles": return FIGHTING_STYLE_IDS.map((id) => ({ art: `/art/styles/${STYLE_ART_SLUG[id]}.svg`, name: FIGHTING_STYLE_NAME[id], text: `Played with ${STYLE_PLAYED[id]}. +${Math.round(FIGHTING_STYLE_PER_LEVEL[id] * 100)}% per level.` }));
    case "sigils": return SIGIL_IDS.map((s) => ({ glyph: SIGIL_INFO[s].glyph, gcolor: SIGIL_INFO[s].color, name: SIGIL_INFO[s].name, text: SIGIL_INFO[s].text }));
    default: return [];
  }
}

export default function PixiCompendium({ onClose, start = "overview" }: { onClose: () => void; start?: Page }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<ModalStage | null>(null);
  const [page, setPage] = useState<Page>(start);
  const pageRef = useRef<Page>(page);
  pageRef.current = page;

  const rebuild = () => {
    const m = modalRef.current;
    if (!m) return;
    const page = pageRef.current;
    m.show({
      title: "Compendium",
      panelW: 860,
      panelH: 580,
      build: (mm) => {
        const w = mm.width;
        // --- left nav ---
        const navW = 190;
        let ny = 4;
        for (const grp of NAV) {
          mm.text(grp.group.toUpperCase(), 4, ny, 9, THEME.parchmentEdge);
          ny += 18;
          for (const it of grp.items) {
            const on = it.id === page;
            mm.button(it.count != null ? `${it.label}  (${it.count})` : it.label, 0, ny, navW, 28, on ? THEME.gold : THEME.frameDim, true, () => setPage(it.id), 11);
            ny += 32;
          }
          ny += 10;
        }

        // --- content ---
        const cx0 = navW + 18;
        const cw = w - cx0;
        mm.text(TITLE[page], cx0, 4, 17, THEME.goldBright, { bold: true });
        const vy = 34;
        const vh = 580 - 50 /*header*/ - 20 /*pad*/ - vy;

        mm.scroll(cx0, vy, cw, vh, () => {
          if (RULES[page]) {
            let y = 0;
            for (const b of RULES[page]) {
              if (b.k === "h") { y += 10; mm.para(b.t, 0, y, cw - 14, 14, THEME.gold, { bold: true }); y += 24; }
              else if (b.k === "lead") { y += mm.para(b.t, 0, y, cw - 14, 13, THEME.parchmentLite) + 12; }
              else if (b.k === "li") { mm.text("•", 2, y, 11, THEME.gold); y += mm.para(b.t, 18, y, cw - 14 - 18, 11, THEME.parchmentLite) + 7; }
              else { y += mm.para(b.t, 0, y, cw - 14, 11, THEME.parchmentLite) + 9; }
            }
            return;
          }
          if (page === "enemies") { drawEnemies(mm, cw - 14); return; }
          // galleries
          drawGallery(mm, galleryItems(page), cw - 14);
        });
      },
    });
  };

  useEffect(() => {
    let cancelled = false;
    const app = new Application();
    void (async () => {
      await app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, roundPixels: true, resolution: Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2))), autoDensity: true });
      try { await Promise.all([document.fonts.load("12px 'Silkscreen'"), document.fonts.load("16px 'Press Start 2P'")]); } catch { /* fallback */ }
      if (cancelled) { app.destroy(true, { children: true }); return; }
      const host = hostRef.current;
      if (host) {
        host.appendChild(app.canvas);
        const cv = app.canvas;
        cv.style.position = "fixed"; cv.style.inset = "0"; cv.style.width = "100vw"; cv.style.height = "100vh"; cv.style.zIndex = "9000"; cv.style.imageRendering = "pixelated";
      }
      const modal = new ModalStage(app);
      modal.onClose = onClose;
      modalRef.current = modal;
      rebuild();
    })();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      const m = modalRef.current;
      modalRef.current = null;
      if (m) { m.destroy(); m.app.destroy(true, { children: true }); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { rebuild(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  return <div ref={hostRef} className="pixi-modal-host" />;
}

// a uniform grid of art/glyph tiles within the scroll region
function drawGallery(mm: ModalStage, items: GItem[], w: number): void {
  const tileW = 184;
  const tileH = 172;
  const gap = 12;
  const cols = Math.max(1, Math.floor((w + gap) / (tileW + gap)));
  const span = cols * tileW + (cols - 1) * gap;
  const x0 = (w - span) / 2;
  items.forEach((it, i) => {
    const cx = x0 + (i % cols) * (tileW + gap);
    const cy = Math.floor(i / cols) * (tileH + gap);
    mm.rect(cx, cy, tileW, tileH, 0x1c1430, { alpha: 0.92, radius: 8, stroke: THEME.frameDim });
    if (it.art) {
      mm.sprite(it.art, cx + tileW / 2 - 30, cy + 10, 60, 60);
    } else if (it.glyph) {
      mm.rect(cx + tileW / 2 - 26, cy + 10, 52, 52, 0x140a1e, { radius: 26, stroke: it.gcolor });
      mm.text(it.glyph, cx + tileW / 2, cy + 36, 22, it.gcolor ?? THEME.gold, { anchor: 0.5, anchorY: 0.5 });
    }
    mm.para(it.name, cx + 8, cy + 76, tileW - 16, 12, THEME.goldBright, { bold: true });
    if (it.tag) mm.text(it.tag.label, cx + 8, cy + 96, 8, it.tag.color);
    mm.para(it.text, cx + 8, cy + (it.tag ? 110 : 98), tileW - 16, 9, THEME.parchmentEdge);
  });
}

function drawEnemies(mm: ModalStage, w: number): void {
  let y = 0;
  y += mm.para("The Castle is 12 royals: four Jacks, then four Queens, then four Kings. Each is immune to its own suit and rules under one or more Decrees — special rules that make the fight harder. The first royal is always decree-free.", 0, y, w, 13, THEME.parchmentLite) + 14;
  // tier rows
  for (const r of ROYAL_TIERS) {
    const s = TIER_STATS[r.tier];
    mm.rect(0, y, w, 56, 0x1c1430, { alpha: 0.9, radius: 8, stroke: THEME.gold });
    mm.text(r.name, 12, y + 8, 14, THEME.goldBright, { bold: true });
    mm.text(`♥ ${s.health} HP    ⚔ ${s.attack} atk`, 12, y + 30, 11, THEME.blood);
    mm.para(r.note, 150, y + 8, w - 162, 10, THEME.parchmentEdge);
    y += 64;
  }
  y += 6;
  mm.para("Royal Decrees", 0, y, w, 14, THEME.gold, { bold: true }); y += 24;
  mm.para("A royal's decree is drawn from this set, scaled to its rank. Read it before you commit a play.", 0, y, w, 10, THEME.parchmentEdge); y += 28;
  const items: GItem[] = DECREE_LIBRARY.map((d) => {
    const sev = DECREE_SEVERITY[d.id] ?? "standard";
    const tint = SEVERITY_TINT[sev];
    return { glyph: "⚜", gcolor: tint, name: d.name, text: d.text, tag: { label: SEVERITY_LABEL[sev], color: tint } };
  });
  // reuse the gallery grid, offset below the intro
  const tileW = 184, tileH = 184, gap = 12;
  const cols = Math.max(1, Math.floor((w + gap) / (tileW + gap)));
  const span = cols * tileW + (cols - 1) * gap;
  const x0 = (w - span) / 2;
  items.forEach((it, i) => {
    const cx = x0 + (i % cols) * (tileW + gap);
    const cy = y + Math.floor(i / cols) * (tileH + gap);
    mm.rect(cx, cy, tileW, tileH, 0x1c1430, { alpha: 0.92, radius: 8, stroke: it.gcolor });
    mm.rect(cx + tileW / 2 - 24, cy + 10, 48, 48, 0x140a1e, { radius: 10, stroke: it.gcolor });
    mm.text(it.glyph!, cx + tileW / 2, cy + 34, 24, it.gcolor ?? THEME.gold, { anchor: 0.5, anchorY: 0.5 });
    mm.para(it.name, cx + 8, cy + 70, tileW - 16, 12, THEME.goldBright, { bold: true });
    if (it.tag) mm.text(it.tag.label, cx + 8, cy + 92, 8, it.tag.color);
    mm.para(it.text, cx + 8, cy + 106, tileW - 16, 9, THEME.parchmentEdge);
  });
}
