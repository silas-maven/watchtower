import { fail, ok } from '@/lib/api';
import { requireFeature } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, fromCaughtError } from '@/lib/route';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

/**
 * Like and unlike. Paying members only, matching posting: the feed is something
 * a free profile reads, not something it takes part in.
 *
 * Both directions are written in a transaction with the denormalised counter, so
 * the count on the post and the rows in the like table cannot disagree. The
 * composite primary key on (postId, profileId) makes a double-tap harmless
 * rather than something the API has to read-then-check and race itself over.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireFeature('communityPost');
    // Each toggle is a transaction with two writes, so an unbounded like/unlike loop is a cheap way to hammer the database.
    const limited = enforceRateLimit('community', user.id);
    if (limited) return limited;

    const { id } = await params;

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { status: true } });
    if (!post || post.status !== 'PUBLISHED') return fail('That post is no longer available.', 404, 'NOT_FOUND');

    const liked = await prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostLike.findUnique({
        where: { postId_profileId: { postId: id, profileId: user.id } },
      });
      if (existing) {
        await tx.communityPostLike.delete({ where: { postId_profileId: { postId: id, profileId: user.id } } });
        await tx.communityPost.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
        return false;
      }
      await tx.communityPostLike.create({ data: { postId: id, profileId: user.id } });
      await tx.communityPost.update({ where: { id }, data: { likeCount: { increment: 1 } } });
      return true;
    });

    const after = await prisma.communityPost.findUnique({ where: { id }, select: { likeCount: true } });
    return ok({ liked, likeCount: after?.likeCount ?? 0 });
  } catch (error) {
    return fromCaughtError(error);
  }
}
