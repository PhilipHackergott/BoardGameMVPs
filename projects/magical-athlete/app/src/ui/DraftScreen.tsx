import { currentDrafter } from '../engine';
import { useGame } from '../state/store';
import { RacerCard } from './RacerCard';
import { Panel, Pill, center, colors, heading, playerColor } from './kit';

export function DraftScreen() {
  const match = useGame((s) => s.match)!;
  const pick = useGame((s) => s.draftPick);
  const drafter = currentDrafter(match.draft);

  return (
    <div style={center}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontFamily: heading, letterSpacing: 0.5, color: colors.accent }}>Draft your team</h2>
        {drafter !== null && (
          <Pill tint={playerColor(drafter)} filled>
            Player {drafter + 1} picks
          </Pill>
        )}
      </div>
      <p style={{ color: colors.dim, marginTop: 0 }}>
        Snake draft — everyone ends with four racers. Read each ability before you commit.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* available racers */}
        <div style={{ flex: '1 1 460px', minWidth: 0 }}>
          <Panel glow={drafter !== null ? playerColor(drafter) : undefined}>
            <div style={{ color: colors.dim, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Available racers</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 9 }}>
              {match.draft.line.map((id) => (
                <RacerCard
                  key={id}
                  racerId={id}
                  status="pick"
                  accent={drafter !== null ? playerColor(drafter) : undefined}
                  testId="draft-pick"
                  onClick={() => pick(id)}
                />
              ))}
            </div>
          </Panel>
        </div>

        {/* drafted hands */}
        <div style={{ flex: '1 1 280px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {match.draft.hands.map((hand, p) => (
            <Panel key={p} glow={drafter === p ? playerColor(p) : undefined} style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hand.length ? 10 : 0 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: playerColor(p), flex: '0 0 auto' }} />
                <b>Player {p + 1}</b>
                <span style={{ marginLeft: 'auto', color: colors.faint, fontSize: 13 }}>{hand.length}/4</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {hand.map((id) => (
                  <RacerCard key={id} racerId={id} accent={playerColor(p)} dense />
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
