'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import type { MemberIntelligence } from '@/lib/server/memberIntelligence';

type Subscriber = {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'OVERDUE' | 'PAUSED' | 'REMOVED';
  accessState: 'ACTIVE' | 'PAUSED' | 'REMOVED';
  dueAt: string | null;
  overdueStage: number;
  declaredPortfolioGBP: number | null;
  averageInvestmentGBP: number | null;
};

type BillingAlert = { id: string; title: string; body: string; email: string | null; createdAt: string };
type AuditAction = { id: string; targetName: string; toState: string; reason: string | null; actorName: string | null; createdAt: string };

type Props = {
  intelligence: MemberIntelligence;
  subscribers: Subscriber[];
  billingAlerts: BillingAlert[];
  auditActions: AuditAction[];
};

type Tab = 'overview' | 'members' | 'billing' | 'audit';

function fmtGBP(value: number) {
  return `£${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function accessTone(state: string) {
  if (state === 'ACTIVE') return 'emerald' as const;
  if (state === 'PAUSED') return 'amber' as const;
  return 'rose' as const;
}

export function MembersHub({ intelligence, subscribers, billingAlerts, auditActions }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const t = intelligence.totals;

  const tabs: Array<{ key: Tab; label: string; badge?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members', badge: subscribers.length },
    { key: 'billing', label: 'Billing', badge: billingAlerts.length },
    { key: 'audit', label: 'Audit' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-muted/20 p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === item.key ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === item.key ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Members" value={String(t.members)} sub={`${t.activeAccess} active access`} />
            <Stat label="Active last 7d" value={String(t.activeLast7d)} sub={`${t.newLast30d} joined in 30d`} />
            <Stat label="Declared portfolios" value={fmtGBP(t.declaredPortfolioGBP)} sub="Self-reported total" />
            <Stat label="Tracked holdings value" value={fmtGBP(t.holdingsValueGBP)} sub={`${t.holdingsCount} positions, ${fmtGBP(t.holdingsInvestedGBP)} in`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground">Most held assets</div>
              <div className="mt-3 space-y-2">
                {intelligence.topHeldAssets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No member holdings recorded yet.</div>
                ) : (
                  intelligence.topHeldAssets.map((a) => (
                    <div key={a.symbol} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-semibold text-foreground">{a.symbol}</span>
                        <span className="ml-2 text-muted-foreground">{a.name}</span>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <span className="font-semibold text-foreground">{a.holders}</span> {a.holders === 1 ? 'holder' : 'holders'} · {fmtGBP(a.totalValueGBP)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold text-foreground">Most watched assets</div>
              <div className="mt-3 space-y-2">
                {intelligence.watchlistLeaders.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No watchlist items recorded yet.</div>
                ) : (
                  intelligence.watchlistLeaders.map((a) => (
                    <div key={a.symbol} className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <span className="font-semibold text-foreground">{a.symbol}</span>
                        <span className="ml-2 text-muted-foreground">{a.name}</span>
                      </div>
                      <div className="text-muted-foreground"><span className="font-semibold text-foreground">{a.watchers}</span> watching</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold text-foreground">Recent closed positions</div>
            <div className="mt-3 overflow-x-auto">
              {intelligence.recentClosedPositions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No closed positions logged yet.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4">Member</th>
                      <th className="py-2 pr-4">Symbol</th>
                      <th className="py-2 pr-4">Return</th>
                      <th className="py-2 pr-4">Profit</th>
                      <th className="py-2 pr-4">Closed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.recentClosedPositions.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-foreground">{c.member}</td>
                        <td className="py-2 pr-4 font-semibold text-foreground">{c.symbol}</td>
                        <td className={`py-2 pr-4 font-mono ${c.returnPct == null ? 'text-muted-foreground' : c.returnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {c.returnPct == null ? '—' : `${c.returnPct >= 0 ? '+' : ''}${c.returnPct.toFixed(1)}%`}
                        </td>
                        <td className="py-2 pr-4 font-mono text-foreground">{c.profitGBP == null ? '—' : fmtGBP(c.profitGBP)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{c.closedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'members' && <UserManagementPanel initialSubscribers={subscribers} />}

      {tab === 'billing' && (
        <div className="space-y-2">
          {billingAlerts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No open billing alerts. All members are current.</div>
          ) : (
            billingAlerts.map((notice) => (
              <div key={notice.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="font-bold text-foreground">{notice.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{notice.body}</div>
                <div className="mt-2 text-xs text-muted-foreground">{notice.email ?? 'Unknown'} · {notice.createdAt.slice(0, 16).replace('T', ' ')}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-2">
          {auditActions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No access changes recorded yet.</div>
          ) : (
            auditActions.map((action) => (
              <div key={action.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {action.toState === 'ACTIVE' ? '✓' : action.toState === 'PAUSED' ? '‖' : '✕'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="truncate">{action.targetName}</span>
                    <Badge tone={accessTone(action.toState)}>{action.toState}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {action.reason ?? 'No reason given'} · by {action.actorName ?? 'System'} · {action.createdAt.slice(0, 16).replace('T', ' ')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
