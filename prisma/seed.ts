import path from 'node:path';
import { Role, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { importPortfolioSpreadsheet } from '../lib/spreadsheet/importer';

async function upsertUser(params: {
  email: string;
  name: string;
  role: Role;
  password: string;
  status: SubscriptionStatus;
  dueAt?: Date;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      role: params.role,
      passwordHash: hashPassword(params.password),
    },
    create: {
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash: hashPassword(params.password),
    },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      status: params.status,
      dueAt: params.dueAt,
      lastPaidAt: new Date(),
    },
    create: {
      userId: user.id,
      status: params.status,
      dueAt: params.dueAt,
      lastPaidAt: new Date(),
    },
  });

  return user;
}

async function main() {
  await upsertUser({
    email: 'owner@watchtower.demo',
    name: 'Owner Demo',
    role: Role.OWNER,
    password: 'demo-owner-123',
    status: SubscriptionStatus.ACTIVE,
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'admin@watchtower.demo',
    name: 'Admin Demo',
    role: Role.ADMIN,
    password: 'demo-admin-123',
    status: SubscriptionStatus.ACTIVE,
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'member@watchtower.demo',
    name: 'Member Demo',
    role: Role.MEMBER,
    password: 'demo-member-123',
    status: SubscriptionStatus.OVERDUE,
    dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'member2@watchtower.demo',
    name: 'Member Two',
    role: Role.MEMBER,
    password: 'demo-member2-123',
    status: SubscriptionStatus.ACTIVE,
    dueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'member3@watchtower.demo',
    name: 'Member Three',
    role: Role.MEMBER,
    password: 'demo-member3-123',
    status: SubscriptionStatus.PAUSED,
    dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'member4@watchtower.demo',
    name: 'Member Four',
    role: Role.MEMBER,
    password: 'demo-member4-123',
    status: SubscriptionStatus.OVERDUE,
    dueAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    email: 'member5@watchtower.demo',
    name: 'Member Five',
    role: Role.MEMBER,
    password: 'demo-member5-123',
    status: SubscriptionStatus.REMOVED,
    dueAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  });

  const xlsxPath = path.join(process.cwd(), 'reference', 'portfolio-blotter-upload.xlsx');
  await importPortfolioSpreadsheet(xlsxPath);

  console.log('Seed complete: demo users + spreadsheet import');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
