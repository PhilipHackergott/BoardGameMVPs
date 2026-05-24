import type { CSSProperties } from 'react';
import { racerArt } from '../assets/manifest';
import { useGame } from '../state/store';
import { powerInfo } from './racerInfo';
import { Pill, heading } from './kit';

export type CardStatus = 'racing' | 'finished' | 'used' | 'idle' | 'pick';

const STOCK = '#15131c'; // black card stock / frame
const FOOTER = '#f4c430'; // the yellow power-name strip
const SERIF = '"Bree Serif", Georgia, serif';
const BODY_SERIF = 'Georgia, "Times New Roman", serif';

function rgb(n: number) {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
function lum(n: number): number {
  const [r, g, b] = rgb(n);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function css(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
function lighten(n: number, amt: number): string {
  const [r, g, b] = rgb(n);
  const f = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** A racer card styled like the physical Magical Athlete card: black card stock with a high corner
 *  radius, an inset coloured field with a nested border line, the racer name up top, a placeholder
 *  illustration (no CMYK art), a framed white rules box, and a yellow power-name footer. `dense`
 *  drops the illustration for the in-race player rails. */
export function RacerCard({
  racerId,
  status = 'idle',
  place,
  accent,
  onClick,
  testId,
  dense,
  style,
}: {
  racerId: string;
  status?: CardStatus;
  place?: number | null;
  accent?: string;
  onClick?: () => void;
  testId?: string;
  dense?: boolean;
  style?: CSSProperties;
}) {
  const racer = useGame((s) => s.match?.racersById[racerId]);
  const art = racerArt(racerId);
  const info = powerInfo(racer);
  const name = racer?.name ?? racerId;

  const tint = art.tint;
  const tintCss = css(tint);
  const light = lum(tint) > 0.62;
  const nameColor = light ? '#1b1422' : '#ffffff';
  const nameShadow = light ? '0 1px 0 rgba(255,255,255,0.45)' : '0 1.5px 2px rgba(0,0,0,0.5)';

  const selectable = status === 'pick';
  const muted = status === 'used' || status === 'finished';
  const ring = accent ?? FOOTER;
  const pad = dense ? 6 : 9;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      disabled={!selectable && !onClick}
      className={`racer-card${selectable ? ' pick' : ''}`}
      style={{
        position: 'relative',
        textAlign: 'left',
        width: '100%',
        padding: dense ? 4 : 5,
        borderRadius: 22,
        border: 'none',
        background: STOCK,
        cursor: selectable || onClick ? 'pointer' : 'default',
        opacity: muted ? 0.62 : 1,
        boxShadow: status === 'racing' ? `0 0 0 3px ${ring}, 0 10px 18px -9px #000` : '0 6px 14px -7px rgba(0,0,0,0.75)',
        ...style,
      }}
    >
      {/* inset coloured field with a nested border line */}
      <div
        style={{
          background: tintCss,
          borderRadius: 17,
          overflow: 'hidden',
          boxShadow: `inset 0 0 0 2px ${light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.28)'}, inset 0 0 0 3px ${STOCK}`,
        }}
      >
        <div style={{ padding: `${pad}px ${pad + 1}px ${pad}px` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: dense ? 16 : 19, lineHeight: 1, flex: '0 0 auto' }}>{art.glyph}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: dense ? 15 : 18, color: nameColor, textShadow: nameShadow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </span>
            {status === 'racing' && <Pill tint="#fff" filled>Racing</Pill>}
            {status === 'finished' && <Pill tint="#fff" filled>{place === 1 ? '🥇 1st' : '🥈 2nd'}</Pill>}
            {status === 'used' && <Pill tint="rgba(255,255,255,0.85)">Done</Pill>}
          </div>

          {!dense && (
            <div
              style={{
                marginTop: 8,
                height: 104,
                borderRadius: 12,
                background: `radial-gradient(circle at 50% 36%, ${lighten(tint, 0.55)}, ${lighten(tint, 0.1)})`,
                border: `2px solid ${light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)'}`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span style={{ fontSize: 60, lineHeight: 1, filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))' }}>{art.glyph}</span>
            </div>
          )}

          {/* framed white rules box */}
          <div
            style={{
              marginTop: dense ? 7 : 9,
              background: '#fbf7ee',
              border: `2px solid ${STOCK}`,
              borderRadius: 13,
              padding: dense ? '6px 9px' : '9px 11px',
              minHeight: dense ? 0 : 44,
            }}
          >
            <div style={{ fontFamily: BODY_SERIF, fontSize: dense ? 12.5 : 13.5, lineHeight: 1.32, color: '#1c1622' }}>{info.blurb}</div>
          </div>
        </div>

        {/* yellow power-name footer */}
        <div style={{ background: FOOTER, borderTop: `2px solid ${STOCK}`, padding: '4px 10px', textAlign: 'center' }}>
          <span style={{ fontFamily: heading, fontSize: dense ? 10.5 : 11.5, letterSpacing: 1, textTransform: 'uppercase', color: '#3a2a06' }}>{info.title}</span>
        </div>
      </div>
    </button>
  );
}
