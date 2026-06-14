'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

export type RowAction = {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success' | 'primary';
  disabled?: boolean;
};

const toneClass: Record<NonNullable<RowAction['tone']>, string> = {
  default: 'text-foreground',
  danger: 'text-rose-500',
  success: 'text-emerald-500',
  primary: 'text-primary',
};

/**
 * Compact per-row "⋯" menu for table actions. Rendered into a portal and
 * positioned against the trigger so the table's overflow does not clip it.
 */
export function RowActionsMenu({ actions, disabled }: { actions: RowAction[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && pos && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="menu"
              className="fixed z-[91] min-w-[11rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
              style={{ top: pos.top, right: pos.right }}
            >
              {actions.map((action, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50 ${toneClass[action.tone ?? 'default']}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
