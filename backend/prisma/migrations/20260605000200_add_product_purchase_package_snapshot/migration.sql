ALTER TABLE `ProductPurchase`
  ADD COLUMN `packageId` VARCHAR(191) NULL,
  ADD COLUMN `packageTitle` VARCHAR(191) NULL,
  ADD COLUMN `packagePrice` DECIMAL(10, 2) NULL;
