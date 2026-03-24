CREATE TABLE `MockTestRegistrationGate` (
  `id` VARCHAR(191) NOT NULL,
  `mockTestId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `popupImageUrl` VARCHAR(1000) NULL,
  `freeAttemptLimit` INT NOT NULL DEFAULT 1,
  `buyNowUrl` VARCHAR(1000) NULL,
  `ctaLabel` VARCHAR(120) NOT NULL DEFAULT 'Buy Mock',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MockTestRegistrationGate_mockTestId_key`(`mockTestId`),
  INDEX `MockTestRegistrationGate_isActive_updatedAt_idx`(`isActive`, `updatedAt`),
  INDEX `MockTestRegistrationGate_createdBy_idx`(`createdBy`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MockTestRegistrationEntry` (
  `id` VARCHAR(191) NOT NULL,
  `gateId` VARCHAR(191) NOT NULL,
  `mockTestId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `mobile` VARCHAR(30) NOT NULL,
  `email` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `MockTestRegistrationEntry_gateId_userId_key`(`gateId`, `userId`),
  INDEX `MockTestRegistrationEntry_mockTestId_createdAt_idx`(`mockTestId`, `createdAt`),
  INDEX `MockTestRegistrationEntry_userId_idx`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MockTestRegistrationGate`
  ADD CONSTRAINT `MockTestRegistrationGate_mockTestId_fkey`
  FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MockTestRegistrationGate`
  ADD CONSTRAINT `MockTestRegistrationGate_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MockTestRegistrationEntry`
  ADD CONSTRAINT `MockTestRegistrationEntry_gateId_fkey`
  FOREIGN KEY (`gateId`) REFERENCES `MockTestRegistrationGate`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MockTestRegistrationEntry`
  ADD CONSTRAINT `MockTestRegistrationEntry_mockTestId_fkey`
  FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `MockTestRegistrationEntry`
  ADD CONSTRAINT `MockTestRegistrationEntry_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

