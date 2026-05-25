import { useGame } from "./store";
import { eventById } from "../engine/index";
import { sfx } from "../audio/chiptune";

export default function EventScreen() {
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
