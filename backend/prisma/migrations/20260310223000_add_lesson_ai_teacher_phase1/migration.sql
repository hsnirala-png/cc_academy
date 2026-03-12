CREATE TABLE `AiConversation` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `lessonId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `mode` ENUM('LESSON_CHAT') NOT NULL DEFAULT 'LESSON_CHAT',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `AiConversation_userId_lessonId_updatedAt_idx`(`userId`, `lessonId`, `updatedAt`),
  INDEX `AiConversation_lessonId_updatedAt_idx`(`lessonId`, `updatedAt`),
  UNIQUE INDEX `AiConversation_userId_lessonId_mode_key`(`userId`, `lessonId`, `mode`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AiMessage` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `role` ENUM('USER', 'ASSISTANT') NOT NULL,
  `content` LONGTEXT NOT NULL,
  `contextSnapshotJson` JSON NULL,
  `tokenUsage` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `AiMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AiConversation`
  ADD CONSTRAINT `AiConversation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AiConversation`
  ADD CONSTRAINT `AiConversation_lessonId_fkey`
  FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AiMessage`
  ADD CONSTRAINT `AiMessage_conversationId_fkey`
  FOREIGN KEY (`conversationId`) REFERENCES `AiConversation`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
