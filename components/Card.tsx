import { ReactNode } from 'react';

export function Card({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          <div className="text-sm text-zinc-600">{right}</div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
