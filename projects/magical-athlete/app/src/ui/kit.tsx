import type { CSSProperties, ReactNode } from 'react';

// Retro-disco / "Wacky Races" design language: bold whimsical colour, printed-card components, a
// chunky display logo — meant to read as a physical, properly-designed game on a table surface
// (the page/table background lives in index.html).

export const display = '"Bungee", system-ui, sans-serif'; // blocky athletic logo type
export const heading = '"Righteous", system-ui, sans-serif'; // groovy geometric headings
export const fontStack = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

export const colors = {
  // on the dark table surface
  text: '#fdf3e7',
  dim: '#cdb9d6',
  faint: '#9a85ac',
  // printed paper (cards / components)
  paper: '#f6ecd9',
  paperSoft: '#ece0c6',
  paperEdge: '#cbb78f',
  ink: '#2c2333',
  inkDim: '#6c5f72',
  // disco accents
  accent: '#ffc24b',
  hot: '#ff5d8f',
  teal: '#27c2b4',
  grape: '#9b6cff',
  // dark "tray" panels that hold cards on the surface
  tray: 'rgba(28, 18, 33, 0.66)',
  trayEdge: 'rgba(255, 220, 170, 0.18)',
  good: '#48d39a',
  bad: '#ff6b7d',
};

/** Per-track-side theme — Mild = sunny teal, Wild = electric grape. */
export const sideTheme = {
  mild: { accent: '#27c2b4', soft: 'rgba(39,194,180,0.16)', label: 'Mild Mile' },
  wild: { accent: '#b86cff', soft: 'rgba(184,108,255,0.18)', label: 'Wild Wilds' },
} as const;

/** Bold, distinct player identity colours (up to 4). */
export const PLAYER_COLORS = ['#3aa0ff', '#ff8a3d', '#27c2b4', '#ff5db1'];
export function playerColor(p: number): string {
  return PLAYER_COLORS[p % PLAYER_COLORS.length];
}

export const page: CSSProperties = {
  fontFamily: fontStack,
  color: colors.text,
  minHeight: '100vh',
  margin: 0,
  padding: '22px 18px 48px',
};

export const center: CSSProperties = { maxWidth: 1180, margin: '0 auto' };

/** A dark translucent "tray" that holds printed components on the table. */
export function Panel({
  children,
  style,
  glow,
}: {
  children: ReactNode;
  style?: CSSProperties;
  glow?: string;
}) {
  return (
    <div
      style={{
        background: colors.tray,
        border: `1px solid ${glow ?? colors.trayEdge}`,
        borderRadius: 18,
        padding: 16,
        backdropFilter: 'blur(2px)',
        boxShadow: glow
          ? `0 0 0 2px ${glow}55, 0 18px 40px -22px #000`
          : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px -26px #000',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A chunky retro button with a hard drop-shadow lip so it feels like a physical token. */
export function Button({
  children,
  onClick,
  disabled,
  primary,
  testId,
  tint,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  testId?: string;
  tint?: string;
  style?: CSSProperties;
}) {
  const fill = tint ?? colors.accent;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      style={{
        fontFamily: heading,
        padding: '11px 20px',
        fontSize: 15,
        letterSpacing: 0.5,
        borderRadius: 13,
        cursor: disabled ? 'default' : 'pointer',
        border: primary ? 'none' : `2px solid ${colors.trayEdge}`,
        color: primary ? '#2a1c10' : colors.text,
        background: disabled ? '#4a3a52' : primary ? fill : 'rgba(255,255,255,0.06)',
        boxShadow: disabled || !primary ? 'none' : `0 5px 0 0 ${shade(fill)}, 0 10px 16px -8px #000`,
        transform: 'translateY(0)',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Darken a hex colour for the button's 3D lip. */
function shade(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 60);
  const g = Math.max(0, ((n >> 8) & 255) - 60);
  const b = Math.max(0, (n & 255) - 60);
  return `rgb(${r},${g},${b})`;
}

export function Pill({
  children,
  tint = colors.dim,
  filled,
}: {
  children: ReactNode;
  tint?: string;
  filled?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: heading,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 11px',
        borderRadius: 999,
        fontSize: 11.5,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: filled ? '#241016' : tint,
        background: filled ? tint : `${tint}26`,
        border: `1.5px solid ${tint}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function Swatch({
  tint,
  label,
  size = 30,
}: {
  tint: number | string;
  label: string;
  size?: number;
}) {
  const bg = typeof tint === 'number' ? '#' + tint.toString(16).padStart(6, '0') : tint;
  return (
    <span
      style={{
        fontFamily: heading,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        fontSize: size * 0.36,
        textShadow: '0 1px 2px rgba(0,0,0,0.55)',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.4)',
        flex: '0 0 auto',
      }}
    >
      {label}
    </span>
  );
}
