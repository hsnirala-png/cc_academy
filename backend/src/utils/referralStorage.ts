import { prisma } from "./prisma";
import { hasColumn, hasIndex } from "./schemaGuards";

let isReferralStorageReady = false;
let referralStoragePromise: Promise<void> | null = null;

const ensureUserReferralColumns = async (): Promise<void> => {
  if (!(await hasColumn("User", "referralCode"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `referralCode` VARCHAR(191) NULL")
      .catch(() => undefined);
  }
  if (!(await hasColumn("User", "referrerId"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `User` ADD COLUMN `referrerId` VARCHAR(191) NULL")
      .catch(() => undefined);
  }

  if (!(await hasIndex("User", "User_referralCode_key"))) {
    await prisma
      .$executeRawUnsafe("CREATE UNIQUE INDEX `User_referralCode_key` ON `User`(`referralCode`)")
      .catch(() => undefined);
  }
  if (!(await hasIndex("User", "User_referrerId_idx"))) {
    await prisma
      .$executeRawUnsafe("CREATE INDEX `User_referrerId_idx` ON `User`(`referrerId`)")
      .catch(() => undefined);
  }

  const fkRows = (await prisma.$queryRawUnsafe(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'User'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'User_referrerId_fkey'
      LIMIT 1
    `
  )) as Array<{ CONSTRAINT_NAME: string }>;

  if (!fkRows.length) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `User` ADD CONSTRAINT `User_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureReferralTables = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ReferralPayoutMethod\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`type\` VARCHAR(32) NOT NULL,
      \`bankName\` VARCHAR(191) NULL,
      \`accountNo\` VARCHAR(191) NULL,
      \`ifsc\` VARCHAR(191) NULL,
      \`place\` VARCHAR(191) NULL,
      \`upiId\` VARCHAR(191) NULL,
      \`isVerified\` BOOLEAN NOT NULL DEFAULT false,
      \`verifiedAt\` DATETIME(3) NULL,
      \`verifiedBy\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`ReferralPayoutMethod_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
      INDEX \`ReferralPayoutMethod_isVerified_type_idx\` (\`isVerified\`, \`type\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ReferralWithdrawal\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`payoutMethodId\` VARCHAR(191) NOT NULL,
      \`amount\` DECIMAL(10,2) NOT NULL,
      \`status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
      \`requestedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`reviewedAt\` DATETIME(3) NULL,
      \`reviewedBy\` VARCHAR(191) NULL,
      \`adminNote\` VARCHAR(500) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`ReferralWithdrawal_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
      INDEX \`ReferralWithdrawal_status_createdAt_idx\` (\`status\`, \`createdAt\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ReferralTransaction\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`amount\` DECIMAL(10,2) NOT NULL,
      \`type\` VARCHAR(64) NOT NULL,
      \`description\` VARCHAR(500) NULL,
      \`purchaseId\` VARCHAR(191) NULL,
      \`withdrawalId\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      INDEX \`ReferralTransaction_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
      INDEX \`ReferralTransaction_type_createdAt_idx\` (\`type\`, \`createdAt\`),
      INDEX \`ReferralTransaction_purchaseId_idx\` (\`purchaseId\`),
      INDEX \`ReferralTransaction_withdrawalId_idx\` (\`withdrawalId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const ensureReferralForeignKeys = async (): Promise<void> => {
  const existingFks = (await prisma.$queryRawUnsafe(
    `
      SELECT TABLE_NAME, CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND TABLE_NAME IN ('ReferralPayoutMethod', 'ReferralWithdrawal', 'ReferralTransaction')
    `
  )) as Array<{ TABLE_NAME: string; CONSTRAINT_NAME: string }>;

  const fkSet = new Set(existingFks.map((item) => `${item.TABLE_NAME}:${item.CONSTRAINT_NAME}`));

  if (!fkSet.has("ReferralPayoutMethod:ReferralPayoutMethod_userId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ReferralPayoutMethod` ADD CONSTRAINT `ReferralPayoutMethod_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!fkSet.has("ReferralWithdrawal:ReferralWithdrawal_userId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ReferralWithdrawal` ADD CONSTRAINT `ReferralWithdrawal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!fkSet.has("ReferralWithdrawal:ReferralWithdrawal_payoutMethodId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ReferralWithdrawal` ADD CONSTRAINT `ReferralWithdrawal_payoutMethodId_fkey` FOREIGN KEY (`payoutMethodId`) REFERENCES `ReferralPayoutMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!fkSet.has("ReferralTransaction:ReferralTransaction_userId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!fkSet.has("ReferralTransaction:ReferralTransaction_withdrawalId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `ReferralWithdrawal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

export const ensureReferralStorageReady = async (): Promise<void> => {
  if (isReferralStorageReady) return;
  if (referralStoragePromise) return referralStoragePromise;

  referralStoragePromise = (async () => {
    await ensureUserReferralColumns();
    await ensureReferralTables();
    await ensureReferralForeignKeys();
    isReferralStorageReady = true;
  })().finally(() => {
    referralStoragePromise = null;
  });

  return referralStoragePromise;
};
