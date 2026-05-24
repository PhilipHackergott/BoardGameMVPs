import { useState } from "react";
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
import { JokerArt, TarotArt, DeckArt } from "./CardArt";
import StyleSprite from "./StyleSprite";
import WaxSeal from "./WaxSeal";

// The Compendium — a single in-game reference. A left sidebar navigates between two groups:
//   • How to Play — short rules pages that explain every system in plain language.
//   • Compendium  — browsable galleries of every joker, tarot, spectral, style, deck, sigil, and
//                   royal (with their decrees / special abilities).
// Read-only. Opened from the title menu ("Compendium") and the Rules entry (deep-links to Overview).

type Page =
  // rules pages
  | "overview"
  | "suits"
  | "combos"
  | "economy"
  | "modifiers"
  // galleries
  | "jokers"
  | "tarots"
  | "spectrals"
  | "styles"
  | "decks"
  | "sigils"
  | "enemies";

const ARCANA = TAROT_LIBRARY.filter((t) => !t.id.startsWith("drill-"));

const STYLE_PLAYED: Record<string, string> = {
  twoHanded: "a single card",
  swordShield: "2 cards",
  spear: "3 cards",
  dualWield: "4 cards",
  mage: "5 cards",
  mounted: "any play with an Animal Companion (Ace)",
};

const SUIT_RULES: { glyph: string; name: string; cls: "red" | "black"; power: string }[] = [
  { glyph: "♥", name: "Hearts", cls: "red", power: "Heal — return that many cards from the discard to the bottom of your deck." },
  { glyph: "♦", name: "Diamonds", cls: "red", power: "Draw — pull that many cards from your deck into your hand." },
  { glyph: "♣", name: "Clubs", cls: "black", power: "Double — your attack's damage counts twice." },
  { glyph: "♠", name: "Spades", cls: "black", power: "Shield — reduce the royal's next counter-attack (it stacks)." },
];

const SEVERITY_TINT: Record<string, string> = {
  mild: "#3d8a4c",
  standard: "#c89a3a",
  severe: "#b5402e",
  finisher: "#8a5cc0",
};
const SEVERITY_LABEL: Record<string, string> = {
  mild: "Jack · mild",
  standard: "Queen · standard",
  severe: "King · severe",
  finisher: "Final King · finisher",
};

const ROYAL_TIERS: { tier: "jack" | "queen" | "king"; name: string; glyph: string; note: string }[] = [
  { tier: "jack", name: "Jacks", glyph: "♟", note: "The opening rank. Each bears a single mild decree." },
  { tier: "queen", name: "Queens", glyph: "♛", note: "Tougher, with a standard decree." },
  {
    tier: "king",
    name: "Kings",
    glyph: "♚",
    note: "Enrage at half health (+5 attack). Bears a severe decree plus a stacked mild one — and the final King carries the finisher.",
  },
];

const NAV: { group: string; items: { id: Page; label: string; count?: number }[] }[] = [
  {
    group: "How to Play",
    items: [
      { id: "overview", label: "Overview" },
      { id: "suits", label: "Suits & Powers" },
      { id: "combos", label: "Combos & Fighting Styles" },
      { id: "economy", label: "Shop & Packs" },
      { id: "modifiers", label: "Sigils, Seals & Editions" },
    ],
  },
  {
    group: "Compendium",
    items: [
      { id: "jokers", label: "Jokers", count: JOKER_LIBRARY.length },
      { id: "tarots", label: "Tarot Cards", count: ARCANA.length },
      { id: "spectrals", label: "Spectral Cards", count: SPECTRAL_LIBRARY.length },
      { id: "styles", label: "Fighting Styles", count: FIGHTING_STYLE_IDS.length },
      { id: "decks", label: "Decks", count: DECK_LIBRARY.length },
      { id: "sigils", label: "Sigils", count: SIGIL_IDS.length },
      { id: "enemies", label: "Royals & Decrees", count: ROYAL_TIERS.length + DECREE_LIBRARY.length },
    ],
  },
];

