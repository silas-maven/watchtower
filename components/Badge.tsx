export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'zinc' | 'blue' | 'emerald' | 'rose' }) {
  const map: Record<string, string> = {
    zinc: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
