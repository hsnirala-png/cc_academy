CREATE TABLE IF NOT EXISTS `TuitionLessonCache` (
  `id` VARCHAR(191) NOT NULL,
  `profileId` VARCHAR(191) NULL,
  `syllabusChapterId` VARCHAR(191) NULL,
  `boardName` VARCHAR(120) NULL,
  `classLevel` INTEGER NULL,
  `subjectName` VARCHAR(191) NOT NULL,
  `topicTitle` VARCHAR(191) NOT NULL,
  `explanationLanguage` VARCHAR(20) NOT NULL,
  `boardLanguage` VARCHAR(20) NOT NULL,
  `voiceLanguage` VARCHAR(20) NOT NULL,
  `teachingDepth` VARCHAR(20) NOT NULL,
  `speedMode` ENUM('SLOW', 'NORMAL', 'FAST') NOT NULL,
  `difficultyMode` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
  `promptType` VARCHAR(40) NOT NULL,
  `promptText` TEXT NOT NULL,
  `normalizedCacheKey` VARCHAR(255) NOT NULL,
  `previousTeachingPhase` VARCHAR(40) NULL,
  `previousConceptIndex` INTEGER NULL,
  `assistantPayloadJson` JSON NOT NULL,
  `boardPayloadJson` JSON NULL,
  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastUsedAt` DATETIME(3) NULL,
  `hitCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TuitionLessonCache_normalizedCacheKey_key`(`normalizedCacheKey`),
  INDEX `TuitionLessonCache_syllabusChapterId_updatedAt_idx`(`syllabusChapterId`, `updatedAt`),
  INDEX `TuitionLessonCache_profileId_updatedAt_idx`(`profileId`, `updatedAt`),
  INDEX `TuitionLessonCache_topicTitle_subjectName_updatedAt_idx`(`topicTitle`, `subjectName`, `updatedAt`),
  INDEX `TuitionLessonCache_promptType_updatedAt_idx`(`promptType`, `updatedAt`),
  CONSTRAINT `TuitionLessonCache_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TuitionLessonCache_syllabusChapterId_fkey`
    FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TuitionLessonDoubt` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NULL,
  `syllabusChapterId` VARCHAR(191) NULL,
  `lessonCacheId` VARCHAR(191) NULL,
  `subjectName` VARCHAR(191) NOT NULL,
  `topicTitle` VARCHAR(191) NOT NULL,
  `explanationLanguage` VARCHAR(20) NOT NULL,
  `boardLanguage` VARCHAR(20) NOT NULL,
  `voiceLanguage` VARCHAR(20) NOT NULL,
  `teachingDepth` VARCHAR(20) NOT NULL,
  `speedMode` ENUM('SLOW', 'NORMAL', 'FAST') NOT NULL,
  `difficultyMode` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
  `questionText` LONGTEXT NOT NULL,
  `normalizedQuestionKey` VARCHAR(255) NOT NULL,
  `answerPayloadJson` JSON NULL,
  `previousTeachingPhase` VARCHAR(40) NULL,
  `previousConceptIndex` INTEGER NULL,
  `occurrenceCount` INTEGER NOT NULL DEFAULT 1,
  `importanceScore` INTEGER NOT NULL DEFAULT 1,
  `lastAskedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TuitionLessonDoubt_normalizedQuestionKey_key`(`normalizedQuestionKey`),
  INDEX `TuitionLessonDoubt_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `TuitionLessonDoubt_sessionId_updatedAt_idx`(`sessionId`, `updatedAt`),
  INDEX `TuitionLessonDoubt_syllabusChapterId_updatedAt_idx`(`syllabusChapterId`, `updatedAt`),
  INDEX `TuitionLessonDoubt_lessonCacheId_updatedAt_idx`(`lessonCacheId`, `updatedAt`),
  INDEX `TuitionLessonDoubt_topicTitle_subjectName_updatedAt_idx`(`topicTitle`, `subjectName`, `updatedAt`),
  CONSTRAINT `TuitionLessonDoubt_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TuitionLessonDoubt_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `TuitionSession`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TuitionLessonDoubt_syllabusChapterId_fkey`
    FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `TuitionLessonDoubt_lessonCacheId_fkey`
    FOREIGN KEY (`lessonCacheId`) REFERENCES `TuitionLessonCache`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
