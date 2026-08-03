import { BlurFade } from '@/components/ui/blur-fade';
import { requirePageUser } from '@/lib/server/pageAuth';
import { canUse } from '@/lib/entitlements';
import { prisma } from '@/lib/prisma';
import { getFeed, canModerate } from '@/lib/server/community';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { trackEvent } from '@/lib/server/trackEvent';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'fra1';

export default async function CommunityPage() {
  // Sign-in is the whole gate on visibility. Nothing here is reachable signed
  // out, so no member post is ever crawled or indexed under the academy's
  // domain. Free profiles read; paying members post, reply and like.
  const profile = await requirePageUser('/app/community');
  const canPost = canUse(profile, 'communityPost');

  const [{ posts, nextCursor }, me] = await Promise.all([
    getFeed(profile).catch(() => ({ posts: [], nextCursor: null })),
    prisma.profile.findUnique({ where: { id: profile.id }, select: { communityAlias: true } }).catch(() => null),
  ]);

  trackEvent(profile.id, 'PAGE_VIEW', undefined, '/app/community');

  return (
    <div className="space-y-8 pb-12">
      <BlurFade delay={0.05}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-primary">Community</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Community feed</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            What members are watching, in their own words, under a name of their choosing. Visible only to people signed
            in to the academy.
          </p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <CommunityFeed
          initialPosts={posts}
          initialCursor={nextCursor}
          canPost={canPost}
          canModerate={canModerate(profile)}
          alias={me?.communityAlias ?? null}
        />
      </BlurFade>
    </div>
  );
}
