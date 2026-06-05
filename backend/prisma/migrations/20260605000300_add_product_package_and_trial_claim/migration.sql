CREATE TABLE `ProductPackage` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `featureLines` JSON NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ProductPackage_productId_sortOrder_createdAt_idx`
  ON `ProductPackage`(`productId`, `sortOrder`, `createdAt`);

ALTER TABLE `ProductPackage`
  ADD CONSTRAINT `ProductPackage_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `ProductTrialClaim` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(191) NOT NULL,
  `deviceFingerprint` VARCHAR(191) NOT NULL,
  `trialDays` INTEGER NOT NULL,
  `claimedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `ProductTrialClaim_userId_productId_createdAt_idx`
  ON `ProductTrialClaim`(`userId`, `productId`, `createdAt`);

CREATE INDEX `ProductTrialClaim_productId_mobile_idx`
  ON `ProductTrialClaim`(`productId`, `mobile`);

CREATE INDEX `ProductTrialClaim_productId_deviceFingerprint_idx`
  ON `ProductTrialClaim`(`productId`, `deviceFingerprint`);

ALTER TABLE `ProductTrialClaim`
  ADD CONSTRAINT `ProductTrialClaim_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ProductTrialClaim`
  ADD CONSTRAINT `ProductTrialClaim_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
