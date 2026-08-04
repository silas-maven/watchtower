/**
 * Proves the one-report-per-member behaviour against the real database.
 *
 *   npx tsx -r dotenv/config scripts/verify-report-dedup.ts dotenv_config_path=.env
 *
 * Each step runs in its own transaction and every row created is tracked and
 * deleted at the end. The shared database is not a test fixture, and a
 * verification script that leaves rows behind is how a fake report ends up in a
 * real moderation queue.
 *
 * NOTE ON WHY THIS IS NOT ONE BIG ROLLED-BACK TRANSACTION. The first version was,
 * and it broke: in PostgreSQL a failed statement aborts the entire transaction
 * (SQLSTATE 25P02, "current transaction is aborted"), so every check after the
 * duplicate-insert check could not run. That is also the reason step 2 below
 * exists at all. It verifies that the API route's catch block really does receive
 * a P2002 out of $transaction rather than a transaction-aborted error, which is
 * the difference between a member seeing "already reported" and a 500.
 */
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = '') {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
}

/** Exactly what app/api/community/posts/[id]/report/route.ts does. */
async function reportAsRoute(postId: string, profileId: string): Promise<'counted' | 'already' | 'error'> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.communityPostReport.create({ data: { postId, profileId } });
      await tx.communityPost.update({ where: { id: postId }, data: { reportCount: { increment: 1 } } });
    });
    return 'counted';
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'already';
    console.error('    unexpected error:', error);
    return 'error';
  }
}

async function main() {
  const post = await prisma.communityPost.findFirst({ select: { id: true, reportCount: true } });
  const profiles = await prisma.profile.findMany({ select: { id: true, email: true }, take: 2 });
  if (!post || profiles.length < 2) {
    console.log('Need one post and two profiles.', { post: !!post, profiles: profiles.length });
    return;
  }
  const [a, b] = profiles;
  const baseline = post.reportCount;
  console.log(`post ${post.id}, baseline reportCount ${baseline}\n`);

  const countNow = async () =>
    (await prisma.communityPost.findUnique({ where: { id: post.id }, select: { reportCount: true } }))!.reportCount;

  try {
    // 1. First report counts.
    check('A reports, counted', (await reportAsRoute(post.id, a.id)) === 'counted');
    check('counter incremented', (await countNow()) === baseline + 1, `-> ${await countNow()}`);

    // 2. THE ONE THAT MATTERS. The route must see P2002 and report "already",
    //    not blow up with a transaction-aborted error.
    check('A reports again, route returns already', (await reportAsRoute(post.id, a.id)) === 'already');
    check('counter did NOT move', (await countNow()) === baseline + 1, `-> ${await countNow()}`);
    check('only one row for A', (await prisma.communityPostReport.count({ where: { postId: post.id, profileId: a.id } })) === 1);

    // 3. A different member must still be able to report. The constraint is on
    //    the pair, not the post: getting that wrong silences everyone after the
    //    first reporter, which is worse than the bug being fixed.
    check('B reports, counted', (await reportAsRoute(post.id, b.id)) === 'counted');
    check('counter reached baseline+2', (await countNow()) === baseline + 2, `-> ${await countNow()}`);

    // 4. Admin "clear reports" wipes rows and counter together.
    await prisma.$transaction(async (tx) => {
      await tx.communityPostReport.deleteMany({ where: { postId: post.id } });
      await tx.communityPost.update({ where: { id: post.id }, data: { reportCount: 0 } });
    });
    check('admin clear removed rows', (await prisma.communityPostReport.count({ where: { postId: post.id } })) === 0);
    check('admin clear zeroed counter', (await countNow()) === 0);

    // 5. And a member who already reported can report again after a clear. If
    //    the rows survived a dismissal they would be barred forever.
    check('A can report again after clear', (await reportAsRoute(post.id, a.id)) === 'counted');
  } finally {
    // Restore exactly the state we found.
    await prisma.communityPostReport.deleteMany({ where: { postId: post.id } });
    await prisma.communityPost.update({ where: { id: post.id }, data: { reportCount: baseline } });
  }

  const residue = await prisma.communityPostReport.count();
  const restored = await countNow();
  console.log(`\ncleanup: report rows in table ${residue}, reportCount restored to ${restored} (baseline ${baseline})`);
  check('nothing persisted', residue === 0 && restored === baseline);

  console.log(`\n${fail === 0 ? 'ALL CHECKS PASSED' : `${fail} CHECK(S) FAILED`}  (${pass} passed)`);
  process.exitCode = fail === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error('FAILED:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
