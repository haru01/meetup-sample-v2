import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function main() {
  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', SALT_ROUNDS);

  // Create accounts
  const alice = await prisma.account.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      passwordHash,
    },
  });

  const bob = await prisma.account.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob',
      email: 'bob@example.com',
      passwordHash,
    },
  });

  const charlie = await prisma.account.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      name: 'Charlie',
      email: 'charlie@example.com',
      passwordHash,
    },
  });

  // Create communities
  const typescriptCommunity = await prisma.community.upsert({
    where: { name: 'TypeScript勉強会' },
    update: {},
    create: {
      name: 'TypeScript勉強会',
      category: 'TECH',
      visibility: 'PUBLIC',
    },
  });

  const startupCommunity = await prisma.community.upsert({
    where: { name: 'スタートアップ交流会' },
    update: {},
    create: {
      name: 'スタートアップ交流会',
      category: 'BUSINESS',
      visibility: 'PUBLIC',
    },
  });

  const bookCommunity = await prisma.community.upsert({
    where: { name: '読書サークル' },
    update: {},
    create: {
      name: '読書サークル',
      category: 'HOBBY',
      visibility: 'PRIVATE',
    },
  });

  // Create memberships: alice = OWNER of all 3
  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: typescriptCommunity.id, accountId: alice.id } },
    update: {},
    create: {
      communityId: typescriptCommunity.id,
      accountId: alice.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: startupCommunity.id, accountId: alice.id } },
    update: {},
    create: {
      communityId: startupCommunity.id,
      accountId: alice.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: bookCommunity.id, accountId: alice.id } },
    update: {},
    create: {
      communityId: bookCommunity.id,
      accountId: alice.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  // bob = MEMBER (ACTIVE) of TypeScript勉強会 and スタートアップ交流会
  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: typescriptCommunity.id, accountId: bob.id } },
    update: {},
    create: {
      communityId: typescriptCommunity.id,
      accountId: bob.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: startupCommunity.id, accountId: bob.id } },
    update: {},
    create: {
      communityId: startupCommunity.id,
      accountId: bob.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  // charlie = MEMBER (ACTIVE) of TypeScript勉強会
  await prisma.communityMember.upsert({
    where: { communityId_accountId: { communityId: typescriptCommunity.id, accountId: charlie.id } },
    update: {},
    create: {
      communityId: typescriptCommunity.id,
      accountId: charlie.id,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });

  console.log('Seed completed successfully');
  console.log(`Accounts: alice(${alice.id}), bob(${bob.id}), charlie(${charlie.id})`);
  console.log(`Communities: TypeScript勉強会(${typescriptCommunity.id}), スタートアップ交流会(${startupCommunity.id}), 読書サークル(${bookCommunity.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
