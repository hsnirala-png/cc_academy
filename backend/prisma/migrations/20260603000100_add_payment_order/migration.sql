CREATE TABLE `PaymentOrder` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `amountPaise` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
  `razorpayOrderId` VARCHAR(191) NOT NULL,
  `razorpayPaymentId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `referralCodeSnapshot` VARCHAR(191) NULL,
  `walletAmountPaiseSnapshot` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `verifiedAt` DATETIME(3) NULL,
  `usedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `PaymentOrder_razorpayOrderId_key` ON `PaymentOrder`(`razorpayOrderId`);
CREATE UNIQUE INDEX `PaymentOrder_razorpayPaymentId_key` ON `PaymentOrder`(`razorpayPaymentId`);
CREATE INDEX `PaymentOrder_userId_status_createdAt_idx` ON `PaymentOrder`(`userId`, `status`, `createdAt`);
CREATE INDEX `PaymentOrder_productId_status_createdAt_idx` ON `PaymentOrder`(`productId`, `status`, `createdAt`);
CREATE INDEX `PaymentOrder_status_updatedAt_idx` ON `PaymentOrder`(`status`, `updatedAt`);

ALTER TABLE `PaymentOrder`
  ADD CONSTRAINT `PaymentOrder_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PaymentOrder`
  ADD CONSTRAINT `PaymentOrder_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
