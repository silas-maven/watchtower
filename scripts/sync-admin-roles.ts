// Reconcile Profile.role against the SPA_OWNER_EMAIL_ALLOWLIST /
// SPA_ADMIN_EMAIL_ALLOWLIST environment variables.
//
// WHY THIS EXISTS
// ---------------
// The allowlists were historically only read when a profile was created. Anyone
// added to an allowlist after they had already signed up kept whatever role they
// had, forever. lib/auth.ts now re-checks on every session, so this script is
// only needed to repair profiles created before that fix shipped, or to apply an
// allowlist change without waiting for a deployment.
//
// Promotion only: an existing OWNER or ADMIN is never demoted here, because
// roles can also be granted directly in the database and removing admin is
// deliberately a manual act.
//
//   npx tsx --env-file=.env scripts/sync-admin-roles.ts           # dry run
//   npx tsx --env-file=.env scripts/sync-admin-roles.ts --apply   # write
//
// The allowlists are read from the environment, so to apply the PRODUCTION
// values from a local shell, set them on the command line explicitly.
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

const APPLY = process.argv.includes('--apply');

function envList(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function roleForEmail(email: string, existingRole: Role): Role {
  const normalized = email.toLowerCase();
  if (envList('SPA_OWNER_EMAIL_ALLOWLIST').has(normalized)) return Role.OWNER;
  if (envList('SPA_ADMIN_EMAIL_ALLOWLIST').has(normalized)) return Role.ADMIN;
  if (existingRole === Role.OWNER || existingRole === Role.ADMIN) return existingRole;
  return Role.MEMBER;
}

async function main() {
  const owners = envList('SPA_OWNER_EMAIL_ALLOWLIST');
  const admins = envList('SPA_ADMIN_EMAIL_ALLOWLIST');

  console.log(`owner allowlist : ${[...owners].join(', ') || '(empty)'}`);
  console.log(`admin allowlist : ${[...admins].join(', ') || '(empty)'}\n`);

  if (owners.size === 0 && admins.size === 0) {
    console.log('Both allowlists are empty. Refusing to run: this is almost certainly a');
    console.log('missing environment file rather than an intentional state.');
    return;
  }

  const profiles = await prisma.profile.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  const changes = profiles
    .map((p) => ({ ...p, next: roleForEmail(p.email, p.role) }))
    .filter((p) => p.next !== p.role);

  for (const p of profiles) {
    const next = roleForEmail(p.email, p.role);
    const flag = next === p.role ? '  ' : '->';
    console.log(`${flag} ${p.email.padEnd(34)} ${p.role.padEnd(6)} ${next === p.role ? '' : `becomes ${next}`}`);
  }

  // An allowlisted email with no profile has simply never signed in. Worth
  // reporting, because it looks identical to "the allowlist is not working".
  const known = new Set(profiles.map((p) => p.email.toLowerCase()));
  const missing = [...owners, ...admins].filter((e) => !known.has(e));
  if (missing.length > 0) {
    console.log(`\nAllowlisted but no profile yet (they have never signed in): ${missing.join(', ')}`);
  }

  console.log(`\n${changes.length} profile(s) to change.`);
  if (changes.length === 0) return;

  if (!APPLY) {
    console.log('DRY RUN. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await prisma.profile.update({ where: { id: c.id }, data: { role: c.next } });
    console.log(`  updated ${c.email} ${c.role} -> ${c.next}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
