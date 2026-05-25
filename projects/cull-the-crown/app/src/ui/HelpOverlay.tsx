import Modal from "./Modal";

// "How to Play" — the tutorial. A modal that explains every system, opened from the title and the
// combat HUD, and auto-shown on a player's first run (localStorage flag).

const SUITS: { g: string; name: string; cls: string; text: string }[] = [
  { g: "♥", name: "Hearts", cls: "red", text: "Heal — shuffle cards from the USED pile back under your deck." },
  { g: "♦", name: "Diamonds", cls: "red", text: "Draw — pull that many cards from your deck into hand." },
  { g: "♣", name: "Clubs", cls: "black", text: "Double — the attack's damage counts twice." },
  { g: "♠", name: "Spades", cls: "black", text: "Shield — reduce the royal's next strike (it stacks)." },
];

export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Rules" panelClass="help" onClose={onClose}>
      <div className="help-body">
          <section>
            <h3>The Goal</h3>
            <p>Overthrow all <b>12 royals</b> — four Jacks, four Queens, four Kings, in that order.
            Survive the gauntlet and the crown is culled.</p>
          </section>

          <section>
            <h3>Your Turn</h3>
            <p><b>Drag a card up</b> toward the royal to play it (or tap to select, then press Play)
            to <b>attack</b>. Its number is the damage; its <b>suit fires a power</b>. If the royal
            survives, it <b>strikes back</b> — discard cards worth at least the strike (minus your
            shield) or your run ends.</p>
          </section>

          <section>
            <h3>The Four Suits</h3>
            <ul className="help-suits">
              {SUITS.map((s) => (
                <li key={s.name}>
                  <span className={`suit ${s.cls}`}>{s.g}</span>
                  <b>{s.name}</b> — {s.text}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Disabled Suits</h3>
            <p>Each royal <b>disables its own suit's power</b> (a ♥ royal can't be healed off of, etc.)
            — the damage still lands, just not the effect. Route around it with a <b>mixed-suit
            combo</b> so your other powers still fire.</p>
          </section>

          <section>
            <h3>Royal Decrees &amp; Sigils</h3>
            <p>Some royals rule under a <b>Decree</b> — a special rule shown on their panel and in
            <b> The Descent</b> overview (it might ignore your shield, forbid a suit, or enrage at low
            health). Read it before you commit. Cards can also gain a <b>Sigil</b> from the market — a
            mark that bends how that one card resolves.</p>
          </section>

          <section>
            <h3>Combos &amp; Companions</h3>
            <p>Play <b>2–5 cards of equal rank</b> (totalling ≤ 10) together — all their suit powers
            fire at the combined value. <b>Animal Companions (A)</b> are worth 1 and can join any
            play, stacking their suit.</p>
          </section>

          <section>
            <h3>Gold &amp; the Market</h3>
            <p>Win fights for <b>gold</b> — land the <b>exact</b> killing blow for a bonus. Between
            fights, spend it on <b>guild members (jokers)</b> (passive powers in your 5 slots),
            <b> tarots &amp; spectrals</b>, and <b>card sigils</b>.</p>
            <p className="help-tip">Tip: click the <b>deck</b> or <b>used pile</b> on the board any
            time to inspect its cards.</p>
          </section>
        </div>
    </Modal>
  );
}
