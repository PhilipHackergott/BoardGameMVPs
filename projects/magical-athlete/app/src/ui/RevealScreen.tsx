import { GOLD_VALUES, SILVER_VALUES } from '../engine';
import { useGame } from '../state/store';
import { RacerCard } from './RacerCard';
import { Panel, Pill, center, colors, heading, playerColor, sideTheme } from './kit';

export function RevealScreen() {
  const match = useGame((s) => s.match)!;
  const reveal = useGame((s) => s.reveal);
  const player = match.reveal.needed[0];
  const used = new Set(match.used[player]);
  const hand = match.draft.hands[player].filter((id) => !used.has(id));
  const side = match.config.schedule[match.raceNo];
  const theme = sideTheme[side];

  return (
    <div style={{ ...center, maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontFamily: heading, letterSpacing: 0.5, color: colors.accent }}>
          Race {match.raceNo + 1} <span style={{ color: colors.faint }}>/ {match.config.schedule.length}</span>
        </h2>
        <Pill tint={theme.accent} filled>
          {theme.label}
        </Pill>
        <Pill tint={colors.accent}>🥇 {GOLD_VALUES[match.raceNo]}</Pill>
        <Pill tint="#c7cede">🥈 {SILVER_VALUES[match.raceNo]}</Pill>
      </div>
      <p style={{ color: colors.dim, marginTop: 0 }}>Later races are worth more — choose who runs this one carefully.</p>

      <Panel glow={playerColor(player)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Pill tint={playerColor(player)} filled>
            Player {player + 1}
          </Pill>
          <b style={{ fontSize: 15 }}>pick your racer for this race</b>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 9 }}>
          {hand.map((id) => (
            <RacerCard
              key={id}
              racerId={id}
              status="pick"
              accent={playerColor(player)}
              testId="reveal-pick"
              onClick={() => reveal(player, id)}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
