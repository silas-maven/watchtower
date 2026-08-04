import { Prisma } from '@prisma/client';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

/**
 * Report a post for a moderator to look at.
 *
 * Open to any signed-in profile, including free ones, deliberately: a free
 * member reads the feed, so a free member is exactly as likely to be the one who
 * sees something that should not be there. Gating the report control would mean
 * the people doing most of the reading could not tell anyone.
 *
 * Reporting does not hide anything. It raises the post in the admin queue and a
 * person decides. Letting a report auto-hide would hand any member a veto over
 * anyone else's post.
 *
 * ONE REPORT PER MEMBER PER POST, enforced by the composite primary key on
 * CommunityPostReport rather than by reading first. This used to be a bare
 * `reportCount: { increment: 1 }` that any member could call in a loop, and
 * since the moderation queue sorts by reportCount, one person could bury every
 * genuine report under a post of their choosing. The rate limit in front of this
 * slows that down; the constraint is what makes a second report a no-op.
 *
 * Reporting again is not an error. It reports success without counting twice,
 * because from the member's side the post IS reported, and an error there would
 * only make them wonder whether it worked the first time.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    // Deliberately the tightest bucket. Even with the constraint below making
    // duplicates harmless, an unbounded loop still costs a transaction each time.
    const limited = enforceRateLimit('report', user.id);
    if (limited) return limited;

    const { id } = await params;

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { id: true } });
    if (!post) return fail('That post is no longer available.', 404, 'NOT_FOUND');

    // The row and the counter move together, so the denormalised count can never
    // drift from the number of distinct people who actually reported.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.communityPostReport.create({ data: { postId: id, profileId: user.id } });
        await tx.communityPost.update({ where: { id }, data: { reportCount: { increment: 1 } } });
      });
    } catch (error) {
      // P2002 = this member has already reported this post. Idempotent, not a
      // failure: the desired state already holds.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return ok({ reported: true, alreadyReported: true });
      }
      throw error;
    }

    return ok({ reported: true, alreadyReported: false });
  } catch (error) {
    return fromCaughtError(error);
  }
}
