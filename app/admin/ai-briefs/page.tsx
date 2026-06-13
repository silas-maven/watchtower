import { Role } from '@prisma/client';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { AssetOperationsPanel } from '@/components/AssetOperationsPanel';
import { AiControlsPanel } from '@/components/AiControlsPanel';
import { prisma } from '@/lib/prisma';
import { requirePageRole } from '@/lib/server/pageAuth';
import { getSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

type DigestSection = { title: string; lines: string[] };

function asSections(value: unknown): DigestSection[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (s): s is DigestSection =>
      !!s && typeof s === 'object' && typeof (s as DigestSection).title === 'string' && Array.isArray((s as DigestSection).lines),
  );
}

export default async function AiBriefsPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/ai-briefs');

  const [latest, digest, settings] = await Promise.all([
    prisma.dailyBrief.findFirst({ orderBy: { briefDate: 'desc' } }).catch(() => null),
    prisma.weeklyDigest.findFirst({ orderBy: { weekStart: 'desc' } }).catch(() => null),
    getSettings(),
  ]);

  const briefError = latest?.generationError ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">AI Briefs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The AI summarises deterministic market and signal state. It never creates trading truth. When the model is unavailable the brief falls back to a deterministic summary.
        </p>
      </div>

      {briefError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <div className="text-sm font-semibold text-foreground">Last brief used the deterministic fallback</div>
            <div className="mt-1 text-xs text-muted-foreground">{briefError}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              If you expect AI summaries, confirm OPENAI_API_KEY is set in the deployment environment.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Run now">
          <AssetOperationsPanel />
        </Card>
        <Card title="Controls">
          <AiControlsPanel
            initial={{
              ai_briefs_enabled: settings.ai_briefs_enabled,
              weekly_digest_enabled: settings.weekly_digest_enabled,
              ai_member_brief_enabled: settings.ai_member_brief_enabled,
            }}
          />
        </Card>
      </div>

      <Card
        title="Latest daily brief"
        right={latest ? <Badge tone={latest.isFallback ? 'amber' : 'emerald'}>{latest.isFallback ? 'Deterministic' : 'AI'}</Badge> : undefined}
      >
        {latest ? (
          <div className="space-y-2">
            <div className="text-sm leading-6 text-foreground">{latest.summary}</div>
            <div className="text-xs text-muted-foreground">
              {latest.briefDate.toISOString().slice(0, 10)} · {latest.model}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No brief generated yet.</div>
        )}
      </Card>

      <Card
        title="Latest weekly digest"
        right={digest ? <Badge tone={digest.isFallback ? 'amber' : 'emerald'}>{digest.isFallback ? 'Deterministic' : 'AI'}</Badge> : undefined}
      >
        {digest ? (
          <div className="space-y-4">
            <div className="text-sm leading-6 text-foreground">{digest.summary}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              {asSections(digest.sections).map((section) => (
                <div key={section.title} className="rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{section.title}</div>
                  <ul className="mt-2 space-y-1 text-sm text-foreground">
                    {section.lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Week of {digest.weekStart.toISOString().slice(0, 10)} · {digest.model}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No weekly digest generated yet. Use the control above to create one.</div>
        )}
      </Card>
    </div>
  );
}
