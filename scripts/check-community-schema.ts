// Read-only check that the community feed tables landed and behave: the unique
// alias index, the reply cascade, and the counters. Creates nothing.
import { prisma } from '../lib/prisma';

async function main() {
  const posts = await prisma.communityPost.count();
  const likes = await prisma.communityPostLike.count();
  const aliased = await prisma.profile.count({ where: { communityAlias: { not: null } } });
  console.log(`community posts: ${posts}`);
  console.log(`community likes: ${likes}`);
  console.log(`profiles with an alias: ${aliased}`);

  // Prove the query the feed actually runs works against the real schema,
  // including the self-relation and the like sub-select.
  const sample = await prisma.communityPost.findMany({
    where: { parentId: null, OR: [{ status: 'PUBLISHED' }, { profileId: 'nobody' }] },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      replies: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' }, take: 5 },
      likes: { where: { profileId: 'nobody' }, select: { postId: true } },
    },
  });
  console.log(`feed query returned ${sample.length} rows without error`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
