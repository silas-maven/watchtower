'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type CheckboxOption = {
  value: string;
  label: string;
  /** How many rows currently carry this value. Shown so an option that would */
  /** return nothing is obvious before it is ticked. */
  count?: number;
};

/**
 * A tick-box dropdown for filters that should allow more than one choice at a
 * time (market-cap bands, product types).
 *
 * No selection means "everything", which keeps the default view complete: a
 * filter should never hide rows until the member has actually asked it to.
 */
export function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const summary =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? label)
        : `${label}: ${selected.length}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none ${
          selected.length > 0
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-border bg-background text-foreground hover:border-primary/50'
        }`}
      >
        {summary}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 min-w-52 rounded-lg border border-border bg-card p-1 shadow-lg">
          {options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={opt.label}
                onClick={() => toggle(opt.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted/50"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className={`flex-1 ${on ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{opt.label}</span>
                {opt.count != null && <span className="font-mono text-[10px] text-muted-foreground">{opt.count}</span>}
              </button>
            );
          })}

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full border-t border-border px-2 py-1.5 text-left text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
