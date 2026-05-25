import { useState } from "react";
import { useGame } from "./store";
import StyleSprite from "./StyleSprite";
import PixiCard from "./PixiCard";
import {
  activeEdicts,
  gauntletView,
  RoyalView,
  STAKE_IDS,
  STAKE_INFO,
  stakeIndex,
  FIGHTING_STYLE_IDS,
  FIGHTING_STYLE_NAME,
  FIGHTING_STYLE_PER_LEVEL,
} from "../engine/index";
import { Card, Suit, SUIT_NAME, Tier, FightingStyleId } from "../engine/types";

// "The Descent" — the run-info screen, structured like Balatro's: four tabs.
//   • Fighting Styles — every style, its level + current bonus, with a hover tooltip explaining it.
//   • Opponents       — the current Court (ante): its royals, stats, immunity & decrees.
//   • Edicts          — the edicts decreed this run (the voucher analog).
//   • Stake           — the stake chosen for this run and its cumulative rules.

type Tab = "styles" | "opponents" | "edicts" | "stake";

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const RANK: Record<Tier, string> = { jack: "J", queen: "Q", king: "K" };

const ACTS: Record<Tier, { title: string; blurb: string }> = {
  jack: { title: "Act I · The Jack Court", blurb: "The lesser royals — your proving ground." },
  queen: { title: "Act II · The Queen Court", blurb: "Sharper, deadlier. The decrees bite harder." },
  king: { title: "Act III · The King Court", blurb: "The crowned tyrants — and they enrage when wounded." },
};

const STYLE_TRIGGER: Record<FightingStyleId, string> = {
  twoHanded: "a single card",
  swordShield: "a pair — two of a rank",
  spear: "three of a rank",
  dualWield: "four of a rank",
  mage: "five of a rank — only via deck-shaping",
  mounted: "any play with an Animal Companion (Ace)",
};

// A representative play for each style, shown as real card faces in the hover popup (the way Balatro
// shows an example hand). The size-style is the equal-rank group; the Ace is purely the Mounted axis.
// Mage demands FIVE of a rank — impossible from a fresh deck (max four of a rank), so it's "magical".
const num = (suit: Suit, value: number, tag = ""): Card => ({ id: `demo-${suit}${value}${tag}`, suit, value, kind: "number" });
const ace = (suit: Suit): Card => ({ id: `demo-${suit}A`, suit, value: 1, kind: "companion" });
const STYLE_DEMO: Record<FightingStyleId, Card[]> = {
  twoHanded: [num("S", 7)],
  swordShield: [num("H", 4), num("C", 4)],
  spear: [num("D", 3), num("C", 3), num("S", 3)],
  dualWield: [num("H", 2), num("D", 2), num("C", 2), num("S", 2)],
  mage: [num("H", 2), num("D", 2), num("C", 2), num("S", 2), num("H", 2, "b")], // five of a rank
  mounted: [num("C", 6), ace("D")],
};

function suitTone(s: Suit): string {
  return s === "H" || s === "D" ? "red" : "black";
}

function RoyalTile({ r }: { r: RoyalView }) {
  const tip = r.decrees.map((d) => d.text).filter(Boolean).join(" · ") || "No decree — a clean fight.";
  return (
    <div className={`descent-royal ${r.status}`} data-tip={tip}>
      <div className="dr-top">
        <span className="dr-pos">#{r.index + 1}</span>
        {r.eventBefore && <span className="dr-event" data-tip="A Court Event precedes this fight">❓ event</span>}
        {r.status === "cleared" && <span className="dr-flag cleared">✓ felled</span>}
        {r.status === "current" && <span className="dr-flag current">▶ now</span>}
        {r.status === "upcoming" && <span className="dr-flag upcoming">… next</span>}
      </div>
      <div className={`dr-face ${suitTone(r.suit)}`}>
        <span className="dr-rank">{RANK[r.tier]}</span>
        <span className="dr-suit">{GLYPH[r.suit]}</span>
      </div>
      <div className="dr-stats">
        <span className="dr-hp">♥{r.maxHealth}</span>
        <span className="dr-atk">⚔{r.attack}{r.enrages ? "+" : ""}</span>
      </div>
      <div className="dr-immune">disables {GLYPH[r.suit]} {SUIT_NAME[r.suit]}</div>
      <div className={`dr-decree ${r.decrees.length ? "has" : "none"}`}>
        {r.decrees.length ? r.decrees.map((d, i) => <div key={i}>⚜ {d.name}</div>) : "— no decree —"}
      </div>
    </div>
  );
}

