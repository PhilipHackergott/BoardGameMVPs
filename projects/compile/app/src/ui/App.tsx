import { useEffect, useMemo, useRef, useState } from "react";
import {
  AITier,
  CARD_DEFS,
  CardInstance,
  CardDef,
  ProtocolName,
  Side,
  compilableLines,
  getDef,
  legalActions,
  lineValue,
  opponent,
  protocolDefIds,
} from "../engine";
import { useGame, SetupOpts } from "./store";
import { NeonBackground } from "../render/neonBackground";
import { ParticleLayer } from "../render/particles";
import { PLAYER_NEON, PROTO_COLORS, PROTO_VERBS } from "../render/theme";
import { PROTOCOLS } from "../engine";

// --- Animated backdrop + particle layer (mounted once, behind everything) ---------------------

let particleLayer: ParticleLayer | null = null;
export function fireBurst(x: number, y: number, rgb: [number, number, number], count = 30, power = 1): void {
  particleLayer?.burst(x, y, rgb, count, power);
}

function Backdrop() {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const pRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const bg = new NeonBackground(bgRef.current!);
    const pl = new ParticleLayer(pRef.current!);
    particleLayer = pl;
    const onResize = () => {
      bg.resize();
      pl.resize();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      bg.destroy();
      pl.destroy();
      particleLayer = null;
    };
  }, []);
  return (
    <>
      <canvas ref={bgRef} className="bg-canvas" />
      <canvas ref={pRef} className="fx-canvas" />
    </>
  );
}

// --- Setup screen -----------------------------------------------------------------------------

function Setup() {
  const setup = useGame((s) => s.setup);
  const setOverlay = useGame((s) => s.setOverlay);
  const [mode, setMode] = useState<"hotseat" | "ai">("ai");
  const [tier, setTier] = useState<AITier>("medium");
  const [useControl, setUseControl] = useState(true);

  function start() {
    const opts: SetupOpts = { mode, aiTier: tier, useControl };
    setup(opts);
  }

  return (
    <div className="screen center">
      <h1 className="logo glitch" data-text="COMPILE">
        COMPILE
      </h1>
      <p className="tagline">
        Two rogue AIs race to rewrite reality. Draft three protocols, out-value your rival across the
        three lines, and <span className="hl">compile</span> all three to win.
      </p>

      <div className="setup-grid">
        <div className="setup-block">
          <h3>Opponent</h3>
          <div className="seg">
            <button className={mode === "ai" ? "on" : ""} onClick={() => setMode("ai")}>
              VS AI
            </button>
            <button className={mode === "hotseat" ? "on" : ""} onClick={() => setMode("hotseat")}>
              HOT-SEAT
            </button>
          </div>
        </div>

        {mode === "ai" && (
          <div className="setup-block">
            <h3>AI Difficulty</h3>
            <div className="seg">
              {(["easy", "medium", "hard"] as AITier[]).map((t) => (
                <button key={t} className={tier === t ? "on" : ""} onClick={() => setTier(t)}>
                  {t === "easy" ? "NOVICE" : t === "medium" ? "ADEPT" : "OVERMIND"}
                </button>
              ))}
            </div>
            <p className="fine">
              {tier === "easy"
                ? "Makes mistakes. Plays loose."
                : tier === "medium"
                  ? "Plans one turn ahead. Solid."
                  : "Searches hard, punishes threats. Brutal."}
            </p>
          </div>
        )}

        <div className="setup-block">
          <h3>Control Component</h3>
          <div className="seg">
            <button className={useControl ? "on" : ""} onClick={() => setUseControl(true)}>
              ON
            </button>
            <button className={!useControl ? "on" : ""} onClick={() => setUseControl(false)}>
              OFF
            </button>
          </div>
          <p className="fine">Off = the simpler “first game” rules (no control / rearrange).</p>
        </div>
      </div>

      <button className="primary big" onClick={start}>
        ▶ INITIALIZE
      </button>
      <div className="menu-links">
        <button className="ghost" onClick={() => setOverlay("tutorial")}>
          ❔ HOW TO PLAY
        </button>
        <button className="ghost" onClick={() => setOverlay("codex")}>
          ▦ CARD CODEX
        </button>
      </div>
      <p className="fine dim">
        ⚠ Card effects are placeholder stand-ins (the rulebook PDF has no card texts). The full rules
        system, draft, control, compile and AI are real — drop in the published card data for 1:1.
      </p>
    </div>
  );
}

