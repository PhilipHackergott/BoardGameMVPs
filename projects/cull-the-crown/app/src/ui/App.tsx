import { useEffect, useState } from "react";
import { useGame, hasSavedRun } from "./store";
import PixiBoard from "./PixiBoard";
import TransitionLayer from "./TransitionLayer";
import TooltipLayer from "./TooltipLayer";
import CombatGate from "./CombatGate";
import DeckModal from "./DeckModal";
import DeckPeek from "./DeckPeek";
import PackModal from "./PackModal";
import RunMap from "./RunMap";
import HelpOverlay from "./HelpOverlay";
import PauseMenu from "./PauseMenu";
import SettingsMenu from "./SettingsMenu";
import PastRunsOverlay from "./PastRunsOverlay";
import RunSetup from "./RunSetup";
import Collection from "./Collection";
import { JokerArt, TarotArt } from "./CardArt";
import ShopBoard from "./ShopBoard";
import StyleSprite from "./StyleSprite";
import { audio, music, sfx } from "../audio/chiptune";
import {
  currentHandMax,
  enemyIntent,
  eventById,
  heldMax,
  jokerById,
  maxSlots,
  previewPlay,
  runSummary,
  styleOf,
  tarotById,
} from "../engine/index";
import { FIGHTING_STYLE_NAME, FIGHTING_STYLE_PER_LEVEL, Suit, SUIT_NAME } from "../engine/types";

const GLYPH: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };

// The single suit power each suit grants — shown (with a brief full description, not an abbreviation)
// for ONLY the suit(s) of the card(s) being previewed.
const SUIT_EFFECT: Record<Suit, { glyph: string; label: string; cls: string }> = {
  H: { glyph: "♥", label: "Heal — return cards from the used pile under your deck", cls: "s-red" },
  D: { glyph: "♦", label: "Draw that many cards from your deck", cls: "s-red" },
  C: { glyph: "♣", label: "Double this attack's damage", cls: "s-dark" },
  S: { glyph: "♠", label: "Shield — reduce the royal's next strike (stacks)", cls: "s-dark" },
};
const SUIT_KEYS: Suit[] = ["H", "D", "C", "S"];
const SUIT_TINT: Record<Suit, string> = { H: "#e0506a", D: "#e89a3c", C: "#6fc0e0", S: "#b070e0" };


