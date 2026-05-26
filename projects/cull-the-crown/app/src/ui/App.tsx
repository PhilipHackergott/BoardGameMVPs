import { useEffect, useState } from "react";
import { useGame } from "./store";
import TitleScreen from "./TitleScreen";
import FeltScreen from "./FeltScreen";
import EventScreen from "./EventScreen";
import EndScreen from "./EndScreen";
import MuteButton from "./MuteButton";
import TransitionLayer from "./TransitionLayer";
import TooltipLayer from "./TooltipLayer";
import { Tooltip } from "./tooltip";
import PixiCombatGate from "./PixiCombatGate";
import PixiDeckModal from "./PixiDeckModal";
import PixiPackModal from "./PixiPackModal";
import PixiRunMap from "./PixiRunMap";
import HelpOverlay from "./HelpOverlay";
import PixiPauseMenu from "./PixiPauseMenu";
import { audio, music, sfx } from "../audio/chiptune";
import { eventById, previewPlay } from "../engine/index";

// The phase router + the always-mounted global layers (transitions, tooltips, the combat gate, the
// modals) + the app-wide effects (audio gestures, the global keyboard map). Each screen lives in its
// own file; this file just wires them together.

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
  else if (phase === "combat" || phase === "shop") body = <FeltScreen />; // one persistent felt for both
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
      <Tooltip />
      <PixiCombatGate />
      <PixiPackModal />
      <PixiDeckModal />
      <PixiRunMap />
      {paused && <PixiPauseMenu />}
      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      <div className="crt" aria-hidden="true" />
    </div>
  );
}
