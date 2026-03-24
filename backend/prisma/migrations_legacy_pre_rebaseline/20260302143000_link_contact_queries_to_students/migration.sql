ALTER TABLE `ContactConversation`
  ADD COLUMN `userId` VARCHAR(191) NULL;

CREATE INDEX `ContactConversation_userId_updatedAt_idx`
  ON `ContactConversation`(`userId`, `updatedAt`);

ALTER TABLE `ContactConversation`
  ADD CONSTRAINT `ContactConversation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
