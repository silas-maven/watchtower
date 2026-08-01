import { Role } from '@prisma/client';
import { Megaphone } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { ReleaseNotes } from '@/components/ReleaseNotes';
import { requirePageRole } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { RELEASES } from '@/lib/releases';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function ReleasesPage() {
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/releases');

  // A live asset to make the "open an asset" deep links land on real data.
  const sample = await prisma.asset
    .findFirst({ where: { isActive: true, isMacro: false }, orderBy: { symbol: 'asc' }, select: { id: true } })
    .catch(() => null);

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

      <ReleaseNotes releases={RELEASES} sampleAssetId={sample?.id ?? null} />
    </div>
  );
}