function StylesPane({ levels }: { levels: Record<FightingStyleId, number> }) {
  const [hover, setHover] = useState<FightingStyleId | null>(null);
  return (
    <div className="ri-styles">
      <p className="ri-pane-note">
        The number of cards you play sets its <b>Fighting Style</b>. Leveling a style (via Training packs &amp;
        Drills) scales the suit powers of plays made in it. Hover a style to see an example play.
      </p>
      <div className="ri-style-list">
        {FIGHTING_STYLE_IDS.map((id) => {
          const lvl = levels[id] ?? 0;
          const per = FIGHTING_STYLE_PER_LEVEL[id];
          const perPct = Math.round(per * 100);
          const mult = (1 + lvl * per).toFixed(2);
          return (
            <div
              key={id}
              className="ri-style-row"
              tabIndex={0}
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover((h) => (h === id ? null : h))}
              onFocus={() => setHover(id)}
              onBlur={() => setHover((h) => (h === id ? null : h))}
            >
              {hover === id && (
                <div className="ri-style-demo" aria-hidden="true">
                  <div className="ri-style-demo-cards">
                    {STYLE_DEMO[id].map((c) => (
                      <PixiCard key={c.id} card={c} w={50} />
                    ))}
                  </div>
                  <div className="ri-style-demo-cap">
                    {STYLE_TRIGGER[id]} — scales its suit powers (heal, draw, shield &amp; Club double) by
                    +{perPct}% of base per level.
                  </div>
                </div>
              )}
              <span className={`ri-style-lvl${lvl > 0 ? " on" : ""}`}>Lv {lvl}</span>
              <span className="ri-style-icon"><StyleSprite id={id} size={30} /></span>
              <span className="ri-style-name">{FIGHTING_STYLE_NAME[id]}</span>
              <span className="ri-style-trigger">{STYLE_TRIGGER[id]}</span>
              <span className="ri-style-mod">
                <span className={`ri-mod-cur${lvl > 0 ? " on" : ""}`} data-tip="Current multiplier on this style's suit powers">
                  ×{mult}
                </span>
                <span className="ri-mod-per">+{perPct}% / lv</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpponentsPane({ royals, enemyIndex }: { royals: RoyalView[]; enemyIndex: number }) {
  const curIdx = Math.min(enemyIndex, royals.length - 1);
  const curTier = royals[curIdx]?.tier ?? "jack";
  const actRoyals = royals.filter((r) => r.tier === curTier);
  const act = ACTS[curTier];
  return (
    <div className="ri-opponents">
      <header className="da-head">
        <h3>{act.title}</h3>
        <span className="da-blurb">{act.blurb} — the current court.</span>
      </header>
      <div className="da-royals">
        {actRoyals.map((r) => (
          <RoyalTile key={r.index} r={r} />
        ))}
      </div>
    </div>
  );
}

function EdictsPane({ edictIds }: { edictIds: string[] | undefined }) {
  const edicts = activeEdicts(edictIds);
  if (edicts.length === 0)
    return <div className="ri-empty">No edicts decreed this run.</div>;
  return (
    <div className="ri-edicts">
      {edicts.map((e) => (
        <div key={e.id} className="ri-edict-row">
          <span className="ri-edict-crest">⚜</span>
          <div>
            <div className="ri-edict-name">{e.name}</div>
            <div className="ri-edict-text">{e.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StakePane({ stakeId }: { stakeId: string | null | undefined }) {
  const top = stakeIndex(stakeId);
  const cur = STAKE_INFO[STAKE_IDS[top]];
  // Every active rule, from White up to (and including) the chosen stake — skip White's flavor line.
  const rules = STAKE_IDS.slice(0, top + 1)
    .map((id) => ({ id, info: STAKE_INFO[id] }))
    .filter(({ id }) => id !== "white");
  return (
    <div className="ri-stake">
      <div className="ri-stake-head">
        <span className="ri-stake-chip" style={{ background: cur.color }} />
        <div>
          <div className="ri-stake-name" style={{ color: cur.color }}>{cur.name}</div>
          <div className="ri-stake-sub">{top === 0 ? "The base difficulty." : `Difficulty tier ${top + 1} of ${STAKE_IDS.length}.`}</div>
        </div>
      </div>
      {rules.length === 0 ? (
        <p className="ri-pane-note">No extra rules — a clean ascent.</p>
      ) : (
        <ul className="ri-stake-rules">
          {rules.map(({ id, info }) => (
            <li key={id}>
              <span className="ri-stake-dot" style={{ background: info.color }} />
              {info.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "styles", label: "Fighting Styles" },
  { id: "opponents", label: "Opponents" },
  { id: "edicts", label: "Edicts" },
  { id: "stake", label: "Stake" },
];

export default function RunMap() {
  const open = useGame((s) => s.mapOpen);
  const run = useGame((s) => s.run);
  const [tab, setTab] = useState<Tab>("styles");
  const close = () => useGame.getState().setMapOpen(false);
  if (!open) return null;

  const royals = gauntletView(run);
  const cleared = run.enemyIndex;

  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-label="The Descent — run info" onClick={close}>
      <div className="descent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>
            The Descent <span className="pile-count">({cleared}/{royals.length} felled · ◆{run.gold})</span>
          </h2>
          <button type="button" className="primary" onClick={close}>Close</button>
        </div>

        <div className="runinfo-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`runinfo-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="runinfo-pane">
          {tab === "styles" && <StylesPane levels={run.styleLevels} />}
          {tab === "opponents" && <OpponentsPane royals={royals} enemyIndex={run.enemyIndex} />}
          {tab === "edicts" && <EdictsPane edictIds={run.edicts} />}
          {tab === "stake" && <StakePane stakeId={run.stakeId} />}
        </div>
      </div>
    </div>
  );
}
