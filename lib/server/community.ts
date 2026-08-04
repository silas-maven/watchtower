import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { FEATURED_POOL_SIZE, POSTS_PER_DAY } from '@/lib/community';
import type { SessionUser } from '@/lib/auth';
import { sharedCommunity } from '@/lib/server/sharedCache';

// Server-side reads for the community feed. Kept out of the page so the same
// shapes serve the page, the API and the admin queue.

export type FeedReply = {
  id: string;
  alias: string;
  body: string;
  createdAt: string;
  mine: boolean;
  hidden: boolean;
};

export type FeedPost = FeedReply & {
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  featured: boolean;
  replies: FeedReply[];
};

/** Whether a moderator may act. Any admin can, which is the owner's rule. */
export function canModerate(user: Pick<SessionUser, 'role'>): boolean {
  return user.role === Role.OWNER || user.role === Role.ADMIN;
}

type Row = {
  id: string;
  profileId: string;
  alias: string;
  body: string;
  status: string;
  featured: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
};

function toReply(row: Row, viewerId: string): FeedReply {
  return {
    id: row.id,
    alias: row.alias,
    // A hidden post is blanked for everyone but its author, who is told what
    // happened rather than left wondering why their words vanished.
    body: row.status === 'PUBLISHED' || row.profileId === viewerId ? row.body : '',
    createdAt: row.createdAt.toISOString(),
    mine: row.profileId === viewerId,
    hidden: row.status !== 'PUBLISHED',
  };
}

/**
 * The feed as one viewer sees it.
 *
 * Hidden and removed posts are filtered in SQL for everyone except their own
 * author, who still sees their own marked as hidden. Nothing withheld is sent
 * to the browser, so a moderated post cannot be read out of the page source.
 */
export async function getFeed(
  viewer: Pick<SessionUser, 'id'>,
  { take = 25, cursor }: { take?: number; cursor?: string } = {},
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const visible = { OR: [{ status: 'PUBLISHED' }, { profileId: viewer.id }] };

  const rows = await prisma.communityPost.findMany({
    where: { parentId: null, ...visible },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      replies: { where: visible, orderBy: { createdAt: 'asc' }, take: 20 },
      likes: { where: { profileId: viewer.id }, select: { postId: true } },
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;

  return {
    posts: page.map((row) => ({
      ...toReply(row, viewer.id),
      likeCount: row.likeCount,
      replyCount: row.replyCount,
      likedByMe: row.likes.length > 0,
      featured: row.featured,
      replies: row.replies.map((r) => toReply(r, viewer.id)),
    })),
    nextCursor: hasMore ? page[page.length - 1]!.id : null,
  };
}

/**
 * Posts for the rotating slot on the Dashboard.
 *
 * Falls back to the newest published posts when the owner has featured nothing,
 * so a fresh install shows the feed working rather than an empty box.
 */
export async function getFeaturedPosts(): Promise<Array<{ id: string; alias: string; body: string; createdAt: string }>> {
  return sharedCommunity('featuredPosts', computeFeaturedPosts)();
}

async function computeFeaturedPosts(): Promise<Array<{ id: string; alias: string; body: string; createdAt: string }>> {
  const featured = await prisma.communityPost.findMany({
    where: { parentId: null, status: 'PUBLISHED', featured: true },
    orderBy: { createdAt: 'desc' },
    take: FEATURED_POOL_SIZE,
    select: { id: true, alias: true, body: true, createdAt: true },
  });

  const rows =
    featured.length > 0
      ? featured
      : await prisma.communityPost.findMany({
          where: { parentId: null, status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          take: FEATURED_POOL_SIZE,
          select: { id: true, alias: true, body: true, createdAt: true },
        });

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/**
 * Whether this member has posted too much in the last day. Replies count: the
 * limit is on how much of the feed one person can occupy, not on which control
 * they used.
 */
export async function overPostingLimit(profileId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.communityPost.count({
    where: { profileId, createdAt: { gte: since }, status: { not: 'REMOVED' } },
  });
  return used >= POSTS_PER_DAY;
}
