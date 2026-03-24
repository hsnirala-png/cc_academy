-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `examCategory` VARCHAR(191) NOT NULL,
    `examName` VARCHAR(191) NOT NULL,
    `courseType` VARCHAR(191) NOT NULL,
    `languageMode` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `listPrice` DECIMAL(10, 2) NOT NULL,
    `salePrice` DECIMAL(10, 2) NOT NULL,
    `accessDays` INTEGER NOT NULL,
    `validityLabel` VARCHAR(191) NULL,
    `addons` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_isActive_examCategory_examName_courseType_languageMode_idx`(`isActive`, `examCategory`, `examName`, `courseType`, `languageMode`),
    INDEX `Product_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
