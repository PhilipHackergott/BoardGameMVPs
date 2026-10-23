import { useState } from "react";
import { useStore, DECKS, ROSTER, expandDeck, bandFor, getCard } from "./store";
import { Modal } from "./Modal";
import { Button } from "./atoms";
import { CurveBar } from "./CurveBar";
import { CardFace } from "./CardFace";
import { PACKS } from "../engine/content/packs";
import { marketPrice, sellPrice, priceTrend } from "../engine/content/market";
import { allCards } from "../engine/content/registry";
import { RARITY } from "../render/theme";
import { Rarity } from "../engine/prism/types";
import { CONTEXTS, STAT_KEYS, STAT_LABEL, STAT_MAX, getContext } from "../engine/content/lifesim";
import { TOURNAMENTS, getTournament } from "../engine/content/tournaments";
import { getOpponent } from "../engine/content/opponents";
import { newsUpTo } from "../engine/content/calendar";
import { FORUM_THREADS, BLOG_POSTS } from "../engine/content/community";
import { expandDeck as expand, getDeck as deckById } from "../engine/content/decks";

export function Overlays() {
  const overlay = useStore((s) => s.overlay);
  if (!overlay) return null;
  switch (overlay) {
    case "modeSelect": return <ModeSelect />;
    case "freeplay": return <FreePlaySetup />;
    case "gauntlet": return <GauntletSetup />;
    case "result": return <ResultGate />;
    case "rules": return <Rules />;
    case "settings": return <Settings />;
    case "pause": return <Pause />;
    case "deskMenu": return <DeskMenu />;
    case "shop": return <ShopMenu />;
    case "market": return <MarketApp />;
    case "packReveal": return <PackReveal />;
    case "contextSelect": return <ContextSelect />;
    case "status": return <StatusOverlay />;
    case "tournament": return <TournamentOverlay />;
    case "pcHub": return <PcHub />;
    case "community": return <Community />;
    default: return null;
  }
}

function PcHub() {
  const A = useStore();
  return (
    <Modal title="Your PC" onClose={A.closeOverlay} width={420}>
      <div className="col" style={{ gap: 10 }}>
        <Button size="lg" variant="primary" onClick={() => A.openOverlay("market")}>🛒 PrismSingles.net — the singles market</Button>
        <Button size="lg" onClick={() => A.openOverlay("community")}>🌐 PrismNexus — forum, deck-tech & news</Button>
      </div>
    </Modal>
  );
}

