import type { ReactElement } from "react";
import type { PowerId } from "../engine";

// Simple beta-art glyphs (no emoji) so powers are recognizable at a glance.
const ICONS: Record<PowerId, ReactElement> = {
  warding: <path d="M12 3l7 3v5c0 4.5-7 9-7 9s-7-4.5-7-9V6z" />,
  flying: (
    <>
      <path d="M4 13l8-6 8 6" />
      <path d="M4 17l8-6 8 6" />
    </>
  ),
  agile: <path d="M13 2 6 13h5l-1 9 8-11h-6z" fill="currentColor" stroke="none" />,
  procrastinator: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  gravity: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4v4M12 20v-4M4 12h4M20 12h-4" />
    </>
  ),
  intercept: (
    <>
      <rect x="4" y="9" width="16" height="6" rx="1" />
      <path d="M9 9v6M14 9v6" />
    </>
  ),
  flexible: <path d="M7 8h9l-3-3M17 16H8l3 3" />,
  patron: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M12 10V6M9 6a3 3 0 016 0M4 14h16" />
    </>
  ),
  cheater: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  spectral: (
    <>
      <path d="M6 20v-9a6 6 0 0112 0v9l-2-2-2 2-2-2-2 2-2-2z" />
      <circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  hoarder: (
    <>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </>
  ),
  shadowfollow: (
    <>
      <circle cx="17" cy="12" r="2" />
      <path d="M3 12h9M9 9l3 3-3 3" />
    </>
  ),
  harvester: (
    <>
      <path d="M4 20 13 11" />
      <path d="M13 5a8 8 0 018 8h-8z" fill="currentColor" stroke="none" />
    </>
  ),
  assassin: (
    <>
      <path d="M12 2l2 6h-4z" fill="currentColor" stroke="none" />
      <path d="M12 8v9M8 11h8M12 17l1.5 3h-3z" />
    </>
  ),
  repeller: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 9V4M10.5 5.5 12 4l1.5 1.5" />
      <path d="M12 15v5M10.5 18.5 12 20l1.5-1.5" />
      <path d="M9 12H4M5.5 10.5 4 12l1.5 1.5" />
      <path d="M15 12h5M18.5 10.5 20 12l-1.5 1.5" />
    </>
  ),
  nomad: (
    <>
      <path d="M5 12a7 7 0 0 1 11-5.7" />
      <path d="M16 3v4h-4" />
      <path d="M19 12a7 7 0 0 1-11 5.7" />
      <path d="M8 21v-4h4" />
    </>
  ),
  catalyst: <path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" />,
  tithe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 15c0-3 6-3 6-6 0-1.5-1.3-2.2-3-2.2S9 7.5 9 9M12 5v2M12 17v2" />
    </>
  ),
  prism: (
    <>
      <path d="M12 3 4 19h16z" />
      <path d="M12 3v16M12 11l7 4M12 11 5 15" />
    </>
  ),
  magpie: (
    <>
      <path d="M5 14c3 0 5-2 5-5l4 1-2 3 4 4-7 0c-3 0-4-2-4-4z" fill="currentColor" stroke="none" />
      <circle cx="8" cy="10" r="0.9" fill="#0a0e1f" stroke="none" />
    </>
  ),
  alchemist: (
    <>
      <path d="M10 3h4M11 3v5l-5 9a2 2 0 002 3h8a2 2 0 002-3l-5-9V3" />
      <path d="M8 14h8" />
    </>
  ),
  lighthouse: (
    <>
      <path d="M9 21h6l-1-9h-4z" />
      <path d="M10 12l1-5h2l1 5M12 2v2M5 6l2 1M19 6l-2 1" />
    </>
  ),
  cartographer: (
    <>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  momentum: (
    <>
      <path d="M3 17c4 0 5-10 9-10s5 6 9 6" />
      <path d="M17 11l4 2-2 4" />
    </>
  ),
};

export function PowerIcon({ id, size = 20 }: { id: PowerId; size?: number }) {
  return (
    <svg
      className="power-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[id]}
    </svg>
  );
}
