export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'zinc' | 'blue' | 'emerald' | 'rose' | 'amber' }) {
  const map: Record<string, string> = {
    zinc: 'bg-white/5 text-slate-300 border-white/10',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    amber: 'bg-[#f5c451]/10 text-[#f5c451] border-[#f5c451]/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${map[tone]}`}>
      {children}
    </span>
  );
}
