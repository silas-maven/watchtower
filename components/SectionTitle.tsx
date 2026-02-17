export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-zinc-600">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
