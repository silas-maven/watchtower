import path from 'node:path';
import { AccessState, Role, SubscriptionStatus, UsageEventType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { importPortfolioSpreadsheet } from '../lib/spreadsheet/importer';

async function upsertProfile(params: {
  clerkUserId: string;
  email: string;
  name: string;
  role: Role;
  accessState: AccessState;
  status: SubscriptionStatus;
  dueAt?: Date;
  declaredPortfolioGBP?: number;
  averageInvestmentGBP?: number;
}) {
  const profile = await prisma.profile.upsert({
    where: { email: params.email },
    update: {
      clerkUserId: params.clerkUserId,
      name: params.name,
      role: params.role,
      accessState: params.accessState,
      declaredPortfolioGBP: params.declaredPortfolioGBP,
      averageInvestmentGBP: params.averageInvestmentGBP,
      lastSeenAt: new Date(),
    },
    create: {
      clerkUserId: params.clerkUserId,
      email: params.email,
      name: params.name,
      role: params.role,
      accessState: params.accessState,
      declaredPortfolioGBP: params.declaredPortfolioGBP,
      averageInvestmentGBP: params.averageInvestmentGBP,
      lastSeenAt: new Date(),
      watchlists: { create: { name: 'My Watchlist', isDefault: true } },
    },
  });

  await prisma.subscriptionMirror.upsert({
    where: { profileId: profile.id },
    update: { status: params.status, currentPeriodEnd: params.dueAt, lastPaidAt: new Date() },
    create: { profileId: profile.id, status: params.status, currentPeriodEnd: params.dueAt, lastPaidAt: new Date() },
  });

  await prisma.userPortfolio.create({
    data: {
      profileId: profile.id,
      declaredValueGBP: params.declaredPortfolioGBP,
      investedAmountGBP: params.averageInvestmentGBP,
      cashAmountGBP: params.declaredPortfolioGBP && params.averageInvestmentGBP ? params.declaredPortfolioGBP - params.averageInvestmentGBP : null,
    },
  }).catch(() => null);

  return profile;
}

async function main() {
  const now = Date.now();
  await upsertProfile({ clerkUserId: 'demo_clerk_owner', email: 'owner@watchtower.demo', name: 'Owner Demo', role: Role.OWNER, accessState: AccessState.ACTIVE, status: SubscriptionStatus.ACTIVE, dueAt: new Date(now + 7 * 86400000), declaredPortfolioGBP: 250000, averageInvestmentGBP: 6500 });
  await upsertProfile({ clerkUserId: 'demo_clerk_admin', email: 'admin@watchtower.demo', name: 'Admin Demo', role: Role.ADMIN, accessState: AccessState.ACTIVE, status: SubscriptionStatus.ACTIVE, dueAt: new Date(now + 7 * 86400000), declaredPortfolioGBP: 120000, averageInvestmentGBP: 4200 });

  const members = await Promise.all([
    upsertProfile({ clerkUserId: 'demo_clerk_member_1', email: 'member@watchtower.demo', name: 'Member Demo', role: Role.MEMBER, accessState: AccessState.ACTIVE, status: SubscriptionStatus.OVERDUE, dueAt: new Date(now - 2 * 86400000), declaredPortfolioGBP: 18000, averageInvestmentGBP: 900 }),
    upsertProfile({ clerkUserId: 'demo_clerk_member_2', email: 'member2@watchtower.demo', name: 'Member Two', role: Role.MEMBER, accessState: AccessState.ACTIVE, status: SubscriptionStatus.ACTIVE, dueAt: new Date(now + 21 * 86400000), declaredPortfolioGBP: 42000, averageInvestmentGBP: 1400 }),
    upsertProfile({ clerkUserId: 'demo_clerk_member_3', email: 'member3@watchtower.demo', name: 'Member Three', role: Role.MEMBER, accessState: AccessState.PAUSED, status: SubscriptionStatus.ACTIVE, dueAt: new Date(now + 4 * 86400000), declaredPortfolioGBP: 7600, averageInvestmentGBP: 350 }),
    upsertProfile({ clerkUserId: 'demo_clerk_member_4', email: 'member4@watchtower.demo', name: 'Member Four', role: Role.MEMBER, accessState: AccessState.ACTIVE, status: SubscriptionStatus.OVERDUE, dueAt: new Date(now - 5 * 86400000), declaredPortfolioGBP: 95000, averageInvestmentGBP: 2200 }),
    upsertProfile({ clerkUserId: 'demo_clerk_member_5', email: 'member5@watchtower.demo', name: 'Member Five', role: Role.MEMBER, accessState: AccessState.REMOVED, status: SubscriptionStatus.REMOVED, dueAt: new Date(now - 15 * 86400000), declaredPortfolioGBP: 12500, averageInvestmentGBP: 600 }),
  ]);

  const xlsxPath = path.join(process.cwd(), 'reference', 'portfolio-blotter-upload.xlsx');
  await importPortfolioSpreadsheet(xlsxPath);

  const sampleAssets = await prisma.asset.findMany({ where: { isActive: true }, take: 8, orderBy: { symbol: 'asc' } });
  for (const [idx, member] of members.entries()) {
    const watchlist = await prisma.userWatchlist.findFirst({ where: { profileId: member.id, isDefault: true } });
    if (!watchlist) continue;
    for (const asset of sampleAssets.slice(idx, idx + 3)) {
      await prisma.userWatchlistItem.upsert({ where: { watchlistId_assetId: { watchlistId: watchlist.id, assetId: asset.id } }, update: {}, create: { watchlistId: watchlist.id, assetId: asset.id } });
    }
    await prisma.usageEvent.createMany({
      data: [
        { profileId: member.id, type: UsageEventType.SIGN_IN, path: '/app' },
        { profileId: member.id, type: UsageEventType.PAGE_VIEW, path: '/app/watchlists' },
        { profileId: member.id, type: UsageEventType.ASSET_VIEW, path: '/app/assets' },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Seed complete: Clerk-linked profiles, subscription mirrors, analytics fixtures, and spreadsheet import');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
