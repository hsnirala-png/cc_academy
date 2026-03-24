-- CreateTable
CREATE TABLE `MockTestSection` (
    `id` VARCHAR(191) NOT NULL,
    `mockTestId` VARCHAR(191) NOT NULL,
    `sectionLabel` VARCHAR(120) NOT NULL,
    `sectionType` VARCHAR(60) NOT NULL DEFAULT 'GENERAL_MCQ',
    `transcriptText` LONGTEXT NULL,
    `audioUrl` VARCHAR(512) NULL,
    `questionLimit` INTEGER NOT NULL DEFAULT 10,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MockTestSection_mockTestId_sectionLabel_key`(`mockTestId`, `sectionLabel`),
    INDEX `MockTestSection_mockTestId_sortOrder_isActive_idx`(`mockTestId`, `sortOrder`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MockTestSection` ADD CONSTRAINT `MockTestSection_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
