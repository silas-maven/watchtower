import Link from 'next/link';
import { PORTFOLIO_TOOLS } from '@/lib/portfolioTools';

/**
 * The calculators, surfaced on the Personal Finance page.
 *
 * The owner circled Compound Interest and CAGR on the Portfolio tools index in
 * the 4 August screenshots and asked for them to appear here too, where people
 * actually go looking for a calculator. The pension calculator joins them.
 *
 * Driven off the `personalFinance` flag in the shared registry rather than a
 * hand-written list. That is the same discipline the registry was created for:
 * the Dashboard once had a hand-written subset and two tools silently went
 * missing from it for weeks. A tool added to the registry with that flag appears
 * here automatically.
 */
export function PersonalFinanceTools() {
  const tools = PORTFOLIO_TOOLS.filter((t) => t.personalFinance);
  if (tools.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Calculators</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="rounded-2xl border border-border bg-card p-5 transition hover:bg-muted/50 hover:shadow-md"
          >
            <div className={`w-fit rounded-xl ${tool.iconBg} p-3`}>
              <tool.icon className={`h-6 w-6 ${tool.iconColor}`} />
            </div>
            <div className="mt-3 flex items-center gap-2 font-bold text-foreground">
              {tool.title}
              {!tool.free && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Members
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{tool.short}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
