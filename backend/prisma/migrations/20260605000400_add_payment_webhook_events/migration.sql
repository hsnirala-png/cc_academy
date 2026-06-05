ALTER TABLE `PaymentOrder`
  ADD COLUMN `failedAt` DATETIME(3) NULL,
  ADD COLUMN `lastWebhookEventAt` DATETIME(3) NULL;

CREATE TABLE `PaymentEvent` (
  `id` VARCHAR(191) NOT NULL,
  `razorpayEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `razorpayOrderId` VARCHAR(191) NULL,
  `razorpayPaymentId` VARCHAR(191) NULL,
  `paymentOrderId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
  `payloadJson` JSON NOT NULL,
  `signature` VARCHAR(191) NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `PaymentEvent_razorpayEventId_key`
  ON `PaymentEvent`(`razorpayEventId`);

CREATE INDEX `PaymentEvent_eventType_receivedAt_idx`
  ON `PaymentEvent`(`eventType`, `receivedAt`);

CREATE INDEX `PaymentEvent_razorpayOrderId_idx`
  ON `PaymentEvent`(`razorpayOrderId`);

CREATE INDEX `PaymentEvent_razorpayPaymentId_idx`
  ON `PaymentEvent`(`razorpayPaymentId`);

CREATE INDEX `PaymentEvent_paymentOrderId_idx`
  ON `PaymentEvent`(`paymentOrderId`);

CREATE INDEX `PaymentEvent_status_receivedAt_idx`
  ON `PaymentEvent`(`status`, `receivedAt`);