const PAGE_TITLE: Record<Page, string> = {
  overview: "Overview",
  suits: "Suits & Powers",
  combos: "Combos & Fighting Styles",
  economy: "Shop & Packs",
  modifiers: "Sigils, Seals & Editions",
  jokers: "Jokers",
  tarots: "Tarot Cards",
  spectrals: "Spectral Cards",
  styles: "Fighting Styles",
  decks: "Decks",
  sigils: "Sigils",
  enemies: "Royals & Decrees",
};

function Tile({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="coll-card" data-tip={sub}>
      <div className="coll-art">{children}</div>
      <div className="coll-name">{title}</div>
      <div className="coll-text">{sub}</div>
    </div>
  );
}

// ----- Rules pages ---------------------------------------------------------------------------

function RulesPage({ page }: { page: Page }) {
  if (page === "overview")
    return (
      <div className="comp-rules">
        <p className="comp-lead">
          A solo card-battler. A gauntlet of <b>12 royals</b> stands between you and the throne — four
          Jacks, then four Queens, then four Kings. Topple every one and the crown is culled.
        </p>
        <h3>A turn, step by step</h3>
        <ol>
          <li>
            <b>Play 1–5 cards</b> from your hand at the royal. Their total value is your attack; each
            card's <b>suit fires a power</b> (see Suits &amp; Powers).
          </li>
          <li>The royal takes the damage. If it survives, it <b>strikes back</b>.</li>
          <li>
            <b>Cover the strike</b> with shield, or discard cards worth at least the incoming hit. Fail
            and the run ends.
          </li>
        </ol>
        <h3>Between fights</h3>
        <p>
          Winning pays <b>gold</b> — land the <b>exact</b> killing blow for a bonus. In the shop, open{" "}
          <b>booster packs</b>, recruit <b>jokers</b> into your guild, and use <b>Tarot</b> and{" "}
          <b>Spectral</b> cards to reshape your deck. Build an engine strong enough for the Kings.
        </p>
        <p className="comp-tip">Tip: use the sidebar to read any system in detail, or browse every card in the game.</p>
      </div>
    );

  if (page === "suits")
    return (
      <div className="comp-rules">
        <p className="comp-lead">
          Damage is the value you play. On top of that, <b>each suit triggers its own power</b> equal
          to the value played (plus any suit upgrade you've earned).
        </p>
        <ul className="comp-suits">
          {SUIT_RULES.map((s) => (
            <li key={s.name}>
              <span className={`comp-suit-glyph ${s.cls}`}>{s.glyph}</span>
              <span>
                <b>{s.name}</b> — {s.power}
              </span>
            </li>
          ))}
        </ul>
        <h3>Immunity</h3>
        <p>
          <b>A royal is immune to its own suit</b> — that suit's power does nothing against it (the
          damage still lands). Play a <b>mixed-suit combo</b> to fire several powers at once and route
          around the immunity.
        </p>
      </div>
    );

  if (page === "combos")
    return (
      <div className="comp-rules">
        <p className="comp-lead">
          A play is either a <b>single card</b>, or a <b>combo of 2–5 cards of equal rank</b> whose
          values sum to <b>10 or less</b>. Every play may use <b>at most 5 cards</b>.
        </p>
        <h3>Animal Companions</h3>
        <p>
          The four Aces are <b>Animal Companions</b> (value 1). One may be added to any play — alone,
          paired with another card, or stacked onto a combo — adding its value and its suit's power.
        </p>
        <h3>Fighting Styles</h3>
        <p>
          The <b>number of cards</b> you play sets that play's <b>Fighting Style</b>. Leveling a style
          (via Training packs and Drills) scales the <b>suit powers</b> of plays made in that style —
          bigger plays scale harder per level.
        </p>
        <ul className="comp-style-list">
          {FIGHTING_STYLE_IDS.map((id) => (
            <li key={id}>
              <StyleSprite id={id} size={28} />
              <span>
                <b>{FIGHTING_STYLE_NAME[id]}</b> — played with {STYLE_PLAYED[id]}.{" "}
                <span className="comp-dim">+{Math.round(FIGHTING_STYLE_PER_LEVEL[id] * 100)}% of base per level.</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );

  if (page === "economy")
    return (
      <div className="comp-rules">
        <p className="comp-lead">
          The shop between fights is where runs are built. Everything is bought with <b>gold</b>;{" "}
          <b>reroll</b> refreshes the offers for a price.
        </p>
        <h3>Booster packs</h3>
        <p>
          Packs come in <b>five kinds</b> and <b>four sizes</b>. Opening a pack lets you pick a number
          of its contents and keep them:
        </p>
        <ul className="comp-pack-sizes">
          <li><b>S</b> — choose 1 of 2</li>
          <li><b>M</b> — choose 1 of 3</li>
          <li><b>L</b> — choose 1 of 5</li>
          <li><b>XL</b> — choose 2 of 5</li>
        </ul>
        <ul className="comp-bullets">
          <li><b>Card</b> packs — basic cards, sometimes already bearing a sigil.</li>
          <li><b>Joker</b> packs — guild members with passive engine effects.</li>
          <li><b>Training</b> packs — Drills that level your Fighting Styles.</li>
          <li><b>Tarot</b> packs — the Arcana: reshape and enhance your deck.</li>
          <li><b>Spectral</b> packs — powerful, risky deck-altering cards.</li>
        </ul>
        <h3>Also in the shop</h3>
        <ul className="comp-bullets">
          <li><b>Loose offers</b> — single items you can buy outright.</li>
          <li><b>Jokers</b> fill your <b>guild slots</b> (passive, always-on powers).</li>
          <li><b>Remove a card</b> — thins your deck; the cost rises with each use.</li>
          <li><b>Edicts</b> — one per Act, a run-shaping choice.</li>
        </ul>
      </div>
    );

  // modifiers
  return (
    <div className="comp-rules">
      <p className="comp-lead">Three kinds of permanent upgrade let you tune individual cards and jokers.</p>
      <h3>Sigils</h3>
      <p>
        A <b>sigil</b> is a stamp on a single card that boosts or changes how it resolves (e.g. raises
        its value, fires an extra suit, or converts its kind). Browse all sigils in the Compendium.
      </p>
      <h3>Seals</h3>
      <p>A <b>seal</b> is a coloured wax mark that adds a bonus when the card is played, held, or felled:</p>
      <ul className="comp-bullets">
        <li><span className="comp-seal-dot" style={{ background: "#e6b94a" }} /> <b>Gold</b> — earns gold.</li>
        <li><span className="comp-seal-dot" style={{ background: "#c83a3a" }} /> <b>Red</b> — adds value.</li>
        <li><span className="comp-seal-dot" style={{ background: "#4a78c8" }} /> <b>Blue</b> — triggers on a felled royal.</li>
        <li><span className="comp-seal-dot" style={{ background: "#9a4ac8" }} /> <b>Purple</b> — triggers on discard.</li>
      </ul>
      <h3>Editions</h3>
      <p>
        An <b>edition</b> is a foil-like finish applied to a joker — <b>Burnished</b>, <b>Haloed</b>,{" "}
        <b>Prismatic</b>, or <b>Shadow</b> — adding flat or multiplicative output to that slot.
      </p>
    </div>
  );
}

// ----- Galleries -----------------------------------------------------------------------------

function Gallery({ page }: { page: Page }) {
  if (page === "jokers")
    return (
      <div className="coll-grid">
        {JOKER_LIBRARY.map((j) => (
          <Tile key={j.id} title={j.name} sub={j.text}>
            <JokerArt id={j.id} art={j.art} size={84} />
          </Tile>
        ))}
      </div>
    );

  if (page === "tarots" || page === "spectrals") {
    const list = page === "tarots" ? ARCANA : SPECTRAL_LIBRARY;
    return (
      <div className="coll-grid">
        {list.map((t) => (
          <Tile key={t.id} title={t.name} sub={t.text}>
            <TarotArt id={t.id} art={t.art} size={84} />
          </Tile>
        ))}
      </div>
    );
  }

  if (page === "decks")
    return (
      <div className="coll-grid">
        {DECK_LIBRARY.map((d) => (
          <Tile key={d.id} title={d.name} sub={d.text.join(" · ")}>
            <DeckArt id={d.id} />
          </Tile>
        ))}
      </div>
    );

  if (page === "styles")
    return (
      <div className="coll-grid">
        {FIGHTING_STYLE_IDS.map((id) => {
          const pct = `+${Math.round(FIGHTING_STYLE_PER_LEVEL[id] * 100)}% of base per level`;
          return (
            <Tile key={id} title={FIGHTING_STYLE_NAME[id]} sub={`Played with ${STYLE_PLAYED[id]}. ${pct}.`}>
              <div className="coll-style"><StyleSprite id={id} size={64} /></div>
            </Tile>
          );
        })}
      </div>
    );

  // sigils
  return (
    <div className="coll-grid">
      {SIGIL_IDS.map((s) => (
        <Tile key={s} title={SIGIL_INFO[s].name} sub={SIGIL_INFO[s].text}>
          <div className="coll-style"><WaxSeal sigil={s} glyph={SIGIL_INFO[s].glyph} size={56} /></div>
        </Tile>
      ))}
    </div>
  );
}

// ----- Royals & Decrees ----------------------------------------------------------------------

function EnemiesPage() {
  return (
    <>
      <div className="comp-rules comp-rules-tight">
        <p className="comp-lead">
          The Castle is <b>12 royals</b>: four Jacks, then four Queens, then four Kings. Each is{" "}
          <b>immune to its own suit</b> and rules under one or more <b>Decrees</b> — special rules that
          make the fight harder. The first royal is always decree-free.
        </p>
      </div>

      <div className="comp-tiers">
        {ROYAL_TIERS.map((r) => {
          const s = TIER_STATS[r.tier];
          return (
            <div key={r.tier} className="comp-tier">
              <div className="comp-tier-badge">{r.glyph}</div>
              <div className="comp-tier-name">{r.name}</div>
              <div className="comp-tier-stats">
                <span>❤ {s.health} HP</span>
                <span>⚔ {s.attack} atk</span>
              </div>
              <div className="comp-tier-note">{r.note}</div>
            </div>
          );
        })}
      </div>

      <h3 className="comp-sub">Royal Decrees</h3>
      <p className="comp-decree-intro">
        A royal's decree is drawn from this set, scaled to its rank. Read it before you commit a play.
      </p>
      <div className="coll-grid">
        {DECREE_LIBRARY.map((d) => {
          const sev = DECREE_SEVERITY[d.id] ?? "standard";
          const tint = SEVERITY_TINT[sev];
          return (
            <div key={d.id} className="coll-card" data-tip={d.text}>
              <div className="coll-art">
                <div className="comp-decree-crest" style={{ borderColor: tint, color: tint }}>⚜</div>
              </div>
              <div className="coll-name">{d.name}</div>
              <div className="comp-sev-tag" style={{ color: tint, borderColor: tint }}>{SEVERITY_LABEL[sev]}</div>
              <div className="coll-text">{d.text}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ----- Shell ---------------------------------------------------------------------------------

const RULES_PAGES: Page[] = ["overview", "suits", "combos", "economy", "modifiers"];

export default function Collection({ onClose, start = "overview" }: { onClose: () => void; start?: Page }) {
  const [page, setPage] = useState<Page>(start);

  return (
    <div className="help-backdrop comp-backdrop" role="dialog" aria-modal="true" aria-label="Compendium" onClick={onClose}>
      <div className="comp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>Compendium</h2>
          <button type="button" className="primary" onClick={onClose}>Close</button>
        </div>

        <div className="comp-layout">
          <nav className="comp-side">
            {NAV.map((grp) => (
              <div key={grp.group} className="comp-side-group">
                <div className="comp-side-label">{grp.group}</div>
                {grp.items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className={`comp-nav-item${page === it.id ? " active" : ""}`}
                    onClick={() => setPage(it.id)}
                  >
                    <span>{it.label}</span>
                    {it.count != null && <span className="comp-nav-count">{it.count}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="comp-main">
            <h2 className="comp-main-title">{PAGE_TITLE[page]}</h2>
            {page === "enemies" ? (
              <EnemiesPage />
            ) : RULES_PAGES.includes(page) ? (
              <RulesPage page={page} />
            ) : (
              <Gallery page={page} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