// --- Draft screen -----------------------------------------------------------------------------

function ProtocolCardPreview({ proto, onPick, pickable }: { proto: (typeof PROTOCOLS)[number]; onPick?: () => void; pickable: boolean }) {
  const c = PROTO_COLORS[proto];
  return (
    <button
      className="proto-card"
      disabled={!pickable}
      onClick={onPick}
      style={{ ["--neon" as string]: c.hex, ["--neon-lite" as string]: c.lite }}
    >
      <div className="proto-name">{proto.toUpperCase()}</div>
      <div className="proto-verbs">{PROTO_VERBS[proto]}</div>
      <div className="proto-values">
        {[0, 1, 2, 3, 4, 5].map((v) => (
          <span key={v} className="pv">
            {CARD_DEFS[`${proto}-${v}`].value}
          </span>
        ))}
      </div>
    </button>
  );
}

function Draft() {
  const engine = useGame((s) => s.engine)!;
  const draftPick = useGame((s) => s.draftPick);
  const draftThinking = useGame((s) => s.draftThinking);
  useGame((s) => s.rev); // subscribe
  const state = engine.state;
  const d = state.draft!;
  const turn = d.step < d.order.length ? d.order[d.step] : null;
  const drafter = turn ? state.players[turn.side] : null;
  const human = drafter && !drafter.isAI;
  const last = engine.lastDraftPick;

  return (
    <div className="screen">
      <h2 className="section">DRAFT // SELECT PROTOCOLS</h2>
      <div className="draft-status">
        {drafter ? (
          <>
            <span style={{ color: PLAYER_NEON[turn!.side] }}>{drafter.name}</span> drafts —{" "}
            {human ? "pick a protocol" : <span className="blink">analyzing…</span>} ({turn!.count} left this step)
          </>
        ) : (
          "Compiling decks…"
        )}
        {last && draftThinking === false && !human && (
          <span className="draft-pick-flash" style={{ color: PROTO_COLORS[last.protocol].hex }}>
            {" "}
            ▸ {state.players[last.side].name} took {last.protocol.toUpperCase()}
          </span>
        )}
      </div>

      <div className={`draft-pool ${draftThinking ? "ai-busy" : ""}`}>
        {d.pool.map((proto) => (
          <ProtocolCardPreview
            key={proto}
            proto={proto}
            pickable={!!human}
            onPick={() => human && draftPick(proto)}
          />
        ))}
      </div>

      <div className="draft-tray">
        {([0, 1] as Side[]).map((side) => (
          <div key={side} className={`tray-col ${turn && turn.side === side ? "drafting" : ""}`}>
            <div className="tray-head" style={{ color: PLAYER_NEON[side] }}>
              {state.players[side].name}
              {turn && turn.side === side && <span className="tray-turn"> ◂ drafting</span>}
            </div>
            <div className="tray-cards">
              {state.players[side].protocols.map((slot, i) => {
                const filled = d.assigned[side] > i;
                const justPicked = filled && last?.side === side && d.assigned[side] - 1 === i;
                return filled ? (
                  <span
                    key={`${slot.protocol}-${i}`}
                    className={`tray-proto ${justPicked ? "just-picked" : ""}`}
                    style={{ color: PROTO_COLORS[slot.protocol].hex }}
                  >
                    {slot.protocol}
                  </span>
                ) : (
                  <span key={`e-${i}`} className="tray-proto empty">
                    —
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Board pieces -----------------------------------------------------------------------------

function MiniCard({ ci, uncovered, highlight, onClick }: { ci: CardInstance; uncovered: boolean; highlight?: boolean; onClick?: () => void }) {
  const def = getDef(ci.defId);
  const c = PROTO_COLORS[ci.protocol];
  return (
    <div
      className={`mini ${ci.faceUp ? "up" : "down"} ${uncovered ? "top" : "covered"} ${highlight ? "hl" : ""} ${onClick ? "clickable" : ""}`}
      style={{ ["--neon" as string]: c.hex, ["--neon-lite" as string]: c.lite }}
      onClick={onClick}
      title={ci.faceUp ? `${ci.protocol} ${def.value} — ${def.middleText ?? def.topText ?? ""}` : "Face-down (value 2)"}
    >
      <span className="mini-val">{ci.faceUp ? def.value : 2}</span>
      {ci.faceUp ? <span className="mini-proto">{ci.protocol.slice(0, 3).toUpperCase()}</span> : <span className="mini-proto down">···</span>}
    </div>
  );
}

function Stack({
  cards,
  side,
  line,
  targetUids,
  onTarget,
}: {
  cards: CardInstance[];
  side: Side;
  line: number;
  targetUids: Set<string>;
  onTarget?: (uid: string) => void;
}) {
  return (
    <div className="stack" data-side={side} data-line={line}>
      {cards.length === 0 && <div className="stack-empty">empty</div>}
      {cards.map((ci, i) => {
        const top = i === cards.length - 1;
        const isTarget = targetUids.has(ci.uid);
        return (
          <MiniCard
            key={ci.uid}
            ci={ci}
            uncovered={top}
            highlight={isTarget}
            onClick={isTarget && onTarget ? () => onTarget(ci.uid) : undefined}
          />
        );
      })}
    </div>
  );
}

function ProtoHeader({ proto, compiled, lead, val, side }: { proto: string; compiled: boolean; lead: boolean; val: number; side: Side }) {
  const c = PROTO_COLORS[proto as keyof typeof PROTO_COLORS];
  return (
    <div className={`proto-header ${compiled ? "compiled" : ""}`} style={{ ["--neon" as string]: c.hex }}>
      <span className="ph-name">{proto.toUpperCase()}</span>
      <span className={`ph-val ${lead ? "lead" : ""}`} style={{ color: PLAYER_NEON[side] }}>
        {val}
      </span>
      {compiled && <span className="ph-flag">✓ COMPILED</span>}
    </div>
  );
}

function PlayerBar({ side, active }: { side: Side; active: boolean }) {
  const engine = useGame((s) => s.engine)!;
  const p = engine.state.players[side];
  const ctrl = engine.state.control === side;
  return (
    <div className={`player-bar ${active ? "active" : ""}`} style={{ ["--pn" as string]: PLAYER_NEON[side] }}>
      <span className="pb-name">{p.name}</span>
      <span className="pb-stat">DECK {p.deck.length}</span>
      <span className="pb-stat">HAND {p.hand.length}</span>
      <span className="pb-stat">TRASH {p.trash.length}</span>
      <span className="pb-stat">
        ⬢ {p.protocols.filter((x) => x.compiled).length}/3
      </span>
      {ctrl && <span className="pb-ctrl">◈ CONTROL</span>}
    </div>
  );
}

// --- Board ------------------------------------------------------------------------------------

function Board() {
  const engine = useGame((s) => s.engine)!;
  const rev = useGame((s) => s.rev);
  const aiThinking = useGame((s) => s.aiThinking);
  const selUid = useGame((s) => s.selUid);
  const selFaceUp = useGame((s) => s.selFaceUp);
  const { selectCard, setFaceUp, playSelected, refresh, submit, clearFx, setOverlay } = useGame();

  const aiMove = useGame((s) => s.aiMove);
  const state = engine.state;
  const pending = state.pending;
  const me = state.turn; // active side (the one to act / decide)
  const human = !state.players[me].isAI;

  // Consume FX events → particle bursts + toast, keyed on rev.
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    const fx = state.fx;
    if (fx.length === 0) return;
    for (const e of fx) {
      if (e.kind === "compile" || e.kind === "win" || e.kind === "delete") {
        const el = document.querySelector(`.stack[data-side="${e.kind === "delete" ? e.side : e.side}"][data-line="${(e as { line: number }).line}"]`);
        const rgb: [number, number, number] = [120, 240, 255];
        if (el) {
          const r = el.getBoundingClientRect();
          fireBurst(r.left + r.width / 2, r.top + r.height / 2, rgb, e.kind === "win" ? 80 : e.kind === "compile" ? 50 : 16, e.kind === "delete" ? 0.7 : 1.3);
        }
      }
      if (e.kind === "compile") setToast(`${state.players[e.side].name} COMPILED line ${e.line + 1}`);
      if (e.kind === "control") setToast(e.side >= 0 ? `${state.players[e.side as Side].name} seizes CONTROL` : null);
      if (e.kind === "win") setToast(`${state.players[e.side].name} WINS`);
    }
    clearFx();
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev]);

  // Legal lines for the current hand selection.
  const legal = useMemo(() => (human && pending?.request.kind === "action" ? legalActions(state, me) : null), [rev, human]);
  const selLegalLines = useMemo(() => {
    if (!legal || selUid === null) return new Set<number>();
    return new Set(legal.plays.filter((p) => p.uid === selUid && p.faceUp === selFaceUp).map((p) => p.line));
  }, [legal, selUid, selFaceUp]);
  const selCanFaceUp = useMemo(() => {
    if (!legal || selUid === null) return false;
    return legal.plays.some((p) => p.uid === selUid && p.faceUp);
  }, [legal, selUid]);

  // Targeting highlight sets.
  const targetUids = new Set<string>(pending?.request.kind === "target" ? pending.request.candidates : []);
  const handTargetUids = new Set<string>(pending?.request.kind === "hand" ? pending.request.candidates : []);

  const compilableMe = pending?.request.kind === "compileLine" ? new Set(pending.request.candidates) : new Set<number>();
  const compileNow = compilableLines(state, me);

  function onLineClick(line: number) {
    if (pending?.request.kind === "action" && selUid !== null && selLegalLines.has(line)) {
      playSelected(line);
    } else if (pending?.request.kind === "line" && pending.request.candidates.includes(line)) {
      submit({ line });
    } else if (pending?.request.kind === "compileLine" && compilableMe.has(line)) {
      submit({ line });
    }
  }

  const top = opponent(me); // render opponent on top, active player on bottom
  const handPlayer = state.players[me];

  return (
    <div className="board">
      <div className="board-tools">
        <button className="tool" onClick={() => setOverlay("tutorial")} title="How to play">
          ❔ HELP
        </button>
        <button className="tool" onClick={() => setOverlay("codex")} title="Browse all cards">
          ▦ CODEX
        </button>
      </div>
      <PlayerBar side={top} active={false} />

      {(aiThinking || aiMove) && (
        <div className={`ai-banner ${aiThinking ? "busy" : ""}`} style={{ ["--pn" as string]: PLAYER_NEON[top] }}>
          {aiThinking ? (
            <span className="blink">◇ {state.players[top].name} IS COMPUTING…</span>
          ) : (
            <span>▸ {aiMove}</span>
          )}
        </div>
      )}

      <div className="field">
        {[0, 1, 2].map((line) => {
          const meVal = lineValue(state.players[me], line);
          const opVal = lineValue(state.players[top], line);
          const lineClickable =
            (pending?.request.kind === "action" && selUid !== null && selLegalLines.has(line)) ||
            (pending?.request.kind === "line" && pending.request.side === me && pending.request.candidates.includes(line)) ||
            (pending?.request.kind === "compileLine" && compilableMe.has(line));
          return (
            <div key={line} className={`line ${lineClickable ? "clickable-line" : ""}`} onClick={() => onLineClick(line)}>
              <div className="line-tag">LINE {line + 1}</div>
              {/* opponent zone */}
              <div className="zone opp">
                <Stack
                  cards={state.players[top].stacks[line]}
                  side={top}
                  line={line}
                  targetUids={targetUids}
                  onTarget={(uid) => submit({ cardId: uid })}
                />
                <ProtoHeader proto={state.players[top].protocols[line].protocol} compiled={state.players[top].protocols[line].compiled} lead={opVal > meVal} val={opVal} side={top} />
              </div>
              <div className="line-mid">
                <span className="vs">⟷</span>
              </div>
              {/* active player zone */}
              <div className="zone me">
                <ProtoHeader proto={state.players[me].protocols[line].protocol} compiled={state.players[me].protocols[line].compiled} lead={meVal > opVal} val={meVal} side={me} />
                <Stack
                  cards={state.players[me].stacks[line]}
                  side={me}
                  line={line}
                  targetUids={targetUids}
                  onTarget={(uid) => submit({ cardId: uid })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <PlayerBar side={me} active={true} />

      {/* Hand + controls */}
      <div className="control-deck">
        {aiThinking ? (
          <div className="thinking">◇ {state.players[me].name} COMPUTING…</div>
        ) : !human ? (
          <div className="thinking">◇ {state.players[me].name}'s turn</div>
        ) : (
          <>
            <div className="hand">
              {handPlayer.hand.map((ci) => {
                const def = getDef(ci.defId);
                const c = PROTO_COLORS[ci.protocol];
                const selected = ci.uid === selUid;
                const selectable = pending?.request.kind === "action";
                const isHandTarget = handTargetUids.has(ci.uid);
                return (
                  <div
                    key={ci.uid}
                    className={`hand-card ${selected ? "selected" : ""} ${isHandTarget ? "hl" : ""}`}
                    style={{ ["--neon" as string]: c.hex, ["--neon-lite" as string]: c.lite }}
                    onClick={() => {
                      if (isHandTarget) submit({ cardId: ci.uid });
                      else if (selectable) selectCard(selected ? null : ci.uid);
                    }}
                  >
                    <div className="hc-top">
                      <span className="hc-val">{def.value}</span>
                      <span className="hc-proto">{ci.protocol.toUpperCase()}</span>
                    </div>
                    <div className="hc-text">
                      {def.topText && <p className="cmd top">▲ {def.topText}</p>}
                      {def.middleText && <p className="cmd mid">◆ {def.middleText}</p>}
                      {def.bottomText && <p className="cmd bot">▼ {def.bottomText}</p>}
                      {!def.topText && !def.middleText && !def.bottomText && <p className="cmd dim">no command</p>}
                    </div>
                  </div>
                );
              })}
              {handPlayer.hand.length === 0 && <div className="hand-empty">— empty hand —</div>}
            </div>

            <ChoicePanel
              selUid={selUid}
              selFaceUp={selFaceUp}
              selCanFaceUp={selCanFaceUp}
              selLegalLines={selLegalLines}
              setFaceUp={setFaceUp}
              playSelected={playSelected}
              refresh={refresh}
              submit={submit}
              compileNow={compileNow}
            />
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="log">
        {state.log.slice(-4).map((l, i) => (
          <div key={i} className="log-line" style={{ color: l.side !== null ? PLAYER_NEON[l.side] : "#8aa" }}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoicePanel(props: {
  selUid: string | null;
  selFaceUp: boolean;
  selCanFaceUp: boolean;
  selLegalLines: Set<number>;
  setFaceUp: (b: boolean) => void;
  playSelected: (line: number) => void;
  refresh: () => void;
  submit: (r: import("../engine").ChoiceResponse) => void;
  compileNow: number[];
}) {
  const engine = useGame((s) => s.engine)!;
  const pending = engine.state.pending;
  if (!pending) return <div className="prompt">…</div>;
  const req = pending.request;

  if (req.kind === "action") {
    const { selUid, selFaceUp, selCanFaceUp, selLegalLines } = props;
    return (
      <div className="prompt action">
        {selUid === null ? (
          <span className="prompt-q">SELECT A CARD TO PLAY{req.canRefresh ? ", OR REFRESH" : ""}</span>
        ) : (
          <>
            <span className="prompt-q">ORIENT &amp; CHOOSE A LINE:</span>
            <div className="seg small">
              <button className={selFaceUp ? "on" : ""} disabled={!selCanFaceUp} onClick={() => props.setFaceUp(true)}>
                FACE-UP
              </button>
              <button className={!selFaceUp ? "on" : ""} onClick={() => props.setFaceUp(false)}>
                FACE-DOWN
              </button>
            </div>
            <div className="line-btns">
              {[0, 1, 2].map((l) => (
                <button key={l} disabled={!selLegalLines.has(l)} onClick={() => props.playSelected(l)}>
                  LINE {l + 1}
                </button>
              ))}
            </div>
          </>
        )}
        {req.canRefresh && (
          <button className="ghost" onClick={props.refresh}>
            ⟳ REFRESH HAND
          </button>
        )}
      </div>
    );
  }

  if (req.kind === "compileLine") {
    return (
      <div className="prompt compile">
        <span className="prompt-q">⬢ YOU MUST COMPILE — CHOOSE A LINE</span>
        <div className="line-btns">
          {req.candidates.map((l) => (
            <button key={l} className="primary" onClick={() => props.submit({ line: l })}>
              LINE {l + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (req.kind === "target") {
    return (
      <div className="prompt">
        <span className="prompt-q">◎ {req.prompt} — click a highlighted card</span>
        {req.optional && (
          <button className="ghost" onClick={() => props.submit({ skip: true })}>
            SKIP
          </button>
        )}
      </div>
    );
  }

  if (req.kind === "line") {
    return (
      <div className="prompt">
        <span className="prompt-q">⇄ {req.prompt}</span>
        <div className="line-btns">
          {req.candidates.map((l) => (
            <button key={l} onClick={() => props.submit({ line: l })}>
              LINE {l + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (req.kind === "hand") {
    return (
      <div className="prompt">
        <span className="prompt-q">▽ {req.prompt} — click a hand card</span>
        {req.optional && (
          <button className="ghost" onClick={() => props.submit({ skip: true })}>
            SKIP
          </button>
        )}
      </div>
    );
  }

  if (req.kind === "yesno") {
    return (
      <div className="prompt">
        <span className="prompt-q">? {req.prompt}</span>
        <div className="line-btns">
          <button className="primary" onClick={() => props.submit({ yes: true })}>
            YES
          </button>
          <button className="ghost" onClick={() => props.submit({ yes: false })}>
            NO
          </button>
        </div>
      </div>
    );
  }

  if (req.kind === "rearrange") {
    return (
      <div className="prompt">
        <span className="prompt-q">◈ {req.prompt}</span>
        <div className="line-btns">
          <button onClick={() => props.submit({ rearrangeSide: engine.state.turn, order: [1, 2, 0] })}>ROTATE MINE</button>
          <button onClick={() => props.submit({ rearrangeSide: (engine.state.turn === 0 ? 1 : 0) as Side, order: [1, 2, 0] })}>ROTATE THEIRS</button>
          <button className="ghost" onClick={() => props.submit({ skip: true })}>
            SKIP
          </button>
        </div>
      </div>
    );
  }

  return <div className="prompt">…</div>;
}

// --- End overlay ------------------------------------------------------------------------------

function EndOverlay() {
  const engine = useGame((s) => s.engine)!;
  const reset = useGame((s) => s.reset);
  const setOverlay = useGame((s) => s.setOverlay);
  const w = engine.state.winner!;
  return (
    <div className="screen center end">
      <h1 className="logo win" style={{ color: PLAYER_NEON[w] }}>
        {engine.state.players[w].name}
        <br />
        COMPILES REALITY
      </h1>
      <p className="tagline">All three protocols compiled. The rewrite is complete.</p>
      <button className="primary big" onClick={reset}>
        ◀ NEW GAME
      </button>
      <div className="menu-links">
        <button className="ghost" onClick={() => setOverlay("codex")}>
          ▦ CARD CODEX
        </button>
        <button className="ghost" onClick={() => setOverlay("tutorial")}>
          ❔ HOW TO PLAY
        </button>
      </div>
    </div>
  );
}

// --- Card Codex -------------------------------------------------------------------------------

function CodexCard({ def }: { def: CardDef }) {
  const c = PROTO_COLORS[def.protocol];
  const noText = !def.topText && !def.middleText && !def.bottomText;
  return (
    <div className="codex-card" style={{ ["--neon" as string]: c.hex, ["--neon-lite" as string]: c.lite }}>
      <div className="cc-head">
        <span className="cc-val">{def.value}</span>
        <div className="cc-titles">
          <span className="cc-proto">{def.protocol.toUpperCase()}</span>
          <span className="cc-verbs">{PROTO_VERBS[def.protocol]}</span>
        </div>
      </div>
      <div className="cc-body">
        {def.topText && <p className="cmd top">▲ {def.topText}</p>}
        {def.middleText && <p className="cmd mid">◆ {def.middleText}</p>}
        {def.bottomText && <p className="cmd bot">▼ {def.bottomText}</p>}
        {noText && <p className="cmd dim">— pure value, no command —</p>}
      </div>
      {def.placeholder && <span className="cc-flag" title="Stand-in effect, pending the published card data">PLACEHOLDER</span>}
    </div>
  );
}

function Codex() {
  const setOverlay = useGame((s) => s.setOverlay);
  const [filter, setFilter] = useState<ProtocolName | "ALL">("ALL");
  const protos = filter === "ALL" ? PROTOCOLS : [filter];
  return (
    <div className="overlay-screen">
      <div className="overlay-top">
        <h2 className="section">CARD CODEX // 12 PROTOCOLS · 72 CARDS</h2>
        <button className="ghost" onClick={() => setOverlay("none")}>
          ✕ CLOSE
        </button>
      </div>
      <p className="fine dim">
        Played FACE-DOWN, any card is worth <b>2</b> and has no command. The effect texts below are
        placeholders pending the published card data — the rules system is fully implemented.
      </p>
      <div className="codex-chips">
        <button className={filter === "ALL" ? "on" : ""} onClick={() => setFilter("ALL")}>
          ALL
        </button>
        {PROTOCOLS.map((p) => (
          <button
            key={p}
            className={filter === p ? "on" : ""}
            style={{ ["--neon" as string]: PROTO_COLORS[p].hex }}
            onClick={() => setFilter(p)}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="codex-scroll">
        {protos.map((proto) => (
          <div key={proto} className="codex-proto">
            {filter === "ALL" && (
              <h3 className="codex-proto-name" style={{ color: PROTO_COLORS[proto].hex }}>
                {proto.toUpperCase()} <span className="cc-verbs">{PROTO_VERBS[proto]}</span>
              </h3>
            )}
            <div className="codex-grid">
              {protocolDefIds(proto).map((id) => (
                <CodexCard key={id} def={getDef(id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Tutorial ---------------------------------------------------------------------------------

function FaceMini({ proto, value, down }: { proto: ProtocolName; value: number; down?: boolean }) {
  const c = PROTO_COLORS[proto];
  return (
    <div className={`mini ${down ? "down" : "up"} top`} style={{ ["--neon" as string]: c.hex, ["--neon-lite" as string]: c.lite }}>
      <span className="mini-val">{down ? 2 : value}</span>
      <span className={`mini-proto ${down ? "down" : ""}`}>{down ? "···" : proto.slice(0, 3).toUpperCase()}</span>
    </div>
  );
}

interface TutStep {
  title: string;
  visual: JSX.Element;
  body: JSX.Element;
}

const TUTORIAL_STEPS: TutStep[] = [
  {
    title: "THE GOAL",
    visual: (
      <div className="tut-goal">
        <span className="hexrow">⬡ ⬡ ⬡</span>
        <span className="arrow">→</span>
        <span className="hexrow done">⬢ ⬢ ⬢</span>
      </div>
    ),
    body: (
      <p>
        You and your rival are rogue AIs fighting for control. You each draft <b>3 protocols</b>, then
        race to <b className="hl">COMPILE</b> all three. The first to compile their three protocols
        rewrites reality and wins.
      </p>
    ),
  },
  {
    title: "THE FIELD: 3 LINES",
    visual: (
      <div className="tut-field">
        {[0, 1, 2].map((l) => (
          <div key={l} className="tut-line">
            <span className="tut-side you">YOUR PROTOCOL</span>
            <span className="vs">⟷</span>
            <span className="tut-side opp">RIVAL PROTOCOL</span>
          </div>
        ))}
      </div>
    ),
    body: (
      <p>
        The field has <b>3 lines</b>. Each line pairs one of <b>your</b> protocols against one of your{" "}
        <b>rival's</b>. On your turn you add cards to a <b>stack</b> on your side of a line, trying to
        out-value the rival across the lines.
      </p>
    ),
  },
  {
    title: "PLAYING CARDS",
    visual: (
      <div className="tut-cards">
        <div className="tut-cardlabel">
          <FaceMini proto="Fire" value={3} />
          <span>FACE-UP: prints value + fires its command, but only in its matching line.</span>
        </div>
        <div className="tut-cardlabel">
          <FaceMini proto="Fire" value={3} down />
          <span>FACE-DOWN: worth 2, no command, playable into ANY line.</span>
        </div>
      </div>
    ),
    body: (
      <p>
        Your action each turn is to <b>play one card</b> (or refresh). Face-up cards must go in the
        line whose protocol matches the card and immediately resolve their command. Face-down cards
        go anywhere, are worth <b>2</b>, and do nothing. Even <b>covered</b> cards still add value.
      </p>
    ),
  },
  {
    title: "YOUR TURN, STEP BY STEP",
    visual: (
      <div className="tut-steps">
        {["START", "CHECK CONTROL", "CHECK COMPILE", "ACTION", "CHECK CACHE", "END"].map((s, i) => (
          <span key={s} className="tut-step">
            <b>{i + 1}</b> {s}
          </span>
        ))}
      </div>
    ),
    body: (
      <p>
        <b>Start</b> & <b>End</b> trigger your face-up cards' timed effects. <b>Check Control</b> &{" "}
        <b>Check Compile</b> happen automatically. <b>Action</b> = play 1 card or <b>refresh</b> (draw
        back up to 5). <b>Check Cache</b> = discard down to 5 if you're holding more.
      </p>
    ),
  },
  {
    title: "CARD COMMANDS",
    visual: (
      <div className="tut-commands">
        <p className="cmd top">▲ TOP — passive, active while face-up (even covered)</p>
        <p className="cmd mid">◆ MIDDLE — resolves when played, flipped up, or uncovered</p>
        <p className="cmd bot">▼ BOTTOM — triggers on your Start/End, only while uncovered</p>
      </div>
    ),
    body: (
      <p>
        A card can carry up to three commands. Effects — draw, delete, flip, shift, discard, return —
        can target <b>either</b> side of the field. Browse every card any time via the{" "}
        <b className="hl">CARD CODEX</b>.
      </p>
    ),
  },
  {
    title: "COMPILING",
    visual: (
      <div className="tut-compile">
        <span className="big-num">10+</span>
        <span className="and">AND ahead in that line</span>
        <span className="arrow">→</span>
        <span className="hexrow done">⬢ COMPILED</span>
      </div>
    ),
    body: (
      <p>
        At the start of your turn, if a line has <b>10 or more</b> value <b>and</b> beats your rival
        there, you <b>must compile</b> it: every card in that line (both sides) is deleted and you flip
        that protocol to <b className="hl">COMPILED</b>. Compiling is your whole turn. Compiling an
        already-compiled line instead <b>steals</b> a card from your rival.
      </p>
    ),
  },
  {
    title: "THE CONTROL COMPONENT",
    visual: <div className="tut-control">◈ CONTROL</div>,
    body: (
      <p>
        Lead in <b>2 or more lines</b> on your turn to seize <b>Control</b>. While you hold it, each
        time you compile or refresh you may <b>rearrange</b> one player's protocol headers (the stacks
        stay where they are) — then Control returns to neutral. (You can switch Control off in setup
        for a simpler first game.)
      </p>
    ),
  },
  {
    title: "YOU'RE READY",
    visual: <div className="tut-goal big">⬢ ⬢ ⬢</div>,
    body: (
      <p>
        Compile all three protocols to win. Face-down plays are great for racing value or bluffing.
        Note: card effect <b>texts</b> are placeholders for now — the full rules are implemented and
        tested. Good luck, operator.
      </p>
    ),
  },
];

function Tutorial() {
  const setOverlay = useGame((s) => s.setOverlay);
  const [i, setI] = useState(0);
  const step = TUTORIAL_STEPS[i];
  const last = i === TUTORIAL_STEPS.length - 1;
  return (
    <div className="overlay-screen tutorial">
      <div className="overlay-top">
        <h2 className="section">HOW TO PLAY</h2>
        <button className="ghost" onClick={() => setOverlay("none")}>
          ✕ CLOSE
        </button>
      </div>
      <div className="tut-card">
        <div className="tut-num">
          STEP {i + 1} / {TUTORIAL_STEPS.length}
        </div>
        <h3 className="tut-title">{step.title}</h3>
        <div className="tut-visual">{step.visual}</div>
        <div className="tut-body">{step.body}</div>
      </div>
      <div className="tut-nav">
        <button className="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          ◀ BACK
        </button>
        <div className="tut-dots">
          {TUTORIAL_STEPS.map((_, k) => (
            <span key={k} className={`dot ${k === i ? "on" : ""}`} onClick={() => setI(k)} />
          ))}
        </div>
        {last ? (
          <button className="primary" onClick={() => setOverlay("none")}>
            GOT IT ▶
          </button>
        ) : (
          <button className="primary" onClick={() => setI(i + 1)}>
            NEXT ▶
          </button>
        )}
      </div>
    </div>
  );
}

// --- Root -------------------------------------------------------------------------------------

export default function App() {
  const engine = useGame((s) => s.engine);
  const overlay = useGame((s) => s.overlay);
  useGame((s) => s.rev); // subscribe to re-render on any change

  let screen;
  if (!engine) screen = <Setup />;
  else if (engine.state.phase === "draft") screen = <Draft />;
  else if (engine.state.phase === "gameover") screen = <EndOverlay />;
  else screen = <Board />;

  return (
    <div className="app">
      <Backdrop />
      <div className="app-inner">{screen}</div>
      {overlay === "codex" && <Codex />}
      {overlay === "tutorial" && <Tutorial />}
    </div>
  );
}
