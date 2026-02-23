require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function ensureProductTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`Product\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`examCategory\` VARCHAR(191) NOT NULL,
      \`examName\` VARCHAR(191) NOT NULL,
      \`courseType\` VARCHAR(191) NOT NULL,
      \`languageMode\` VARCHAR(191) NULL,
      \`thumbnailUrl\` VARCHAR(191) NULL,
      \`description\` LONGTEXT NULL,
      \`listPrice\` DECIMAL(10, 2) NOT NULL,
      \`salePrice\` DECIMAL(10, 2) NOT NULL,
      \`accessDays\` INTEGER NOT NULL,
      \`validityLabel\` VARCHAR(191) NULL,
      \`addons\` JSON NULL,
      \`isActive\` BOOLEAN NOT NULL DEFAULT true,
      \`createdBy\` VARCHAR(191) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  await prisma.$executeRawUnsafe(
    "CREATE INDEX `Product_isActive_examCategory_examName_courseType_languageMode_idx` ON `Product`(`isActive`, `examCategory`, `examName`, `courseType`, `languageMode`)"
  ).catch(() => {});

  await prisma.$executeRawUnsafe(
    "CREATE INDEX `Product_createdBy_idx` ON `Product`(`createdBy`)"
  ).catch(() => {});

  const fk = await prisma.$queryRawUnsafe(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Product'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND CONSTRAINT_NAME = 'Product_createdBy_fkey'
  `);

  if (!Array.isArray(fk) || fk.length === 0) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE `Product` ADD CONSTRAINT `Product_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
    ).catch(() => {});
  }
}

(async () => {
  try {
    await ensureProductTable();
    const count = await prisma.$queryRawUnsafe("SELECT COUNT(*) AS c FROM `Product`");
    console.log("Product table ready:", count);
  } catch (error) {
    console.error("Failed to ensure Product table", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
