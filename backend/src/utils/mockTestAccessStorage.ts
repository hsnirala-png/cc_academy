import { prisma } from "./prisma";

let isMockTestAccessStorageReady = false;
let mockTestAccessStoragePromise: Promise<void> | null = null;

const ensureMockTestAccessRuleTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`MockTestAccessRule\` (
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`accessCode\` VARCHAR(20) NOT NULL DEFAULT 'DEMO',
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`mockTestId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `MockTestAccessRule` ADD CONSTRAINT `MockTestAccessRule_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

const ensureProductMockTestTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductMockTest\` (
      \`productId\` VARCHAR(191) NOT NULL,
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`productId\`, \`mockTestId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma
    .$executeRawUnsafe(
      "CREATE INDEX `ProductMockTest_mockTestId_idx` ON `ProductMockTest`(`mockTestId`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductMockTest` ADD CONSTRAINT `ProductMockTest_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductMockTest` ADD CONSTRAINT `ProductMockTest_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

const ensureProductDemoMockTestTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductDemoMockTest\` (
      \`productId\` VARCHAR(191) NOT NULL,
      \`mockTestId\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`productId\`, \`mockTestId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma
    .$executeRawUnsafe(
      "CREATE INDEX `ProductDemoMockTest_mockTestId_idx` ON `ProductDemoMockTest`(`mockTestId`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductDemoMockTest` ADD CONSTRAINT `ProductDemoMockTest_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductDemoMockTest` ADD CONSTRAINT `ProductDemoMockTest_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

const ensureStudentProductAccessTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`StudentProductAccess\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`productId\` VARCHAR(191) NOT NULL,
      \`assignedBy\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma
    .$executeRawUnsafe(
      "CREATE UNIQUE INDEX `StudentProductAccess_userId_productId_key` ON `StudentProductAccess`(`userId`, `productId`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "CREATE INDEX `StudentProductAccess_productId_idx` ON `StudentProductAccess`(`productId`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "CREATE INDEX `StudentProductAccess_assignedBy_idx` ON `StudentProductAccess`(`assignedBy`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `StudentProductAccess` ADD CONSTRAINT `StudentProductAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `StudentProductAccess` ADD CONSTRAINT `StudentProductAccess_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `StudentProductAccess` ADD CONSTRAINT `StudentProductAccess_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

export const ensureMockTestAccessStorageReady = async (): Promise<void> => {
  if (isMockTestAccessStorageReady) return;
  if (mockTestAccessStoragePromise) return mockTestAccessStoragePromise;

  mockTestAccessStoragePromise = (async () => {
    await ensureMockTestAccessRuleTable();
    await ensureProductMockTestTable();
    await ensureProductDemoMockTestTable();
    await ensureStudentProductAccessTable();
    isMockTestAccessStorageReady = true;
  })().finally(() => {
    mockTestAccessStoragePromise = null;
  });

  return mockTestAccessStoragePromise;
};
