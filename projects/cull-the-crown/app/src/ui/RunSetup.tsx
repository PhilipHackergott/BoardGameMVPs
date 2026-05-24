import { useState } from "react";
import { useGame, hasSavedRun, savedRunSummary, isDeckUnlocked, maxStakeUnlocked } from "./store";
import { DECK_LIBRARY, STAKE_IDS, STAKE_INFO, deckById } from "../engine/index";
import { sfx } from "../audio/chiptune";
import { DeckArt } from "./CardArt";

// The run-setup overlay — Balatro's New Run / Continue / Challenges flow, re-skinned in Cull the
// Crown's palette. Opened from the main menu's "New Run". Holds the deck/stake/seed choice and starts
// (or resumes) a run; "Back" returns to the menu. The deck & stake are carousels flanked by arrows,
// with a vertical stake-ladder column and a row of position dots, mirroring Balatro's layout.

type Tab = "new" | "continue" | "challenges";

export default function RunSetup({ onClose }: { onClose: () => void }) {
  const newRun = useGame((s) => s.newRun);
  const continueRun = useGame((s) => s.continueRun);
  const canContinue = hasSavedRun();
  const saved = canContinue ? savedRunSummary() : null;
  const [tab, setTab] = useState<Tab>(canContinue ? "continue" : "new");
  const [deckIdx, setDeckIdx] = useState(0);
  const [stakeIdx, setStakeIdx] = useState(0);
  const [seeded, setSeeded] = useState(false);
  const [seed, setSeed] = useState("");

  const deck = DECK_LIBRARY[deckIdx];
  const deckUnlocked = isDeckUnlocked(deck);
  const maxStake = maxStakeUnlocked();
  const stake = STAKE_INFO[STAKE_IDS[stakeIdx]];

  const cycleDeck = (dir: number) => {
    sfx.leaf();
    setDeckIdx((i) => (i + dir + DECK_LIBRARY.length) % DECK_LIBRARY.length);
  };
  const cycleStake = (dir: number) => {
    sfx.leaf();
    setStakeIdx((i) => Math.max(0, Math.min(maxStake, i + dir)));
  };

  const play = () => {
    if (!deckUnlocked) return;
    sfx.buy();
    newRun(seeded ? seed : "", deck.id, STAKE_IDS[stakeIdx]);
  };
  const resume = () => {
    sfx.buy();
    continueRun();
  };

  return (
    <div className="help-backdrop setup-backdrop" role="dialog" aria-modal="true" aria-label="New run setup" onClick={onClose}>
      <div className="setup-panel" onClick={(e) => e.stopPropagation()}>
        <div className="setup-tabs">
          <button type="button" className={`setup-tab ${tab === "new" ? "on" : ""}`} onClick={() => setTab("new")}>
            New Run
          </button>
          <button
            type="button"
            className={`setup-tab ${tab === "continue" ? "on" : ""}`}
            disabled={!canContinue}
            onClick={() => setTab("continue")}
          >
            Continue
          </button>
          <button type="button" className="setup-tab" disabled data-tip="No challenges yet">
            Challenges
          </button>
        </div>

        {tab === "continue" ? (
          <div className="setup-body">
            {saved ? (
              <>
                <div className="setup-deck-row">
                  <div className="setup-deck">
                    <DeckArt id={saved.deckId} />
                    <div className="setup-info">
                      <div className="setup-info-name">{deckById(saved.deckId)?.name ?? "Run in progress"}</div>
                      <dl className="setup-stats">
                        <div>
                          <dt>Royal</dt>
                          <dd>{saved.royal} / {saved.total}</dd>
                        </div>
                        <div>
                          <dt>Gold</dt>
                          <dd>◆ {saved.gold}</dd>
                        </div>
                        <div>
                          <dt>Seed</dt>
                          <dd>{saved.seed}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
                <button type="button" className="setup-play" onClick={resume}>
                  CONTINUE
                </button>
              </>
            ) : (
              <p className="setup-empty">No run in progress.</p>
            )}
          </div>
        ) : tab === "challenges" ? (
          <div className="setup-body">
            <p className="setup-empty">No challenges yet — coming in a later update.</p>
          </div>
        ) : (
          <div className="setup-body">
            {/* Deck carousel */}
            <div className="setup-deck-row">
              <button type="button" className="setup-arrow" onClick={() => cycleDeck(-1)} aria-label="Previous deck">
                ‹
              </button>
              <div className={`setup-deck ${deckUnlocked ? "" : "locked"}`}>
                <DeckArt id={deck.id} locked={!deckUnlocked} />
                <div className="setup-info">
                  <div className="setup-info-name">{deck.name}</div>
                  {deckUnlocked ? (
                    <ul className="setup-info-text">
                      {deck.text.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="setup-info-locked">🔒 Win a run with {deckById(deck.unlock)?.name ?? "another deck"} to unlock.</div>
                  )}
                </div>
              </div>
              <div className="setup-stakecol" aria-hidden="true">
                {STAKE_IDS.map((id, i) => (
                  <span
                    key={id}
                    className={i <= stakeIdx ? "on" : ""}
                    style={i <= stakeIdx ? { background: STAKE_INFO[id].color } : undefined}
                  />
                ))}
              </div>
              <button type="button" className="setup-arrow" onClick={() => cycleDeck(1)} aria-label="Next deck">
                ›
              </button>
            </div>
            <div className="setup-dots">
              {DECK_LIBRARY.map((_, i) => (
                <span key={i} className={i === deckIdx ? "on" : ""} />
              ))}
            </div>

            {/* Stake carousel */}
            <div className="setup-stake-row">
              <span className="setup-stake-label">Stake</span>
              <button type="button" className="setup-arrow sm" onClick={() => cycleStake(-1)} disabled={stakeIdx <= 0} aria-label="Lower stake">
                ‹
              </button>
              <div className="setup-stake">
                <span className="setup-stake-chip" style={{ background: stake.color }} aria-hidden="true" />
                <div className="setup-info">
                  <div className="setup-info-name">{stake.name}</div>
                  <div className="setup-info-text single">{stake.text}</div>
                </div>
              </div>
              <button type="button" className="setup-arrow sm" onClick={() => cycleStake(1)} disabled={stakeIdx >= maxStake} aria-label="Higher stake">
                ›
              </button>
            </div>

            {/* Seeded toggle + Play */}
            <div className="setup-foot">
              <label className="setup-seeded">
                <input type="checkbox" checked={seeded} onChange={(e) => setSeeded(e.target.checked)} />
                <span>Seeded Run</span>
              </label>
              {seeded && (
                <input
                  className="setup-seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="enter seed"
                  aria-label="Seed"
                />
              )}
              <button type="button" className="setup-play" disabled={!deckUnlocked} onClick={play}>
                PLAY
              </button>
            </div>
          </div>
        )}

        <button type="button" className="setup-back" onClick={onClose}>
          Back
        </button>
      </div>
    </div>
  );
}
