import { ReactNode, useEffect } from "react";

// The shared modal shell. One backdrop + panel + header (title + close button), with consistent
// click-outside-to-close and Esc-to-close. Every overlay should use this so the chrome (and the close
// affordance) stays uniform. The panel class is configurable for the few bespoke layouts (`help` for
// the rules sheet, `menu-panel` for the menus); the body is whatever children you pass.

export default function Modal({
  title,
  onClose,
  closeLabel = "Close",
  panelClass = "menu-panel",
  ariaLabel,
  headExtra,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  panelClass?: string;
  ariaLabel?: string;
  headExtra?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="help-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      onClick={onClose}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <h2>{title}</h2>
          {headExtra}
          <button type="button" className="primary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
