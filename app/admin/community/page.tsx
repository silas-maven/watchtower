import { Role } from '@prisma/client';
import { MessagesSquare } from 'lucide-react';
import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageRole } from '@/lib/server/pageAuth';
import { prisma } from '@/lib/prisma';
import { ModerationQueue, type QueueRow } from '@/components/community/ModerationQueue';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function AdminCommunityPage() {
  // Any admin moderates. The owner's rule: admin access is moderator access,
  // with no separate role to grant and forget about.
  await requirePageRole([Role.OWNER, Role.ADMIN], '/admin/community');

  const posts = await prisma.communityPost
    .findMany({
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        profile: { select: { name: true, email: true, tier: true } },
        moderatedBy: { select: { name: true } },
        parent: { select: { id: true, alias: true } },
      },
    })
    .catch(() => []);

  const rows: QueueRow[] = posts.map((p) => ({
    id: p.id,
    alias: p.alias,
    body: p.body,
    status: p.status,
    featured: p.featured,
    likeCount: p.likeCount,
    replyCount: p.replyCount,
    reportCount: p.reportCount,
    isReply: p.parentId != null,
    replyingTo: p.parent?.alias ?? null,
    moderationNote: p.moderationNote,
    moderatedBy: p.moderatedBy?.name ?? null,
    authorName: p.profile.name,
    authorEmail: p.profile.email,
    authorTier: p.profile.tier,
    createdAt: p.createdAt.toISOString(),
  }));

  const reported = rows.filter((r) => r.reportCount > 0).length;

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-primary">
            <MessagesSquare className="h-4 w-4" /> Community
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Moderation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Everything members have posted, reported items first. Hiding leaves a post visible to whoever wrote it,
            marked, so they know what happened. Removing takes it from everyone. Neither deletes anything, so both can be
            undone.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <ModerationQueue initialRows={rows} reportedCount={reported} />
      </BlurFade>
    </div>
  );
}
