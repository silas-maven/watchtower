import { z } from 'zod';
import { Role } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { POST_STATUSES } from '@/lib/community';
import { CACHE_TAGS, invalidateShared } from '@/lib/server/sharedCache';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  id: z.string().min(1),
  /** One of the moderation actions, or the feature toggle. */
  status: z.enum(POST_STATUSES).optional(),
  featured: z.boolean().optional(),
  /** Required when hiding or removing: the reason has to be on file. */
  moderationNote: z.string().trim().max(280).optional().nullable(),
  /** Set to clear the report flag without changing the post. */
  clearReports: z.boolean().optional(),
});

/** The moderation queue: reported first, then newest. Any admin may read it. */
export async function GET() {
  try {
    await requireRole([Role.OWNER, Role.ADMIN]);

    const posts = await prisma.communityPost.findMany({
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        profile: { select: { id: true, name: true, email: true, tier: true } },
        moderatedBy: { select: { name: true } },
        parent: { select: { id: true, alias: true, body: true } },
      },
    });

    return ok({ posts });
  } catch (error) {
    return fromCaughtError(error);
  }
}

/**
 * Moderate a post. Any admin may act; the owner's rule is that admin access is
 * moderator access, with no separate role.
 *
 * Nothing is ever hard-deleted. HIDDEN takes it out of the feed but leaves it
 * visible to its author, marked, so they are told what happened rather than left
 * wondering. REMOVED takes it from everyone. Both are reversible by setting the
 * status back, which is the point of keeping the row.
 */
export async function PATCH(req: Request) {
  try {
    const actor = await requireRole([Role.OWNER, Role.ADMIN]);

    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');
    const { id, status, featured, moderationNote, clearReports } = parsed.data;

    const post = await prisma.communityPost.findUnique({
      where: { id },
      select: { id: true, status: true, parentId: true },
    });
    if (!post) return fail('Post not found', 404, 'NOT_FOUND');

    // A reason is required when taking something down, and only then. Without
    // it there is no answer to "why was my post removed" three weeks later.
    const takingDown = status === 'HIDDEN' || status === 'REMOVED';
    if (takingDown && !moderationNote?.trim()) {
      return fail('Give a reason when hiding or removing a post.', 400, 'REASON_REQUIRED');
    }

    // Moderating a reply has to move its parent's counter with it, or the parent
    // goes on advertising "3 replies" above two visible ones. The counter is
    // denormalised so the feed does not aggregate per row; that is only worth
    // having if it stays true.
    const wasVisible = post.status === 'PUBLISHED';
    const willBeVisible = status ? status === 'PUBLISHED' : wasVisible;
    const replyDelta = post.parentId && wasVisible !== willBeVisible ? (willBeVisible ? 1 : -1) : 0;

    const updated = await prisma.$transaction(async (tx) => {
      // Clearing reports has to remove the rows as well as zero the counter.
      // CommunityPostReport is the truth behind reportCount, and one report per
      // member is enforced by its primary key, so leaving the rows behind would
      // both make the counter disagree with them and permanently bar everyone
      // who reported this post once from ever reporting it again. Dismissing a
      // report means "this was looked at and it was fine", which has to reset
      // the slate on both sides.
      if (clearReports) {
        await tx.communityPostReport.deleteMany({ where: { postId: id } });
      }

      const row = await tx.communityPost.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(featured != null ? { featured } : {}),
          ...(clearReports ? { reportCount: 0 } : {}),
          ...(status
            ? { moderationNote: moderationNote ?? null, moderatedAt: new Date(), moderatedById: actor.id }
            : {}),
        },
        select: { id: true, status: true, featured: true, reportCount: true },
      });
      if (replyDelta !== 0 && post.parentId) {
        await tx.communityPost.update({
          where: { id: post.parentId },
          data: { replyCount: { increment: replyDelta } },
        });
      }
      return row;
    });

    // Featuring something that is not visible would put it on the Dashboard for
    // everyone while the feed itself hides it.
    if (updated.featured && updated.status !== 'PUBLISHED') {
      await prisma.communityPost.update({ where: { id }, data: { featured: false } });
      updated.featured = false;
    }

    // A moderator hiding or featuring a post should see the Dashboard slot
    // change now, not in a minute.
    invalidateShared(CACHE_TAGS.community);

    return ok({ post: updated });
  } catch (error) {
    return fromCaughtError(error);
  }
}
