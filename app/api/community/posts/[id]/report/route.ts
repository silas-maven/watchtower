import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';

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
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;

    const post = await prisma.communityPost.findUnique({ where: { id }, select: { status: true } });
    if (!post) return fail('That post is no longer available.', 404, 'NOT_FOUND');

    await prisma.communityPost.update({ where: { id }, data: { reportCount: { increment: 1 } } });
    return ok({ reported: true });
  } catch (error) {
    return fromCaughtError(error);
  }
}
