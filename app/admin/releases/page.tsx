import Link from 'next/link';
import { Role } from '@prisma/client';
import { Megaphone, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageRole } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { RELEASES, resolveHref } from '@/lib/releases';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function ReleasesPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/releases');

  // A live asset to make the "open an asset" deep links land on real data.
  const sample = await prisma.asset
    .findFirst({ where: { isActive: true, isMacro: false }, orderBy: { symbol: 'asc' }, select: { id: true } })
    .catch(() => null);
  const sampleId = sample?.id ?? null;

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-primary">
            <Megaphone className="h-4 w-4" /> What&rsquo;s new
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Release notes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            What has shipped, tied back to your feedback, with a link to each change so you can see it live.
          </p>
        </div>
      </BlurFade>

      {RELEASES.map((release, ri) => (
        <BlurFade key={release.version} delay={0.1 + ri * 0.05}>
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{release.title}</h2>
                  <Badge tone="emerald">v{release.version}</Badge>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{release.summary}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">
                  {new Date(release.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="mt-1">Source: {release.feedbackDoc}</div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {release.groups.map((group) => (
                <div key={group.heading} className="px-6 py-5">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{group.heading}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.items.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-border bg-background/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-bold text-foreground">{item.title}</div>
                          <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {item.feedback}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                        <Link
                          href={resolveHref(item.href, sampleId)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:underline"
                        >
                          {item.linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
}