function CombatScreen() {
  const { run, selected, hoverId, clearSelect, playCards, discardSelected, wildSuits, setWildSuit, pendingPick, pickLabel, sortHand } = useGame();
  const combat = run.combat!;
  const defend = combat.subphase === "defend";
  const upg = run.suitUpgrades;
  const upgText = (["H", "D", "C", "S"] as Suit[]).filter((s) => upg[s] > 0).map((s) => `${GLYPH[s]}+${upg[s]}`).join(" ");

  const total = run.hand.filter((c) => selected.includes(c.id)).reduce((a, c) => a + c.value, 0);
  const enough = total >= combat.incoming;
  const autoSelect = () => {
    // Block the LOWEST total possible: the subset of the hand summing to at least the incoming
    // damage with the smallest sum (ties → fewest cards), so no card value is wasted on overkill.
    // Brute force every subset — the hand is tiny (≤ ~9 cards).
    const cards = run.hand;
    const target = combat.incoming;
    const n = cards.length;
    let bestMask = (1 << n) - 1; // fallback: discard everything if the hand can't cover the blow
    let bestSum = Infinity;
    let bestCount = n + 1;
    for (let mask = 1; mask < 1 << n; mask++) {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          sum += cards[i].value;
          count++;
        }
      }
      if (sum >= target && (sum < bestSum || (sum === bestSum && count < bestCount))) {
        bestSum = sum;
        bestCount = count;
        bestMask = mask;
      }
    }
    const pick = cards.filter((_, i) => (bestMask & (1 << i)) !== 0).map((c) => c.id);
    clearSelect();
    pick.forEach((id) => useGame.getState().toggleSelect(id));
  };
  // The action box previews the selected combo, or — when nothing is selected — whatever card the
  // pointer is hovering, so a card's powers (with passive/upgrade buffs folded in) show on hover too.
  const inHand = (id: string | null): id is string => !!id && run.hand.some((c) => c.id === id);
  const hovering = inHand(hoverId);
  const previewIds = selected.length > 0 ? selected : hovering ? [hoverId] : [];
  const preview = previewPlay(run, previewIds, wildSuits);
  // The descriptive preview behaves like a tooltip: it shows ONLY while the pointer is over a card, so
  // it never sits parked over the hand blocking other cards once you've selected a combo. The Play/Clear
  // controls live in a separate compact bar that persists as long as a selection exists.
  const showInfo = !defend && hovering && previewIds.length > 0;
  const showActions = !defend && selected.length > 0;
  const intent = enemyIntent(run);
  // Selected cards that need a play-time suit choice (Wildcard sigil).
  const wildcards = run.hand.filter((c) => selected.includes(c.id) && (c.sigils ?? []).includes("wildcard"));
  const immuneSuit = combat.enemy.suit;
  const immuneShown =
    !combat.enemy.immunityCancelled &&
    previewIds.some((id) => run.hand.find((c) => c.id === id)?.suit === immuneSuit);
  // Only surface the suit power(s) of the card(s) being previewed — not the whole key.
  const previewSuits = SUIT_KEYS.filter((s) =>
    previewIds.some((id) => run.hand.find((c) => c.id === id)?.suit === s),
  );
  // Sidebar read-outs: the previewed play's Fighting Style (Balatro's hand-type read-out), the royal's
  // HP, and the act/stage.
  const previewCards = run.hand.filter((c) => previewIds.includes(c.id));
  const style = styleOf(previewCards);
  const styleLvl = run.styleLevels[style.size] ?? 0;
  const styleBonus = styleLvl * (FIGHTING_STYLE_PER_LEVEL[style.size] ?? 0);
  const enemyHp = Math.max(0, combat.enemy.maxHealth - combat.enemy.damageTaken);
  const ACT_NAME: Record<string, string> = { jack: "I · Jacks", queen: "II · Queens", king: "III · Kings" };

  // The board fills the screen; everything else floats over it. Empty overlay areas let pointer
  // events fall through to the canvas (so dragging cards still works).
  return (
    <div className="screen combat">
      {/* Left chrome column (Balatro-style): run/royal state, the play preview, jesters & guild. */}
      <aside className="combat-sidebar" aria-label="Run & royal state">
        {/* The opponent — Balatro's "blind", on the left. */}
        <div className="cs-panel cs-royal">
          <div className="cs-royal-badge" style={{ background: SUIT_TINT[combat.enemy.suit] }}>
            <span className="cs-royal-crown">♛</span>
            <span className="cs-royal-suit">{GLYPH[combat.enemy.suit]}</span>
          </div>
          <div className="cs-royal-body">
            <div className="cs-royal-name">{combat.enemy.tier.toUpperCase()}</div>
            <div className="cs-hp" data-tip="The royal's remaining health">
              <div className="cs-hp-fill" style={{ width: `${(enemyHp / combat.enemy.maxHealth) * 100}%` }} />
              <span className="cs-hp-text">{enemyHp} / {combat.enemy.maxHealth}</span>
            </div>
            <div className="cs-royal-tags">
              <span className="cs-disable" style={{ color: SUIT_TINT[combat.enemy.suit] }} data-tip={`This royal disables the ${SUIT_NAME[combat.enemy.suit]} power`}>
                ⊘ {GLYPH[combat.enemy.suit]} {SUIT_NAME[combat.enemy.suit]}
              </span>
            </div>
            {intent && (
              <span className={`intent-strike ${intent.enraged ? "enraged" : ""}`} role="status" data-tip="What the royal will strike for if it survives your turn">
                {intent.enraged ? "🔥 " : ""}⚔ Next strike {intent.incoming}
                {intent.ignoresShield ? " ⊘shield" : ""}
              </span>
            )}
            {intent?.decrees.map((d, i) => (
              <span key={i} className="decree-pill" data-tip={d.text ?? undefined}>
                ⚜ {d.name}
                {d.note ? ` · ${d.note}` : ""}
              </span>
            ))}
          </div>
        </div>

        {!combat.outcome && (
          <div className={`cs-panel cs-turn turn-banner ${defend ? "defend" : "play"}`} role="status">
            {defend ? `⚔ DEFEND — block ${combat.incoming}` : "★ YOUR MOVE"}
          </div>
        )}

        {/* Fighting Style indicator + a box per suit effect — always present; only the values change
            as you hover/select cards. Each box is coloured after the suit that grants the effect
            (Clubs → Damage, Spades → Block, Diamonds → Draw, Hearts → Heal). */}
        <div className="cs-style">
          <div className={`cs-style-name${previewIds.length > 0 && !preview.valid ? " illegal" : ""}`} data-tip="Your Fighting Style scales with the number of cards played; level it up with Drills">
            {previewIds.length > 0 && !preview.valid ? (
              <span className="cs-style-warn-icon" aria-hidden="true">⊘</span>
            ) : (
              <StyleSprite id={style.size} size={30} />
            )}
            <div className="cs-style-text">
              {previewIds.length === 0 ? (
                <>
                  <strong>Fighting Style</strong>
                  <em>hover or select cards</em>
                </>
              ) : preview.valid ? (
                <>
                  <strong>{`${FIGHTING_STYLE_NAME[style.size]}${style.mounted ? " · Mounted" : ""}`}</strong>
                  <em>{`Lv ${styleLvl + 1}${styleBonus > 0 ? ` · +${styleBonus} to effects` : ""}`}</em>
                </>
              ) : (
                <>
                  <strong>Illegal hand</strong>
                  <em className="cs-style-warn">{preview.reason}</em>
                </>
              )}
            </div>
          </div>
          {!defend && (
            <div className="cs-actions">
              <button type="button" className="ca-play" disabled={selected.length === 0 || !preview.valid} onClick={() => playCards()}>
                Play ▸
              </button>
              {selected.length > 0 && (
                <button type="button" className="ca-clear" onClick={clearSelect}>Clear</button>
              )}
            </div>
          )}
          <div className="cs-effects">
            <div className={`cs-fx s-C ${preview.damage > 0 ? "" : "zero"}`}><span>♣ Damage</span><b>{preview.damage}</b></div>
            <div className={`cs-fx s-S ${preview.shield > 0 ? "" : "zero"}`}><span>♠ Block</span><b>{preview.shield}</b></div>
            <div className={`cs-fx s-D ${preview.draw > 0 ? "" : "zero"}`}><span>♦ Draw</span><b>{preview.draw}</b></div>
            <div className={`cs-fx s-H ${preview.heal > 0 ? "" : "zero"}`}><span>♥ Heal</span><b>{preview.heal}</b></div>
          </div>
        </div>

        {/* Run state — each readout is its own box. */}
        <div className="cs-statgrid">
          <div className="cs-panel cs-stat"><span>Gold</span><b className="gold">◆ {run.gold}</b></div>
          <div className="cs-panel cs-stat"><span>Round</span><b>{Math.min(run.enemyIndex + 1, run.castle.length)}/{run.castle.length}</b></div>
          <div className="cs-panel cs-stat"><span>Stage</span><b>{ACT_NAME[combat.enemy.tier] ?? combat.enemy.tier}</b></div>
          <div className="cs-panel cs-stat"><span>Hand</span><b>{run.hand.length}/{currentHandMax(run)}</b></div>
          {upgText && <div className="cs-panel cs-stat"><span>Trained</span><b className="upg">{upgText}</b></div>}
        </div>
        <div className="cs-panel cs-sort" data-tip="Re-order your hand">
          <span className="cs-sort-label">Sort Hand</span>
          <div className="cs-sort-btns">
            <button type="button" onClick={() => sortHand("rank")}>Rank</button>
            <button type="button" onClick={() => sortHand("suit")}>Suit</button>
          </div>
        </div>
        <button type="button" className="cs-runinfo cs-panel" data-tip="Run info — fighting styles, opponents, edicts & stake (M)" onClick={() => useGame.getState().setMapOpen(true)}>
          ⌖ Run Info
        </button>
        <div className="cs-footer">
          <button type="button" className="cs-options cs-panel" data-tip="Pause — rules, settings, save &amp; quit" onClick={() => useGame.getState().setPaused(true)}>
            ⚙ Options
          </button>
          <MuteButton />
        </div>
      </aside>

      {/* The felt: the Pixi board fills this column; controls overlay it. */}
      <div className="combat-field">
        <PixiBoard />
        <div className="combat-ui">
          {/* Jokers (guild) fill the top-left; consumables sit at the top-right (clear of the corner
              mute/gear). The royal moved to the sidebar, so the whole top band is free for these.
              Each zone is labelled with a Balatro-style "x / max" count so the area reads as a
              reserved rack even before anything is bought. */}
          <div className="field-top">
            <div className="field-zone field-jokers-zone" aria-label="Your jokers">
              <div className="field-jokers">
                {run.slots.map((id) => {
                  const j = jokerById(id);
                  if (!j) return null;
                  const ed = run.slotEditions?.[id];
                  return (
                    <div key={id} className="field-joker" data-tip={`${j.name}${ed ? ` (${ed})` : ""} — ${j.text}`} data-tip-type="joker">
                      <JokerArt id={j.id} art={j.art} size={92} />
                      {ed && <span className={`ed-badge ed-${ed}`} aria-hidden="true" />}
                    </div>
                  );
                })}
              </div>
              <span className="zone-count" data-tip="Guild members (jokers) — buy them from packs">{run.slots.length}/{maxSlots(run)}</span>
            </div>
            {!combat.outcome && (
              <div className="field-zone field-pouch-zone" aria-label="Your pouch">
                <div className="field-consumables">
                  <HeldTray context="combat" />
                </div>
                <span className="zone-count" data-tip="Pouch — held tarots & spectral cards">{run.held.length}/{heldMax(run)}</span>
              </div>
            )}
          </div>

          {/* Your block — a purple shield box in front of the player (centre, above the hand). */}
          {combat.enemy.shield > 0 && (
            <div className="player-block" data-tip="Your block — soaks the royal's next strike (stacks)">
              <svg className="player-block-icon" viewBox="0 0 40 46" aria-hidden="true">
                <path d="M20 2 L37 8 V23 C37 34 29 41 20 44 C11 41 3 34 3 23 V8 Z" />
              </svg>
              <span>Block <b>{combat.enemy.shield}</b></span>
            </div>
          )}

          {!combat.outcome && pendingPick && (
            <div className="ov-pick" role="status">
              <span>{pickLabel ?? "Tap a card"}</span>
              <button type="button" onClick={() => useGame.getState().setPendingPick(null)}>
                Cancel
              </button>
            </div>
          )}

          {!combat.outcome &&
            (defend ? (
            <div className="ov-prompt defend">
              <div className="prompt-title">
                ⚔ Block {combat.incoming} <span className="dim">— thrown {total}</span>
              </div>
              <div className="actions">
                <button type="button" onClick={autoSelect}>Auto</button>
                <button type="button" className="primary" disabled={!enough} onClick={() => discardSelected()}>
                  Block ({total}/{combat.incoming})
                </button>
              </div>
            </div>
          ) : (
            <div className="ov-bottom">
              {/* Card power preview — a hover tooltip near the hand (NOT the sidebar). */}
              {showInfo && (
                <div className="action-pop info">
                  {previewSuits.length > 0 && (
                    <div className="legend">
                      {previewSuits.map((s) => (
                        <span key={s}>
                          <i className={SUIT_EFFECT[s].cls}>{SUIT_EFFECT[s].glyph}</i> {SUIT_EFFECT[s].label}
                        </span>
                      ))}
                    </div>
                  )}
                  {preview.valid ? (
                    <>
                      {immuneShown && (
                        <div className="immune-warn">
                          ⊘ Disables {GLYPH[immuneSuit]} {SUIT_NAME[immuneSuit]} — that power won&apos;t trigger
                        </div>
                      )}
                      <div className="preview-nums">
                        {preview.damage > 0 && <span className="dmg">⚔ {preview.damage}</span>}
                        {preview.heal > 0 && <span className="heal">♥ {preview.heal}</span>}
                        {preview.draw > 0 && <span className="draw">♦ {preview.draw}</span>}
                        {preview.shield > 0 && <span className="shield">🛡 {preview.shield}</span>}
                      </div>
                      {preview.trace.length > 0 && (
                        <ul className="trace">
                          {preview.trace.map((t, i) => (
                            <li key={i} className={t.includes(": ") ? "buff" : ""}>
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <span className="error">{preview.reason}</span>
                  )}
                </div>
              )}
              {showActions && wildcards.length > 0 && (
                <div className="wild-pick">
                  {wildcards.map((c) => (
                    <div key={c.id} className="wild-row">
                      <span className="wild-label">★ Wildcard {c.value > 1 ? c.value : "A"} — play as:</span>
                      {(["H", "D", "C", "S"] as Suit[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`wild-suit ${(wildSuits[c.id] ?? c.suit) === s ? "on" : ""} ${s === "H" || s === "D" ? "red" : "dark"}`}
                          onClick={() => setWildSuit(c.id, s)}
                        >
                          {GLYPH[s]}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {/* Play / Sort / Clear live in the sidebar now; the felt just hints the controls. */}
              {previewIds.length === 0 && (
                <span className="ov-hint">Drag a card up to play · tap to build a combo · hover to inspect</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Held tarots (consumable pouch) — usable in the shop OR mid-combat. */
function HeldTray({ context }: { context: "shop" | "combat" }) {
  const run = useGame((s) => s.run);
  const held = run.held;
  const use = (instanceId: string, tarotId: string) => {
    const t = tarotById(tarotId);
    if (!t) return;
    const g = useGame.getState();
    if (t.target) {
      // Needs a target card: in the shop pick from the deck modal; in combat tap a hand card.
      g.setPendingPick((cardId) => g.dispatch({ type: "useHeld", instanceId, targetCardId: cardId }), `Use ${t.name} on a card`);
      if (context === "shop") g.setPileModal("all");
    } else {
      sfx.buy();
      g.dispatch({ type: "useHeld", instanceId });
    }
  };
  return (
    <div className={`held-tray ${context}`} aria-label="Consumable pouch">
      <span className="held-label" data-tip="Held tarots — use them in the shop or mid-fight">⚗ {held.length}/{heldMax(run)}</span>
      {held.length === 0 && <span className="hint">empty pouch</span>}
      {held.map((h) => {
        const t = tarotById(h.tarotId);
        if (!t) return null;
        return (
          <button key={h.id} type="button" className="held-item" data-tip={`${t.name} — ${t.text}`} data-tip-type="tarot" onClick={() => use(h.id, h.tarotId)}>
            <TarotArt id={h.tarotId} art={t.art} size={context === "combat" ? 92 : 26} />
            <span className="held-name">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShopScreen() {
  const { run, dispatch } = useGame();
  const owned = run.slots;

  const sellJoker = (id: string) => {
    sfx.coin();
    dispatch({ type: "sellJoker", jokerId: id });
  };

  // The shop overlays the SAME battle screen: the felt stays exactly as it is, a tray slides up over
  // it carrying the offerings + reroll/remove/next-fight controls (all in ShopBoard's Pixi tray), the
  // jokers/pouch band stays up top, and the sidebar shows a big animated SHOP sign (Balatro-style).
  return (
    <div className="screen combat shop-overlay">
      <aside className="combat-sidebar" aria-label="The Black Market">
        <div className="shop-sign cs-flip" aria-label="Shop — open">
          <span className="shop-sign-text">SHOP</span>
          <span className="shop-sign-open">◆ OPEN ◆</span>
        </div>

        <div className="cs-statgrid cs-flip">
          <div className="cs-panel cs-stat"><span>Gold</span><b className="gold">◆ {run.gold}</b></div>
          <div className="cs-panel cs-stat"><span>Round</span><b>{Math.min(run.enemyIndex + 1, run.castle.length)}/{run.castle.length}</b></div>
        </div>

        <button type="button" className="cs-runinfo cs-panel" data-tip="The Descent — every royal, decrees & run state (M)" onClick={() => useGame.getState().setMapOpen(true)}>
          ⌖ Run Info
        </button>

        <div className="cs-footer">
          <button type="button" className="cs-options cs-panel" data-tip="Pause — rules, settings, save &amp; quit" onClick={() => useGame.getState().setPaused(true)}>
            ⚙ Options
          </button>
          <MuteButton />
        </div>
      </aside>

      <div className="combat-field">
        <ShopBoard />
        <div className="combat-ui">
          <div className="field-top">
            <div className="field-zone field-jokers-zone" aria-label="Your jokers — click to sell">
              <div className="field-jokers">
                {owned.map((id) => {
                  const j = jokerById(id);
                  if (!j) return null;
                  const ed = run.slotEditions?.[id];
                  return (
                    <button key={id} type="button" className="field-joker field-joker-sell" data-tip={`${j.name}${ed ? ` (${ed})` : ""} — ${j.text} · Click to sell ◆${j.sellValue}`} data-tip-type="joker" onClick={() => sellJoker(id)}>
                      <JokerArt id={j.id} art={j.art} size={92} />
                      {ed && <span className={`ed-badge ed-${ed}`} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <span className="zone-count">{owned.length}/{maxSlots(run)}</span>
            </div>
            <div className="field-zone field-pouch-zone" aria-label="Your pouch">
              <div className="field-consumables">
                <HeldTray context="combat" />
              </div>
              <span className="zone-count">{run.held.length}/{heldMax(run)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventScreen() {
  const { run, dispatch } = useGame();
  const event = eventById(run.eventId);
  if (!event) return null;
  return (
    <div className="screen event">
      <div className="event-card">
        <div className="event-banner">⚜ A Court Event ⚜</div>
        <h2>{event.title}</h2>
        <p className="event-text">{event.text}</p>
        <div className="event-options">
          {event.options.map((o) => {
            const cannot = o.cost != null && run.gold < o.cost;
            return (
              <button
                key={o.id}
                type="button"
                className="event-option"
                disabled={cannot}
                onClick={() => {
                  sfx.select();
                  dispatch({ type: "eventChoice", optionId: o.id });
                }}
              >
                <span className="eo-label">{o.label}</span>
                <span className="eo-desc">{o.desc}</span>
                {cannot && <span className="eo-cant">Not enough gold</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TitleScreen() {
  const [overlay, setOverlay] = useState<null | "setup" | "settings" | "past" | "collection">(null);
  const canContinue = hasSavedRun();

  return (
    <div className="screen title">
      <h1>Cull the Crown</h1>

      <div className="menu-panel main-menu">
        <div className="menu-list">
          <button type="button" className="primary" onClick={() => setOverlay("setup")}>
            {canContinue ? "▸ Play" : "⚔ New Run"}
          </button>
          <button type="button" onClick={() => setOverlay("collection")}>
            📖 Compendium
          </button>
          <button type="button" onClick={() => setOverlay("past")}>
            📜 Past runs
          </button>
          <button type="button" onClick={() => setOverlay("settings")}>
            ⚙ Settings
          </button>
        </div>
      </div>
      <p className="fineprint">
        An original mechanics-only mashup (working title). Combat adapts Regicide by Paul Abrahams,
        Luke Badger &amp; Andy Richdale (Badgers from Mars, CC&nbsp;BY). Roguelike structure inspired
        by Balatro. No publisher art or branding.
      </p>
      {overlay === "setup" && <RunSetup onClose={() => setOverlay(null)} />}
      {overlay === "settings" && <SettingsMenu onClose={() => setOverlay(null)} />}
      {overlay === "past" && <PastRunsOverlay onClose={() => setOverlay(null)} />}
      {overlay === "collection" && <Collection onClose={() => setOverlay(null)} />}
    </div>
  );
}

function EndScreen() {
  const { run, newRun, saveAndQuit } = useGame();
  const s = runSummary(run);
  const won = run.phase === "won";
  return (
    <div className="screen end">
      <h1 className={won ? "win" : "lose"}>{won ? "The Crown is Culled" : "Your Run Ends"}</h1>
      {run.notice && <p className="notice">{run.notice}</p>}
      <ul className="summary">
        <li>Seed: {s.seed}</li>
        <li>Royals defeated: {s.royalsDefeated} / {s.totalRoyals}</li>
        <li>Exact kills: {s.exactKills}</li>
        <li>Gold earned: {s.goldEarned}</li>
        <li>Guild: {s.jokers.length ? s.jokers.map((id) => jokerById(id)?.name).join(", ") : "none"}</li>
      </ul>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button type="button" className="primary" onClick={() => newRun("")}>
          New run
        </button>
        <button type="button" onClick={() => saveAndQuit()}>
          Main menu
        </button>
      </div>
    </div>
  );
}

/** Toggles all synthesised audio (score + SFX). Clicking also satisfies the autoplay gesture. */
function MuteButton() {
  const [muted, setMuted] = useState(audio.muted);
  return (
    <button
      type="button"
      className="mute-btn"
      data-tip={muted ? "Sound off — click to enable" : "Mute sound"}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        const next = !muted;
        audio.setMuted(next);
        music.start(); // ensure the audio clock is running (and resumed) on this gesture
        if (!next) sfx.select(); // a confirming blip when turning sound on
        setMuted(next);
      }}
    >
      {muted ? "🔇" : "♪"}
    </button>
  );
}

export default function App() {
  const phase = useGame((s) => s.run.phase);
  const paused = useGame((s) => s.paused);
  const [help, setHelp] = useState(false);

  // A soft generic click on every button press (layered under any specific sound for that button).
  // Capture phase so modals that stopPropagation on their content (settings/pause/menu panels) still
  // trigger it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("button")) sfx.click();
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  // Swap the score to match the screen: a calm menu loop, a driving combat loop, a warm shop loop.
  useEffect(() => {
    music.setTrack(phase === "combat" || phase === "event" ? "combat" : phase === "shop" ? "shop" : "menu");
  }, [phase]);

  // Start the music on the first user gesture (browsers block audio before one). Harmless if muted.
  useEffect(() => {
    const go = () => {
      if (!audio.muted) music.start();
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
    window.addEventListener("pointerdown", go);
    window.addEventListener("keydown", go);
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
    };
  }, []);

  // Show the tutorial automatically the first time someone plays.
  useEffect(() => {
    try {
      if (!localStorage.getItem("ctc_help_seen")) {
        setHelp(true);
        localStorage.setItem("ctc_help_seen", "1");
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const st = useGame.getState();
      const r = st.run;
      if (ev.target instanceof HTMLInputElement) return;
      // While paused the game is frozen — Esc resumes, everything else is swallowed.
      if (st.paused) {
        if (ev.key === "Escape") st.setPaused(false);
        return;
      }
      const key = ev.key.toLowerCase();
      // The Descent overview map is modal: toggle with M, close with Esc, swallow other keys.
      if (st.mapOpen) {
        if (ev.key === "Escape" || key === "m") useGame.getState().setMapOpen(false);
        return;
      }
      if (key === "m" && (r.phase === "combat" || r.phase === "shop")) {
        useGame.getState().setMapOpen(true);
        return;
      }
      if (r.phase === "combat" && r.combat) {
        if (r.combat.subphase === "play") {
          if (ev.key === "Enter") {
            if (previewPlay(r, st.selected).valid) st.playCards();
          } else if (ev.key.toLowerCase() === "y" && !r.combat.yieldedLastTurn) {
            st.yieldTurn();
          } else if (ev.key === "Escape") {
            st.clearSelect();
          }
        } else if (r.combat.subphase === "defend" && ev.key === "Enter") {
          const total = r.hand.filter((c) => st.selected.includes(c.id)).reduce((a, c) => a + c.value, 0);
          if (total >= r.combat.incoming) st.discardSelected();
        }
      } else if ((r.phase === "won" || r.phase === "lost") && (ev.key === "Enter" || ev.key.toLowerCase() === "n")) {
        st.newRun("");
      } else if ((r.phase === "shop" || r.phase === "combat") && ev.key === "Escape") {
        st.setPendingPick(null);
      } else if (r.phase === "event") {
        const evt = eventById(r.eventId);
        const n = parseInt(key, 10);
        if (evt && n >= 1 && n <= evt.options.length) {
          const o = evt.options[n - 1];
          if (!(o.cost != null && r.gold < o.cost)) st.dispatch({ type: "eventChoice", optionId: o.id });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useGame((s) => s.run);
  let body;
  if (phase === "title") body = <TitleScreen />;
  else if (phase === "combat") body = <CombatScreen />;
  else if (phase === "shop") body = <ShopScreen />;
  else if (phase === "event") body = <EventScreen />;
  else body = <EndScreen />;

  return (
    <div className="app">
      {run.notice && phase !== "won" && phase !== "lost" && (
        <div className="toast" role="status">
          {run.notice}
        </div>
      )}
      {body}
      {/* Combat & shop carry Options + Mute in their sidebar footer; the corner buttons serve only the
          screens without a sidebar (title, event, end). */}
      {phase !== "combat" && phase !== "shop" && <MuteButton />}
      {phase === "event" && (
        <button
          type="button"
          className="gear-btn"
          data-tip="Pause — rules, settings, save &amp; quit"
          onClick={() => useGame.getState().setPaused(true)}
          aria-label="Pause"
        >
          ⚙
        </button>
      )}
      <TransitionLayer />
      <TooltipLayer />
      <CombatGate />
      <PackModal />
      <DeckModal />
      <DeckPeek />
      <RunMap />
      {paused && <PauseMenu />}
      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      <div className="crt" aria-hidden="true" />
    </div>
  );
}
