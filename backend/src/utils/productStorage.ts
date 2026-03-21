import { prisma } from "./prisma";
import { hasColumn, hasConstraint, hasIndex } from "./schemaGuards";

let isProductStorageReady = false;
let productStoragePromise: Promise<void> | null = null;
const PRODUCT_FILTER_INDEX = "Product_filters_idx";
const LEGACY_PRODUCT_FILTER_INDEX = "Product_isActive_examCategory_examName_courseType_languageMode_idx";

const ensureColumns = async (): Promise<void> => {
  if (!(await hasColumn("Product", "referralBonusAmount"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `referralBonusAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("Product", "referralDiscountAmount"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `referralDiscountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0"
      )
      .catch(() => undefined);
  }

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `Product` MODIFY COLUMN `thumbnailUrl` VARCHAR(800) NULL"
    )
    .catch(() => undefined);

  if (!(await hasColumn("Product", "demoLessonTitle"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `demoLessonTitle` VARCHAR(191) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("Product", "demoLessonUrl"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `demoLessonUrl` VARCHAR(1000) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("Product", "trialEnabled"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `trialEnabled` BOOLEAN NOT NULL DEFAULT false"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("Product", "trialDays"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `Product` ADD COLUMN `trialDays` INTEGER NULL"
      )
      .catch(() => undefined);
  }
};

const ensureIndexes = async (): Promise<void> => {
  if (
    !(await hasIndex("Product", PRODUCT_FILTER_INDEX)) &&
    !(await hasIndex("Product", LEGACY_PRODUCT_FILTER_INDEX))
  ) {
    await prisma
      .$executeRawUnsafe(
        `CREATE INDEX \`${PRODUCT_FILTER_INDEX}\` ON \`Product\`(\`isActive\`, \`examCategory\`, \`examName\`, \`courseType\`, \`languageMode\`)`
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("Product", "Product_createdBy_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `Product_createdBy_idx` ON `Product`(`createdBy`)"
      )
      .catch(() => undefined);
  }
};

const ensureForeignKey = async (): Promise<void> => {
  const constraints = (await prisma.$queryRawUnsafe(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Product'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND CONSTRAINT_NAME = 'Product_createdBy_fkey'
    `
  )) as Array<{ CONSTRAINT_NAME: string }>;

  if (constraints.length > 0) return;

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `Product` ADD CONSTRAINT `Product_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE"
    )
    .catch(() => undefined);
};

const ensureProductPurchaseTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductPurchase\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`productId\` VARCHAR(191) NOT NULL,
      \`amountPaid\` DECIMAL(10, 2) NOT NULL,
      \`walletUsed\` DECIMAL(10, 2) NOT NULL,
      \`referralBonusCredited\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const ensureProductPurchaseColumns = async (): Promise<void> => {
  if (!(await hasColumn("ProductPurchase", "walletUsed"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `walletUsed` DECIMAL(10, 2) NOT NULL DEFAULT 0"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("ProductPurchase", "referralBonusCredited"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `referralBonusCredited` DECIMAL(10, 2) NOT NULL DEFAULT 0"
      )
      .catch(() => undefined);
  }

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductPurchase` MODIFY COLUMN `amountPaid` DECIMAL(10, 2) NOT NULL"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductPurchase` MODIFY COLUMN `walletUsed` DECIMAL(10, 2) NOT NULL"
    )
    .catch(() => undefined);

  await prisma
    .$executeRawUnsafe(
      "ALTER TABLE `ProductPurchase` MODIFY COLUMN `referralBonusCredited` DECIMAL(10, 2) NOT NULL DEFAULT 0"
    )
    .catch(() => undefined);

  if (!(await hasColumn("ProductPurchase", "createdAt"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("ProductPurchase", "packageId"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `packageId` VARCHAR(191) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("ProductPurchase", "packageTitle"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `packageTitle` VARCHAR(191) NULL"
      )
      .catch(() => undefined);
  }

  if (!(await hasColumn("ProductPurchase", "packagePrice"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD COLUMN `packagePrice` DECIMAL(10, 2) NULL"
      )
      .catch(() => undefined);
  }
};

const ensureProductPurchaseIndexes = async (): Promise<void> => {
  if (!(await hasIndex("ProductPurchase", "ProductPurchase_userId_createdAt_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductPurchase_userId_createdAt_idx` ON `ProductPurchase`(`userId`, `createdAt`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("ProductPurchase", "ProductPurchase_productId_createdAt_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductPurchase_productId_createdAt_idx` ON `ProductPurchase`(`productId`, `createdAt`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("ProductPurchase", "ProductPurchase_packageId_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductPurchase_packageId_idx` ON `ProductPurchase`(`packageId`)"
      )
      .catch(() => undefined);
  }
};

const ensureProductPurchaseForeignKeys = async (): Promise<void> => {
  const constraints = (await prisma.$queryRawUnsafe(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ProductPurchase'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `
  )) as Array<{ CONSTRAINT_NAME: string }>;

  const constraintSet = new Set(constraints.map((item) => item.CONSTRAINT_NAME));

  if (!constraintSet.has("ProductPurchase_userId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD CONSTRAINT `ProductPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!constraintSet.has("ProductPurchase_productId_fkey")) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPurchase` ADD CONSTRAINT `ProductPurchase_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureProductComboItemTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductComboItem\` (
      \`parentProductId\` VARCHAR(191) NOT NULL,
      \`childProductId\` VARCHAR(191) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`parentProductId\`, \`childProductId\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const ensureProductComboItemColumns = async (): Promise<void> => {
  if (!(await hasColumn("ProductComboItem", "updatedAt"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductComboItem` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)"
      )
      .catch(() => undefined);
  }
};

const ensureProductComboItemIndexes = async (): Promise<void> => {
  if (!(await hasIndex("ProductComboItem", "ProductComboItem_childProductId_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductComboItem_childProductId_idx` ON `ProductComboItem`(`childProductId`)"
      )
      .catch(() => undefined);
  }
};

const ensureProductComboItemForeignKeys = async (): Promise<void> => {
  if (!(await hasConstraint("ProductComboItem", "ProductComboItem_parentProductId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductComboItem` ADD CONSTRAINT `ProductComboItem_parentProductId_fkey` FOREIGN KEY (`parentProductId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!(await hasConstraint("ProductComboItem", "ProductComboItem_childProductId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductComboItem` ADD CONSTRAINT `ProductComboItem_childProductId_fkey` FOREIGN KEY (`childProductId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureProductPackageTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductPackage\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`productId\` VARCHAR(191) NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`price\` DECIMAL(10, 2) NOT NULL,
      \`featureLines\` JSON NULL,
      \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
      \`isActive\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const ensureProductPackageIndexes = async (): Promise<void> => {
  if (!(await hasIndex("ProductPackage", "ProductPackage_productId_sortOrder_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductPackage_productId_sortOrder_idx` ON `ProductPackage`(`productId`, `sortOrder`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("ProductPackage", "ProductPackage_productId_isActive_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductPackage_productId_isActive_idx` ON `ProductPackage`(`productId`, `isActive`)"
      )
      .catch(() => undefined);
  }
};

const ensureProductPackageForeignKeys = async (): Promise<void> => {
  if (!(await hasConstraint("ProductPackage", "ProductPackage_productId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductPackage` ADD CONSTRAINT `ProductPackage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

const ensureProductTrialClaimTable = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`ProductTrialClaim\` (
      \`id\` VARCHAR(191) NOT NULL,
      \`userId\` VARCHAR(191) NOT NULL,
      \`productId\` VARCHAR(191) NOT NULL,
      \`mobile\` VARCHAR(191) NOT NULL,
      \`deviceFingerprint\` VARCHAR(191) NOT NULL,
      \`trialDays\` INTEGER NOT NULL,
      \`claimedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`expiresAt\` DATETIME(3) NOT NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
};

const ensureProductTrialClaimIndexes = async (): Promise<void> => {
  if (!(await hasIndex("ProductTrialClaim", "ProductTrialClaim_productId_mobile_key"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE UNIQUE INDEX `ProductTrialClaim_productId_mobile_key` ON `ProductTrialClaim`(`productId`, `mobile`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("ProductTrialClaim", "ProductTrialClaim_productId_deviceFingerprint_key"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE UNIQUE INDEX `ProductTrialClaim_productId_deviceFingerprint_key` ON `ProductTrialClaim`(`productId`, `deviceFingerprint`)"
      )
      .catch(() => undefined);
  }

  if (!(await hasIndex("ProductTrialClaim", "ProductTrialClaim_userId_expiresAt_idx"))) {
    await prisma
      .$executeRawUnsafe(
        "CREATE INDEX `ProductTrialClaim_userId_expiresAt_idx` ON `ProductTrialClaim`(`userId`, `expiresAt`)"
      )
      .catch(() => undefined);
  }
};

const ensureProductTrialClaimForeignKeys = async (): Promise<void> => {
  if (!(await hasConstraint("ProductTrialClaim", "ProductTrialClaim_userId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductTrialClaim` ADD CONSTRAINT `ProductTrialClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }

  if (!(await hasConstraint("ProductTrialClaim", "ProductTrialClaim_productId_fkey", "FOREIGN KEY"))) {
    await prisma
      .$executeRawUnsafe(
        "ALTER TABLE `ProductTrialClaim` ADD CONSTRAINT `ProductTrialClaim_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE"
      )
      .catch(() => undefined);
  }
};

export const ensureProductStorageReady = async (): Promise<void> => {
  if (isProductStorageReady) return;
  if (productStoragePromise) return productStoragePromise;

  productStoragePromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`Product\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`title\` VARCHAR(191) NOT NULL,
        \`examCategory\` VARCHAR(191) NOT NULL,
        \`examName\` VARCHAR(191) NOT NULL,
        \`courseType\` VARCHAR(191) NOT NULL,
        \`languageMode\` VARCHAR(191) NULL,
        \`thumbnailUrl\` VARCHAR(800) NULL,
        \`description\` LONGTEXT NULL,
        \`listPrice\` DECIMAL(10, 2) NOT NULL,
        \`salePrice\` DECIMAL(10, 2) NOT NULL,
        \`referralBonusAmount\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
        \`referralDiscountAmount\` DECIMAL(10, 2) NOT NULL DEFAULT 0,
        \`accessDays\` INTEGER NOT NULL,
        \`validityLabel\` VARCHAR(191) NULL,
        \`addons\` JSON NULL,
        \`demoLessonTitle\` VARCHAR(191) NULL,
        \`demoLessonUrl\` VARCHAR(1000) NULL,
        \`trialEnabled\` BOOLEAN NOT NULL DEFAULT false,
        \`trialDays\` INTEGER NULL,
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
    await ensureProductPurchaseTable();
    await ensureProductPurchaseColumns();
    await ensureProductPurchaseIndexes();
    await ensureProductPurchaseForeignKeys();
    await ensureProductComboItemTable();
    await ensureProductComboItemColumns();
    await ensureProductComboItemIndexes();
    await ensureProductComboItemForeignKeys();
    await ensureProductPackageTable();
    await ensureProductPackageIndexes();
    await ensureProductPackageForeignKeys();
    await ensureProductTrialClaimTable();
    await ensureProductTrialClaimIndexes();
    await ensureProductTrialClaimForeignKeys();

    isProductStorageReady = true;
  })().finally(() => {
    productStoragePromise = null;
  });

  return productStoragePromise;
};
