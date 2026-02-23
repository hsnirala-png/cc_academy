import { prisma } from "./prisma";

let isSliderStorageReady = false;
let sliderStoragePromise: Promise<void> | null = null;

const ensureColumns = async (): Promise<void> => {
  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` MODIFY COLUMN `pageKey` VARCHAR(120) NOT NULL")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` MODIFY COLUMN `imageUrl` VARCHAR(800) NOT NULL")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` MODIFY COLUMN `linkUrl` VARCHAR(1200) NULL")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` ADD COLUMN `title` VARCHAR(191) NULL")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` ADD COLUMN `createdBy` VARCHAR(191) NULL")
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `Slider` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("ALTER TABLE `Slider` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL")
    .catch(() => undefined);
};

const ensureIndexes = async (): Promise<void> => {
  await prisma
    .$executeRawUnsafe(
      "CREATE INDEX `Slider_pageKey_isActive_sortOrder_idx` ON `Slider`(`pageKey`, `isActive`, `sortOrder`)"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe("CREATE INDEX `Slider_createdBy_idx` ON `Slider`(`createdBy`)")
    .catch(() => undefined);
};

const ensureForeignKey = async (): Promise<void> => {
  const constraints = (await prisma.$queryRawUnsafe(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Slider'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'Slider_createdBy_fkey'
    `
  )) as Array<{ CONSTRAINT_NAME: string }>;

  if (constraints.length > 0) return;

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `Slider` ADD CONSTRAINT `Slider_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

export const ensureSliderStorageReady = async (): Promise<void> => {
  if (isSliderStorageReady) return;
  if (sliderStoragePromise) return sliderStoragePromise;

  sliderStoragePromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Slider\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`pageKey\` VARCHAR(120) NOT NULL,
        \`title\` VARCHAR(191) NULL,
        \`imageUrl\` VARCHAR(800) NOT NULL,
        \`linkUrl\` VARCHAR(1200) NULL,
        \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
        \`isActive\` BOOLEAN NOT NULL DEFAULT true,
        \`createdBy\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await ensureColumns();
    await ensureIndexes();
    await ensureForeignKey();

    isSliderStorageReady = true;
  })().finally(() => {
    sliderStoragePromise = null;
  });

  return sliderStoragePromise;
};