function Community() {
  const A = useStore();
  const career = useStore((s) => s.career);
  const [tab, setTab] = useState<"news" | "forum" | "blog">("news");
  const day = career?.day ?? 99;
  const news = newsUpTo(day);
  return (
    <Modal title="PrismNexus" onClose={A.closeOverlay} width={640}>
      <div className="filters" style={{ marginBottom: 10 }}>
        {(["news", "forum", "blog"] as const).map((t) => (
          <button key={t} className={"chip" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{t === "news" ? "News & B&R" : t === "forum" ? "Forum" : "Deck-Tech Blog"}</button>
        ))}
      </div>
      <div className="scroll" style={{ maxHeight: 380 }}>
        {tab === "news" && news.map((e, i) => (
          <div key={i} className={"news-item" + (e.type === "banlist" ? " banlist" : "")}>
            <div className="news-head">{e.type === "banlist" ? "⚖ " : "✦ "}{e.headline} <span className="tag">Day {e.day}</span></div>
            <div className="muted" style={{ fontSize: 13 }}>{e.body}</div>
          </div>
        ))}
        {tab === "forum" && FORUM_THREADS.map((th, i) => (
          <div key={i} className="thread">
            <div className="thread-title"><span className="tag">{th.board}</span> {th.title}</div>
            {th.posts.map((p, j) => (
              <div key={j} className="post">
                <span className="post-author">{p.author}{p.sig ? <span className="post-sig"> · {p.sig}</span> : null}</span>
                <div className="post-text">{p.text}</div>
              </div>
            ))}
          </div>
        ))}
        {tab === "blog" && BLOG_POSTS.map((b, i) => (
          <div key={i} className="blog">
            <div className="blog-title">{b.title}</div>
            <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>by {b.author} · {b.date}</div>
            <div className="post-text" style={{ marginBottom: 8 }}>{b.body}</div>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <div>
                <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{deckById(b.deckId).name} — Light curve</div>
                <CurveBar deck={expand(deckById(b.deckId))} />
              </div>
              <Button size="sm" onClick={() => { A.closeOverlay(); A.openOverlay("freeplay"); }}>Try a netdeck ▶</Button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function TournamentOverlay() {
  const A = useStore();
  const career = useStore((s) => s.career);
  const t = useStore((s) => s.tournament);
  const packCards = useStore((s) => s.packCards);
  if (!career) return null;

  // No active run → sign-up board.
  if (!t) {
    return (
      <Modal title="Events Board" onClose={A.closeOverlay} width={460}>
        <p className="muted" style={{ marginTop: 0 }}>Wallet ◆ {career.money} · Scene rep {career.fame}{career.trophies ? ` · 🏆 ${career.trophies}` : ""}</p>
        <div className="col" style={{ gap: 10 }}>
          {TOURNAMENTS.map((def) => {
            const locked = !!def.reqFame && career.fame < def.reqFame;
            return (
              <div key={def.id} className="shop-row">
                <div>
                  <div style={{ color: "var(--gold)" }}>{def.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{def.rounds.length} rounds · entry ◆{def.entryFee}{def.reqFame ? ` · needs ${def.reqFame} rep` : ""}</div>
                </div>
                <Button variant="primary" disabled={locked || career.money < def.entryFee} onClick={() => A.enterTournament(def.id)}>{locked ? "Locked" : "Enter"}</Button>
              </div>
            );
          })}
        </div>
      </Modal>
    );
  }

  const def = getTournament(t.defId);
  const bracket = def.rounds.map((r, i) => {
    const opp = getOpponent(r.opponentId);
    const res = i < t.round ? "win" : i === t.round && t.status === "lost" ? "loss" : i === t.round ? "now" : "next";
    return { name: opp.name, band: bandFor(opp.skill), res };
  });

  return (
    <Modal title={def.name} onClose={t.status === "ready" ? undefined : A.collectTournament} closable={t.status !== "ready"} width={460}>
      <ol className="bracket">
        {bracket.map((b, i) => (
          <li key={i} className={"bracket-row " + b.res}>
            <span className="br-n">R{i + 1}</span>
            <span className="br-name">{b.name} <span className="tag">{b.band}</span></span>
            <span className="br-res">{b.res === "win" ? "✓ won" : b.res === "loss" ? "✕ out" : b.res === "now" ? "▶ now" : "•"}</span>
          </li>
        ))}
      </ol>
      {t.status === "ready" && (
        <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
          <Button variant="primary" size="lg" onClick={A.startTournamentMatch}>Play Round {t.round + 1} ▶</Button>
        </div>
      )}
      {t.status === "champion" && (
        <div className="result">
          <div className="result-big win">🏆 CHAMPION</div>
          <p>You won {def.name}! +◆{def.championBonusMoney} · +{def.championFame} rep · a trophy{def.championPack ? " · a booster pack:" : ""}</p>
          {packCards.length > 0 && <div className="pack-reveal">{packCards.map((id, i) => <div key={i} className="pack-card" style={{ animationDelay: `${i * 0.1}s` }}><CardFace card={getCard(id)} size="list" /></div>)}</div>}
          <Button variant="primary" size="lg" onClick={A.collectTournament} style={{ marginTop: 12 }}>Collect</Button>
        </div>
      )}
      {t.status === "lost" && (
        <div className="result">
          <div className="result-big loss">Eliminated</div>
          <p className="muted">Knocked out in round {t.round + 1}. You keep what you earned ({t.wins} {t.wins === 1 ? "win" : "wins"}).</p>
          <Button size="lg" onClick={A.collectTournament}>Leave</Button>
        </div>
      )}
    </Modal>
  );
}

function ContextSelect() {
  const A = useStore();
  return (
    <Modal title="New Story — choose your year" onClose={A.closeOverlay} width={560}>
      <p className="muted" style={{ marginTop: 0 }}>Your year sets your starting stats, free time, and how tough the local scene plays.</p>
      <div className="col" style={{ gap: 10 }}>
        {CONTEXTS.map((c) => (
          <button key={c.id} className="mode-card" onClick={() => A.startStory(c.id)}>
            <h3>{c.name}</h3>
            <p className="muted" style={{ margin: "4px 0" }}>{c.desc}</p>
            <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0 }}>
              {STAT_KEYS.map((k) => `${STAT_LABEL[k].slice(0, 3)} ${c.startStats[k]}`).join(" · ")}
              {c.examEvery ? ` · exam every ${c.examEvery}d` : " · no exams"}
            </p>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function StatusOverlay() {
  const A = useStore();
  const career = useStore((s) => s.career);
  if (!career) return null;
  const ctx = getContext(career.context);
  return (
    <Modal title="Status" onClose={A.closeOverlay} width={420}>
      <div className="spread" style={{ marginBottom: 6 }}>
        <span style={{ color: "var(--gold)" }}>{ctx.name}</span>
        <span className="muted">Day {career.day} · ◆ {career.money}</span>
      </div>
      <div className="spread" style={{ marginBottom: 10 }}>
        <span className="muted">★ Scene rep {career.fame}{career.fame >= 10 ? " (sponsored)" : ""}</span>
        <span className="muted">🏆 {career.trophies} · exams {career.examsPassed}</span>
      </div>
      <div className="col" style={{ gap: 8 }}>
        {STAT_KEYS.map((k) => (
          <div key={k} className="stat-row">
            <span className="stat-name">{STAT_LABEL[k]}</span>
            <div className="stat-track"><div className="stat-fill" style={{ width: `${(career.stats[k] / STAT_MAX) * 100}%` }} /></div>
            <span className="stat-val">{career.stats[k]}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 11, marginBottom: 0, marginTop: 10 }}>Spend day-slots on activities (study / work / socialize / practice) around town to raise these. Sleep restores Stamina.</p>
    </Modal>
  );
}

function ShopMenu() {
  const A = useStore();
  const career = useStore((s) => s.career);
  if (!career) return null;
  return (
    <Modal title="Pip's Cards — Boosters" onClose={A.closeOverlay} width={440}>
      <p className="muted" style={{ marginTop: 0 }}>Wallet: <b style={{ color: "var(--gold)" }}>◆ {career.money}</b></p>
      <div className="col" style={{ gap: 10 }}>
        {PACKS.map((p) => (
          <div key={p.id} className="shop-row">
            <div>
              <div style={{ color: "var(--gold)" }}>{p.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{p.size} cards · 1 Rare+ guaranteed</div>
            </div>
            <Button variant="primary" disabled={career.money < p.cost} onClick={() => A.buyPack(p.id)}>Buy & Open · ◆ {p.cost}</Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function PackReveal() {
  const A = useStore();
  const cards = useStore((s) => s.packCards);
  return (
    <Modal title="Pack Opened!" onClose={A.closePackReveal} closable width={620}>
      <div className="pack-reveal">
        {cards.map((id, i) => (
          <div key={i} className="pack-card" style={{ animationDelay: `${i * 0.12}s` }}>
            <CardFace card={getCard(id)} size="list" />
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: 14 }}>
        <Button variant="primary" onClick={A.closePackReveal}>Add to collection</Button>
      </div>
    </Modal>
  );
}

function MarketApp() {
  const A = useStore();
  const career = useStore((s) => s.career);
  const [rar, setRar] = useState<Rarity | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(false);
  if (!career) return null;
  const day = career.day;
  const rows = allCards()
    .filter((c) => (!rar || c.rarity === rar) && (!ownedOnly || (career.collection[c.id] ?? 0) > 0))
    .sort((a, b) => marketPrice(b.id, day) - marketPrice(a.id, day));
  return (
    <Modal title="PrismSingles.net — the online market" onClose={A.closeOverlay} width={680}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <span className="muted">Wallet: <b style={{ color: "var(--gold)" }}>◆ {career.money}</b> · prices drift daily (Day {day})</span>
        <label className="toggle" style={{ fontSize: 12 }}><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} /><span>Owned only</span></label>
      </div>
      <div className="filters" style={{ marginBottom: 8 }}>
        <button className={"chip" + (!rar ? " on" : "")} onClick={() => setRar(null)}>All</button>
        {(["common", "uncommon", "rare", "mythic"] as Rarity[]).map((r) => (
          <button key={r} className={"chip" + (rar === r ? " on" : "")} style={{ color: RARITY[r].color }} onClick={() => setRar(rar === r ? null : r)}>{RARITY[r].label}</button>
        ))}
      </div>
      <div className="market-list scroll" style={{ maxHeight: 360 }}>
        {rows.map((c) => {
          const price = marketPrice(c.id, day);
          const sell = sellPrice(c.id, day);
          const trend = priceTrend(c.id, day);
          const owned = career.collection[c.id] ?? 0;
          return (
            <div key={c.id} className="market-row" onPointerEnter={() => A.setPeek(c.id)} onPointerLeave={() => A.setPeek(null)}>
              <span className="mk-rar" style={{ color: RARITY[c.rarity].color }}>●</span>
              <span className="mk-name">{c.name}</span>
              <span className="mk-own muted">x{owned}</span>
              <span className={"mk-trend " + trend}>{trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}</span>
              <span className="mk-price">◆ {price}</span>
              <Button size="sm" disabled={career.money < price} onClick={() => A.buySingle(c.id)}>Buy</Button>
              <Button size="sm" variant="ghost" disabled={owned <= 0} onClick={() => A.sellSingle(c.id)}>Sell ◆{sell}</Button>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 11, marginBottom: 0 }}>Tip: build from your binder at the desk; sell dupes here for coin.</p>
    </Modal>
  );
}

function DeskMenu() {
  const A = useStore();
  const career = useStore((s) => s.career);
  if (!career) return null;
  return (
    <Modal title="Your Desk" onClose={A.closeOverlay} width={440}>
      <p className="muted" style={{ marginTop: 0 }}>Tune a deck, browse your binder, or choose what you'll duel with.</p>
      <div className="setup">
        <label className="picker">
          <span>Active deck</span>
          <select value={career.activeDeckId} onChange={(e) => A.pickActiveDeck(e.target.value)}>
            {career.ownedDeckIds.map((id) => <option key={id} value={id}>{A.deckName(id)}</option>)}
          </select>
        </label>
        <div className="row" style={{ gap: 10 }}>
          <Button onClick={() => { A.closeOverlay(); A.newDeck(); }}>🛠 Build a Deck</Button>
          <Button onClick={() => { A.closeOverlay(); A.setView("gallery"); }}>📖 Card Gallery</Button>
        </div>
      </div>
    </Modal>
  );
}

function availableDecks() {
  const saved = useStore.getState().savedDecks.filter((d) => d.cards.length === 30).map((d) => ({ id: d.id, name: d.name + " (yours)", cards: d.cards }));
  const pre = DECKS.map((d) => ({ id: d.id, name: d.name, cards: expandDeck(d) }));
  return [...saved, ...pre];
}

function ModeSelect() {
  const A = useStore();
  return (
    <Modal title="Choose a Mode" onClose={A.closeOverlay} width={620}>
      <div className="mode-grid">
        <button className="mode-card" onClick={() => { A.startStarter(); }}>
          <h3>Starter Duel</h3>
          <p className="muted">A gentle first game with a preset deck against the easiest opponent. Learn the ropes.</p>
        </button>
        <button className="mode-card" onClick={() => A.openOverlay("freeplay")}>
          <h3>Free Play</h3>
          <p className="muted">Pick any two decks and set the AI's skill. The lab for tuning a brew.</p>
        </button>
        <button className="mode-card" onClick={() => A.openOverlay("gauntlet")}>
          <h3>Gauntlet</h3>
          <p className="muted">Climb the 14-opponent ladder from the New Kid to the World Champion. The skill scale rises with every rung.</p>
        </button>
      </div>
    </Modal>
  );
}

function DeckPicker({ value, onChange, label }: { value: string; onChange: (id: string) => void; label: string }) {
  const decks = availableDecks();
  return (
    <label className="picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </label>
  );
}

function FreePlaySetup() {
  const A = useStore();
  const decks = availableDecks();
  const [mine, setMine] = useState(decks[0]?.id ?? "emberrush");
  const [opp, setOpp] = useState("ironlaw");
  const [skill, setSkill] = useState(0.5);
  const myDeck = decks.find((d) => d.id === mine) ?? decks[0];
  return (
    <Modal title="Free Play" onClose={A.closeOverlay} width={560}>
      <div className="setup">
        <DeckPicker label="Your deck" value={mine} onChange={setMine} />
        <DeckPicker label="Opponent deck" value={opp} onChange={setOpp} />
        <label className="picker">
          <span>AI skill — <strong style={{ color: "var(--gold)" }}>{bandFor(skill)}</strong> ({Math.round(skill * 100)})</span>
          <input type="range" min={0.05} max={0.97} step={0.01} value={skill} onChange={(e) => setSkill(Number(e.target.value))} />
        </label>
        {myDeck && <div className="setup-curve"><CurveBar deck={myDeck.cards} /></div>}
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <Button variant="primary" size="lg" onClick={() => myDeck && A.startFreePlay(myDeck.cards, myDeck.name, opp, skill)}>Start Duel ▶</Button>
      </div>
    </Modal>
  );
}

function GauntletSetup() {
  const A = useStore();
  const decks = availableDecks();
  const [mine, setMine] = useState(decks[0]?.id ?? "emberrush");
  return (
    <Modal title="Gauntlet — climb the ladder" onClose={A.closeOverlay} width={560}>
      <DeckPicker label="Your deck" value={mine} onChange={setMine} />
      <ol className="ladder">
        {ROSTER.map((o, i) => (
          <li key={o.id}><span className="ladder-n">{i + 1}</span> {o.name} <span className="tag">{bandFor(o.skill)}</span></li>
        ))}
      </ol>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
        <Button variant="primary" size="lg" onClick={() => A.startGauntlet(mine)}>Enter the Gauntlet ▶</Button>
      </div>
    </Modal>
  );
}

function ResultGate() {
  const A = useStore();
  const res = useStore((s) => s.pendingResult);
  const meta = useStore((s) => s.meta);
  const g = useStore((s) => s.gauntlet);
  if (!res || !meta) return null;
  const won = res.outcome === "win";
  const gauntletWon = won && g && g.rung >= ROSTER.length - 1;
  return (
    <Modal title={won ? "Victory" : "Defeat"} onClose={A.closeOverlay} closable={false} width={460}>
      <div className="result">
        <div className={"result-big " + (won ? "win" : "loss")}>{gauntletWon ? "🏆 CHAMPION" : won ? "✦ You Win" : "☾ You Fall"}</div>
        <p className="muted">vs {meta.oppName} · {res.turns} turns</p>
        {g && !gauntletWon && won && <p>Rung {g.rung + 1} cleared — {ROSTER[g.rung + 1]?.name} steps up.</p>}
        {gauntletWon && <p>You beat the whole circuit. The scene knows your name.</p>}
        <div className="row" style={{ justifyContent: "center", marginTop: 16, gap: 10 }}>
          {g && won && !gauntletWon && <Button variant="primary" size="lg" onClick={A.nextGauntletRung}>Next Opponent ▶</Button>}
          {(gauntletWon || !g || !won) && <Button variant="primary" size="lg" onClick={A.quitToMenu}>Main Menu</Button>}
          {!won && <Button size="lg" onClick={() => { if (g) A.startGauntlet(g.deckId); else A.quitToMenu(); }}>{g ? "Retry Gauntlet" : "Menu"}</Button>}
        </div>
      </div>
    </Modal>
  );
}

function Rules() {
  const A = useStore();
  return (
    <Modal title="How to Play PRISM" onClose={A.closeOverlay} width={640}>
      <div className="rules">
        <p><strong>Goal.</strong> Reduce your opponent's <b>Nexus</b> from 16 to 0. (If you must draw from an empty deck, you lose.)</p>
        <p><strong>Light.</strong> Each turn your max Light rises by 1 and refills. Spend it to play cards. <b>Refract</b> once per turn: discard a card from hand for +1 Light this turn (Refract+ cards give +2) — the skill lever for a big turn.</p>
        <p><strong>Cards.</strong> <b>Units</b> have power (which is both their attack and their health). <b>Spells</b> are one-shot. <b>Gear</b> permanently buffs a unit (or your Nexus).</p>
        <p><strong>Board.</strong> 3 lanes, one unit per lane. On your turn: play cards, then <b>Attack</b>. Each attacking unit fights the enemy unit in the <i>same</i> lane (both deal their power to each other; power-damage ≥ power destroys a unit, and damage clears at end of turn). If the opposing lane is empty, it hits the Nexus.</p>
        <p><strong>Keywords.</strong> <b>Haste</b> (attack the turn it lands) · <b>Guard</b> (each one stops one open-lane attack) · <b>Pierce</b> (excess combat damage carries to the Nexus, and ignores Guard) · <b>Drain</b> (Nexus damage heals you) · <b>Shield N</b> (absorbs N once) · <b>Lifegain N</b> (heal on deploy) · <b>Volatile</b> (dies at end of turn) · <b>Rally N</b> (on deploy, your other units get +N) · <b>Vengeance N</b> (deal N to the enemy Nexus when it dies) · <b>Momentum N</b> (gains +N power at the start of your turn).</p>
        <p><strong>Affinities.</strong> Ember (burn/aggro) · Tide (tempo/cards) · Verdant (ramp/big) · Gloom (drain/removal) · Order (walls/heal). Rarer cards are stronger — but always answerable.</p>
        <p className="muted">Tip: many damage spells can hit a unit <i>or</i> the Nexus — your choice when you cast.</p>
      </div>
    </Modal>
  );
}

function Settings() {
  const A = useStore();
  const s = useStore((st) => st.settings);
  return (
    <Modal title="Settings" onClose={A.closeOverlay} width={460}>
      <div className="settings">
        <Slider label="Music" value={s.music} onChange={(v) => A.setSetting("music", v)} />
        <Slider label="SFX" value={s.sfx} onChange={(v) => A.setSetting("sfx", v)} />
        <Toggle label="Mute all" value={s.muted} onChange={(v) => A.setSetting("muted", v)} />
        <Toggle label="Reduce motion" value={s.reduceMotion} onChange={(v) => A.setSetting("reduceMotion", v)} />
        <label className="picker">
          <span>Text size — {Math.round(s.textScale * 100)}%</span>
          <input type="range" min={0.85} max={1.4} step={0.05} value={s.textScale} onChange={(e) => A.setSetting("textScale", Number(e.target.value))} />
        </label>
      </div>
    </Modal>
  );
}

function Pause() {
  const A = useStore();
  const duel = useStore((st) => st.duel);
  return (
    <Modal title="Paused" onClose={A.togglePause} width={360}>
      <div className="col" style={{ gap: 10 }}>
        <Button size="lg" variant="primary" onClick={A.togglePause}>Resume</Button>
        <Button size="lg" onClick={() => A.openOverlay("settings")}>Settings</Button>
        <Button size="lg" onClick={() => A.openOverlay("rules")}>How to Play</Button>
        {duel && duel.phase !== "over" && <Button size="lg" variant="danger" onClick={A.concede}>Concede</Button>}
        <Button size="lg" variant="ghost" onClick={A.quitToMenu}>Quit to Menu</Button>
      </div>
    </Modal>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="picker">
      <span>{label} — {Math.round(value * 100)}%</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
