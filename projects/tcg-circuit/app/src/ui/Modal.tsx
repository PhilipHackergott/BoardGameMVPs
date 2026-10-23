// The ONE modal/overlay shell — every overlay (rules, pause, settings, result, deck modal) is content
// dropped into this. Dim backdrop, centred themed panel, Esc/backdrop-click to close, focus restore,
// scroll-lock. Reduce-motion is handled by the .reduce-motion class on <body>.

import React, { useEffect, useRef } from "react";

export function Modal({
  title,
  children,
  onClose,
  width = 560,
  closable = true,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  width?: number;
  closable?: boolean;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable && onClose) onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [onClose, closable]);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && closable && onClose) onClose();
      }}
    >
      <div className="modal-panel" style={{ width }} ref={panelRef} tabIndex={-1} role="dialog" aria-label={title}>
        <div className="modal-title">
          <span>{title}</span>
          {closable && onClose && (
            <button className="modal-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-body" style={{ borderTop: "2px solid var(--line)" }}>{footer}</div>}
      </div>
    </div>
  );
}
