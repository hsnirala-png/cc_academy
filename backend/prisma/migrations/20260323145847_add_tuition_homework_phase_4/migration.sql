-- CreateTable
CREATE TABLE `TuitionHomework` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `syllabusChapterId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `instructions` TEXT NULL,
    `speedMode` ENUM('SLOW', 'NORMAL', 'FAST') NOT NULL DEFAULT 'NORMAL',
    `difficultyMode` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `responseLanguage` VARCHAR(191) NULL,
    `status` ENUM('GENERATED', 'ASSIGNED', 'SUBMITTED', 'EVALUATED') NOT NULL DEFAULT 'GENERATED',
    `assignmentPayload` JSON NOT NULL,
    `sourceContextJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionHomework_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TuitionHomework_profileId_createdAt_idx`(`profileId`, `createdAt`),
    INDEX `TuitionHomework_syllabusChapterId_createdAt_idx`(`syllabusChapterId`, `createdAt`),
    INDEX `TuitionHomework_sessionId_idx`(`sessionId`),
    INDEX `TuitionHomework_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionHomeworkSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `homeworkId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `answerPayload` JSON NOT NULL,
    `notes` TEXT NULL,
    `evaluationPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionHomeworkSubmission_homeworkId_createdAt_idx`(`homeworkId`, `createdAt`),
    INDEX `TuitionHomeworkSubmission_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TuitionHomework` ADD CONSTRAINT `TuitionHomework_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionHomework` ADD CONSTRAINT `TuitionHomework_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionHomework` ADD CONSTRAINT `TuitionHomework_syllabusChapterId_fkey` FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionHomework` ADD CONSTRAINT `TuitionHomework_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `TuitionSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionHomeworkSubmission` ADD CONSTRAINT `TuitionHomeworkSubmission_homeworkId_fkey` FOREIGN KEY (`homeworkId`) REFERENCES `TuitionHomework`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionHomeworkSubmission` ADD CONSTRAINT `TuitionHomeworkSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
