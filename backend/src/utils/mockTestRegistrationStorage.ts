import { prisma } from "./prisma";
import { hasColumn, hasConstraint, hasIndex } from "./schemaGuards";

let isMockTestRegistrationStorageReady = false;
let mockTestRegistrationStoragePromise: Promise<void> | null = null;

const ensureGateTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`MockTestRegistrationGate\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`description\` TEXT NULL,
      \`popupImageUrl\` VARCHAR(1000) NULL,
      \`freeAttemptLimit\` INT NOT NULL DEFAULT 1,
      \`buyNowUrl\` VARCHAR(1000) NULL,
      \`ctaLabel\` VARCHAR(120) NOT NULL DEFAULT 'Buy Mock',
      \`scheduledDate\` DATE NULL,
      \`scheduledTimeSlot\` VARCHAR(10) NULL,
      \`isActive\` TINYINT(1) NOT NULL DEFAULT 1,
      \`createdBy\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  if (!(await hasIndex("MockTestRegistrationGate", "MockTestRegistrationGate_mockTestId_key"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE UNIQUE INDEX `MockTestRegistrationGate_mockTestId_key` ON `MockTestRegistrationGate`(`mockTestId`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationGate", "MockTestRegistrationGate_isActive_updatedAt_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationGate_isActive_updatedAt_idx` ON `MockTestRegistrationGate`(`isActive`, `updatedAt`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationGate", "MockTestRegistrationGate_createdBy_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationGate_createdBy_idx` ON `MockTestRegistrationGate`(`createdBy`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationGate", "scheduledDate"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `MockTestRegistrationGate` ADD COLUMN `scheduledDate` DATE NULL")
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationGate", "scheduledTimeSlot"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationGate` ADD COLUMN `scheduledTimeSlot` VARCHAR(10) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasConstraint("MockTestRegistrationGate", "MockTestRegistrationGate_mockTestId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationGate` ADD CONSTRAINT `MockTestRegistrationGate_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!(await hasConstraint("MockTestRegistrationGate", "MockTestRegistrationGate_createdBy_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationGate` ADD CONSTRAINT `MockTestRegistrationGate_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureEntryTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`MockTestRegistrationEntry\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`gateId\` VARCHAR(191) NOT NULL,
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`fullName\` VARCHAR(191) NOT NULL,
      \`mobile\` VARCHAR(30) NOT NULL,
      \`email\` VARCHAR(191) NULL,
      \`friendReferralCode\` VARCHAR(64) NULL,
      \`referredByUserId\` VARCHAR(191) NULL,
      \`noFriendReferral\` TINYINT(1) NOT NULL DEFAULT 0,
      \`preferredExamType\` VARCHAR(20) NULL,
      \`preferredStreamChoice\` VARCHAR(40) NULL,
      \`preferredDate\` DATE NULL,
      \`preferredTimeSlot\` VARCHAR(10) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  if (!(await hasColumn("MockTestRegistrationEntry", "preferredExamType"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `preferredExamType` VARCHAR(20) NULL")
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "friendReferralCode"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `friendReferralCode` VARCHAR(64) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "referredByUserId"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `referredByUserId` VARCHAR(191) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "noFriendReferral"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `noFriendReferral` TINYINT(1) NOT NULL DEFAULT 0"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "preferredStreamChoice"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `preferredStreamChoice` VARCHAR(40) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "preferredDate"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `preferredDate` DATE NULL")
      .catch(() => undefined);
  }

  if (!(await hasColumn("MockTestRegistrationEntry", "preferredTimeSlot"))) {
    await prisma
      .$executeRawUnsafe("ALTER TABLE `MockTestRegistrationEntry` ADD COLUMN `preferredTimeSlot` VARCHAR(10) NULL")
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationEntry", "MockTestRegistrationEntry_gateId_userId_key"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE UNIQUE INDEX `MockTestRegistrationEntry_gateId_userId_key` ON `MockTestRegistrationEntry`(`gateId`, `userId`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationEntry", "MockTestRegistrationEntry_mockTestId_createdAt_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationEntry_mockTestId_createdAt_idx` ON `MockTestRegistrationEntry`(`mockTestId`, `createdAt`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationEntry", "MockTestRegistrationEntry_userId_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationEntry_userId_idx` ON `MockTestRegistrationEntry`(`userId`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("MockTestRegistrationEntry", "MockTestRegistrationEntry_referredByUserId_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationEntry_referredByUserId_idx` ON `MockTestRegistrationEntry`(`referredByUserId`)"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint("MockTestRegistrationEntry", "MockTestRegistrationEntry_gateId_fkey", "FOREIGN KEY"))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD CONSTRAINT `MockTestRegistrationEntry_gateId_fkey` FOREIGN KEY (`gateId`) REFERENCES `MockTestRegistrationGate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint("MockTestRegistrationEntry", "MockTestRegistrationEntry_mockTestId_fkey", "FOREIGN KEY"))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD CONSTRAINT `MockTestRegistrationEntry_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!(await hasConstraint("MockTestRegistrationEntry", "MockTestRegistrationEntry_userId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD CONSTRAINT `MockTestRegistrationEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint("MockTestRegistrationEntry", "MockTestRegistrationEntry_referredByUserId_fkey", "FOREIGN KEY"))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationEntry` ADD CONSTRAINT `MockTestRegistrationEntry_referredByUserId_fkey` FOREIGN KEY (`referredByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureReferralBonusTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`MockTestRegistrationReferralBonus\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`gateId\` VARCHAR(191) NOT NULL,
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`referrerUserId\` VARCHAR(191) NOT NULL,
      \`referredUserId\` VARCHAR(191) NOT NULL,
      \`referralCodeUsed\` VARCHAR(64) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  if (
    !(await hasIndex(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_gateId_referredUserId_key"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "CREATE UNIQUE INDEX `MockTestRegistrationReferralBonus_gateId_referredUserId_key` ON `MockTestRegistrationReferralBonus`(`gateId`, `referredUserId`)"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasIndex(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_gateId_referrerUserId_idx"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationReferralBonus_gateId_referrerUserId_idx` ON `MockTestRegistrationReferralBonus`(`gateId`, `referrerUserId`)"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasIndex(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_mockTestId_referrerUserId_idx"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `MockTestRegistrationReferralBonus_mockTestId_referrerUserId_idx` ON `MockTestRegistrationReferralBonus`(`mockTestId`, `referrerUserId`)"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_gateId_fkey",
      "FOREIGN KEY"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationReferralBonus` ADD CONSTRAINT `MockTestRegistrationReferralBonus_gateId_fkey` FOREIGN KEY (`gateId`) REFERENCES `MockTestRegistrationGate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_mockTestId_fkey",
      "FOREIGN KEY"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationReferralBonus` ADD CONSTRAINT `MockTestRegistrationReferralBonus_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_referrerUserId_fkey",
      "FOREIGN KEY"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationReferralBonus` ADD CONSTRAINT `MockTestRegistrationReferralBonus_referrerUserId_fkey` FOREIGN KEY (`referrerUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (
    !(await hasConstraint(
      "MockTestRegistrationReferralBonus",
      "MockTestRegistrationReferralBonus_referredUserId_fkey",
      "FOREIGN KEY"
    ))
  ) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `MockTestRegistrationReferralBonus` ADD CONSTRAINT `MockTestRegistrationReferralBonus_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

export const ensureMockTestRegistrationStorageReady = async (): Promise<void> => {
  if (isMockTestRegistrationStorageReady) return;
  if (mockTestRegistrationStoragePromise) return mockTestRegistrationStoragePromise;

  mockTestRegistrationStoragePromise = (async () => {
    await ensureGateTable();
    await ensureEntryTable();
    await ensureReferralBonusTable();
    isMockTestRegistrationStorageReady = true;
  })().finally(() => {
    mockTestRegistrationStoragePromise = null;
  });

  return mockTestRegistrationStoragePromise;
};
