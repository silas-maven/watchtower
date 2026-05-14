import { ReactNode } from 'react';
import { MagicCard } from '@/components/ui/magic-card';

export function Card({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <MagicCard
      className={`flex-col rounded-[1.75rem] border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,0.05)] backdrop-blur-xl ${className || ''}`}
      gradientColor="var(--muted)"
    >
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="text-sm font-semibold tracking-tight text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">{right}</div>
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
    </MagicCard>
  );
}
