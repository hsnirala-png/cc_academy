CREATE TABLE `ContactConversation` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `sourcePage` VARCHAR(191) NULL,
  `sourceUrl` VARCHAR(1000) NULL,
  `status` ENUM('OPEN', 'REPLIED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  `latestMessageText` VARCHAR(500) NULL,
  `repliedAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `ContactConversation_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `ContactConversation_email_createdAt_idx`(`email`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ContactMessage` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `senderType` ENUM('VISITOR', 'ADMIN') NOT NULL,
  `senderName` VARCHAR(191) NOT NULL,
  `senderEmail` VARCHAR(191) NULL,
  `body` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ContactMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ContactMessage`
  ADD CONSTRAINT `ContactMessage_conversationId_fkey`
  FOREIGN KEY (`conversationId`) REFERENCES `ContactConversation`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
