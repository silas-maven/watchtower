import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { requireFeature } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { fromCaughtError } from '@/lib/route';
import { checkBody } from '@/lib/community';
import { getFeed, overPostingLimit } from '@/lib/server/community';

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const CreateSchema = z.object({
  body: z.string().max(2000),
  /** Present for a reply. Depth is capped at one: a reply cannot be replied to. */
  parentId: z.string().min(1).nullable().optional(),
});

/** The feed. Any signed-in profile may read it; free profiles read only. */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const feed = await getFeed(user, { cursor });
    return ok(feed);
  } catch (error) {
    return fromCaughtError(error);
  }
}

/** Create a post or a reply. Paying members only. */
export async function POST(req: Request) {
  try {
    const user = await requireFeature('communityPost');

    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { communityAlias: true },
    });
    if (!profile?.communityAlias) {
      return fail('Choose a display name before posting.', 400, 'NO_ALIAS');
    }

    const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail('Invalid payload', 400, 'INVALID_PAYLOAD');
    const parentId = parsed.data.parentId ?? null;

    const body = checkBody(parsed.data.body, { isReply: parentId != null });
    if (!body.ok) return fail(body.reason, 400, 'INVALID_BODY');

    if (await overPostingLimit(user.id)) {
      return fail('You have posted a lot today. Try again tomorrow.', 429, 'RATE_LIMITED');
    }

    if (parentId) {
      // The parent has to exist, be visible and be a top-level post. Without the
      // last check a reply could be hung off a reply and the feed would grow a
      // thread depth the UI has no way to render.
      const parent = await prisma.communityPost.findUnique({
        where: { id: parentId },
        select: { id: true, parentId: true, status: true },
      });
      if (!parent || parent.status !== 'PUBLISHED') return fail('That post is no longer available.', 404, 'NOT_FOUND');
      if (parent.parentId) return fail('You cannot reply to a reply.', 400, 'INVALID_PARENT');
    }

    // The counter and the row move together, so a reply can never exist without
    // being counted on its parent.
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: { profileId: user.id, alias: profile.communityAlias!, body: body.value, parentId },
      });
      if (parentId) {
        await tx.communityPost.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
      }
      return created;
    });

    return ok({
      post: {
        id: post.id,
        alias: post.alias,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
        parentId: post.parentId,
        likeCount: 0,
        replyCount: 0,
        likedByMe: false,
        featured: false,
        mine: true,
        hidden: false,
        replies: [],
      },
    });
  } catch (error) {
    return fromCaughtError(error);
  }
}
