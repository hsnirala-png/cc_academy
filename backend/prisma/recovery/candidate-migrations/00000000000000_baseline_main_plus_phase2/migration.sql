-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `state` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
    `referralCode` VARCHAR(191) NULL,
    `referrerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_mobile_key`(`mobile`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_referralCode_key`(`referralCode`),
    INDEX `User_referrerId_idx`(`referrerId`),
    INDEX `User_referralCode_idx`(`referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Course` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Course_isActive_title_idx`(`isActive`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chapter` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `subSubject` ENUM('SCIENCE_MATH', 'SOCIAL_STUDIES') NULL,
    `orderIndex` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Chapter_courseId_title_idx`(`courseId`, `title`),
    UNIQUE INDEX `Chapter_courseId_orderIndex_key`(`courseId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lesson` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `videoUrl` VARCHAR(191) NOT NULL,
    `transcriptUrl` VARCHAR(191) NULL,
    `transcriptText` LONGTEXT NULL,
    `transcriptSegments` JSON NULL,
    `audioUrl` VARCHAR(191) NULL,
    `audioDurationMs` INTEGER NULL,
    `audioGeneratedAt` DATETIME(3) NULL,
    `audioStatus` VARCHAR(191) NULL,
    `audioVoice` VARCHAR(191) NULL DEFAULT 'marin',
    `audioLanguageHint` VARCHAR(191) NULL,
    `durationSec` INTEGER NOT NULL DEFAULT 0,
    `assessmentTestId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Lesson_chapterId_title_idx`(`chapterId`, `title`),
    INDEX `Lesson_assessmentTestId_idx`(`assessmentTestId`),
    UNIQUE INDEX `Lesson_chapterId_orderIndex_key`(`chapterId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Enrollment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Enrollment_courseId_idx`(`courseId`),
    UNIQUE INDEX `Enrollment_userId_courseId_key`(`userId`, `courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LessonProgress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `lastPositionSec` INTEGER NOT NULL DEFAULT 0,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LessonProgress_lessonId_completed_idx`(`lessonId`, `completed`),
    UNIQUE INDEX `LessonProgress_userId_lessonId_key`(`userId`, `lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `examCategory` VARCHAR(191) NOT NULL,
    `examName` VARCHAR(191) NOT NULL,
    `courseType` VARCHAR(191) NOT NULL,
    `languageMode` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `listPrice` DECIMAL(10, 2) NOT NULL,
    `salePrice` DECIMAL(10, 2) NOT NULL,
    `referralBonusAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `referralDiscountAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `accessDays` INTEGER NOT NULL,
    `validityLabel` VARCHAR(191) NULL,
    `addons` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_isActive_examCategory_examName_courseType_languageMo_idx`(`isActive`, `examCategory`, `examName`, `courseType`, `languageMode`),
    INDEX `Product_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoachingClass` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `instructor` VARCHAR(191) NULL,
    `mode` ENUM('ONLINE', 'OFFLINE', 'HYBRID') NOT NULL DEFAULT 'ONLINE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `seats` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `startsOn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsOn` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentSubscription_userId_idx`(`userId`),
    INDEX `StudentSubscription_planId_idx`(`planId`),
    INDEX `StudentSubscription_classId_idx`(`classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MockTest` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `examType` ENUM('PSTET_1', 'PSTET_2') NOT NULL,
    `subject` ENUM('PUNJABI', 'ENGLISH', 'CHILD_PEDAGOGY', 'MATHS', 'EVS', 'MATHS_EVS', 'SCIENCE_MATH', 'SOCIAL_STUDIES') NOT NULL,
    `streamChoice` ENUM('SCIENCE_MATH', 'SOCIAL_STUDIES') NULL,
    `languageMode` ENUM('PUNJABI', 'ENGLISH', 'HINDI', 'BILINGUAL') NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MockTest_examType_subject_streamChoice_isActive_idx`(`examType`, `subject`, `streamChoice`, `isActive`),
    INDEX `MockTest_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MockTestSection` (
    `id` VARCHAR(191) NOT NULL,
    `mockTestId` VARCHAR(191) NOT NULL,
    `sectionLabel` VARCHAR(120) NOT NULL,
    `sectionType` VARCHAR(60) NOT NULL DEFAULT 'GENERAL_MCQ',
    `transcriptText` LONGTEXT NULL,
    `audioUrl` VARCHAR(512) NULL,
    `questionLimit` INTEGER NOT NULL DEFAULT 10,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MockTestSection_mockTestId_sortOrder_isActive_idx`(`mockTestId`, `sortOrder`, `isActive`),
    UNIQUE INDEX `MockTestSection_mockTestId_sectionLabel_key`(`mockTestId`, `sectionLabel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Question` (
    `id` VARCHAR(191) NOT NULL,
    `mockTestId` VARCHAR(191) NOT NULL,
    `questionText` TEXT NOT NULL,
    `questionTextAlt` TEXT NULL,
    `optionA` TEXT NOT NULL,
    `optionAAlt` TEXT NULL,
    `optionB` TEXT NOT NULL,
    `optionBAlt` TEXT NULL,
    `optionC` TEXT NOT NULL,
    `optionCAlt` TEXT NULL,
    `optionD` TEXT NOT NULL,
    `optionDAlt` TEXT NULL,
    `correctOption` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `explanation` TEXT NULL,
    `explanationAlt` TEXT NULL,
    `sectionLabel` VARCHAR(120) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Question_mockTestId_isActive_idx`(`mockTestId`, `isActive`),
    INDEX `Question_mockTestId_displayOrder_idx`(`mockTestId`, `displayOrder`),
    INDEX `Question_mockTestId_sectionLabel_isActive_idx`(`mockTestId`, `sectionLabel`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mockTestId` VARCHAR(191) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED') NOT NULL DEFAULT 'IN_PROGRESS',
    `totalQuestions` INTEGER NOT NULL,
    `correctCount` INTEGER NULL,
    `scorePercent` DOUBLE NULL,
    `remarkText` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedAt` DATETIME(3) NULL,

    INDEX `Attempt_userId_startedAt_idx`(`userId`, `startedAt`),
    INDEX `Attempt_mockTestId_startedAt_idx`(`mockTestId`, `startedAt`),
    INDEX `Attempt_status_submittedAt_idx`(`status`, `submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttemptQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,

    INDEX `AttemptQuestion_questionId_idx`(`questionId`),
    UNIQUE INDEX `AttemptQuestion_attemptId_questionId_key`(`attemptId`, `questionId`),
    UNIQUE INDEX `AttemptQuestion_attemptId_orderIndex_key`(`attemptId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttemptAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `selectedOption` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `answeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttemptAnswer_questionId_idx`(`questionId`),
    UNIQUE INDEX `AttemptAnswer_attemptId_questionId_key`(`attemptId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPurchase` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `amountPaid` DECIMAL(10, 2) NOT NULL,
    `walletUsed` DECIMAL(10, 2) NOT NULL,
    `referralBonusCredited` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductPurchase_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ProductPurchase_productId_createdAt_idx`(`productId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralPayoutMethod` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('BANK', 'UPI') NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `accountNo` VARCHAR(191) NULL,
    `ifsc` VARCHAR(191) NULL,
    `place` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReferralPayoutMethod_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ReferralPayoutMethod_isVerified_type_idx`(`isVerified`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralWithdrawal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `payoutMethodId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `adminNote` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReferralWithdrawal_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ReferralWithdrawal_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReferralTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `type` ENUM('REFERRAL_BONUS', 'PRODUCT_PURCHASE', 'WITHDRAWAL') NOT NULL,
    `description` VARCHAR(191) NULL,
    `purchaseId` VARCHAR(191) NULL,
    `withdrawalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReferralTransaction_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ReferralTransaction_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `ReferralTransaction_purchaseId_idx`(`purchaseId`),
    INDEX `ReferralTransaction_withdrawalId_idx`(`withdrawalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
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

    INDEX `ContactConversation_status_updatedAt_idx`(`status`, `updatedAt`),
    INDEX `ContactConversation_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `ContactConversation_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `senderType` ENUM('VISITOR', 'ADMIN') NOT NULL,
    `senderName` VARCHAR(191) NOT NULL,
    `senderEmail` VARCHAR(191) NULL,
    `body` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionBoard` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TuitionBoard_code_key`(`code`),
    INDEX `TuitionBoard_isActive_name_idx`(`isActive`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionSubject` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TuitionSubject_code_key`(`code`),
    INDEX `TuitionSubject_isActive_name_idx`(`isActive`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(191) NULL,
    `classLevel` INTEGER NULL,
    `subjectId` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NULL,
    `activeSyllabusId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TuitionProfile_userId_key`(`userId`),
    INDEX `TuitionProfile_boardId_idx`(`boardId`),
    INDEX `TuitionProfile_subjectId_idx`(`subjectId`),
    INDEX `TuitionProfile_activeSyllabusId_idx`(`activeSyllabusId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionSyllabusUpload` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `parseStatus` ENUM('UPLOADED', 'PROCESSING', 'PARSED', 'NEEDS_REVIEW', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    `ocrRawText` LONGTEXT NULL,
    `parseWarnings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionSyllabusUpload_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TuitionSyllabusUpload_profileId_createdAt_idx`(`profileId`, `createdAt`),
    INDEX `TuitionSyllabusUpload_parseStatus_updatedAt_idx`(`parseStatus`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionSyllabus` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(191) NULL,
    `classLevel` INTEGER NULL,
    `subjectId` VARCHAR(191) NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TuitionSyllabus_uploadId_key`(`uploadId`),
    INDEX `TuitionSyllabus_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `TuitionSyllabus_profileId_createdAt_idx`(`profileId`, `createdAt`),
    INDEX `TuitionSyllabus_boardId_idx`(`boardId`),
    INDEX `TuitionSyllabus_subjectId_idx`(`subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionSyllabusChapter` (
    `id` VARCHAR(191) NOT NULL,
    `syllabusId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalizedName` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL,
    `sourceText` TEXT NULL,
    `isIncluded` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionSyllabusChapter_syllabusId_normalizedName_idx`(`syllabusId`, `normalizedName`),
    UNIQUE INDEX `TuitionSyllabusChapter_syllabusId_orderIndex_key`(`syllabusId`, `orderIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionChapterPlan` (
    `id` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `syllabusChapterId` VARCHAR(191) NOT NULL,
    `goalSummary` TEXT NULL,
    `estimatedSessions` INTEGER NULL,
    `recommendedOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionChapterPlan_profileId_recommendedOrder_idx`(`profileId`, `recommendedOrder`),
    UNIQUE INDEX `TuitionChapterPlan_profileId_syllabusChapterId_key`(`profileId`, `syllabusChapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `syllabusChapterId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `speedMode` ENUM('SLOW', 'NORMAL', 'FAST') NOT NULL DEFAULT 'NORMAL',
    `difficultyMode` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    `responseLanguage` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionSession_userId_syllabusChapterId_updatedAt_idx`(`userId`, `syllabusChapterId`, `updatedAt`),
    INDEX `TuitionSession_profileId_status_updatedAt_idx`(`profileId`, `status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionMessage` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `contextSnapshotJson` JSON NULL,
    `tokenUsage` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TuitionMessage_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TuitionProgress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `syllabusChapterId` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `completionPercent` INTEGER NOT NULL DEFAULT 0,
    `lastSessionId` VARCHAR(191) NULL,
    `lastStudiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TuitionProgress_status_lastStudiedAt_idx`(`status`, `lastStudiedAt`),
    INDEX `TuitionProgress_lastSessionId_idx`(`lastSessionId`),
    UNIQUE INDEX `TuitionProgress_userId_syllabusChapterId_key`(`userId`, `syllabusChapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chapter` ADD CONSTRAINT `Chapter_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lesson` ADD CONSTRAINT `Lesson_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lesson` ADD CONSTRAINT `Lesson_assessmentTestId_fkey` FOREIGN KEY (`assessmentTestId`) REFERENCES `MockTest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonProgress` ADD CONSTRAINT `LessonProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonProgress` ADD CONSTRAINT `LessonProgress_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSubscription` ADD CONSTRAINT `StudentSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSubscription` ADD CONSTRAINT `StudentSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSubscription` ADD CONSTRAINT `StudentSubscription_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `CoachingClass`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MockTest` ADD CONSTRAINT `MockTest_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MockTestSection` ADD CONSTRAINT `MockTestSection_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_mockTestId_fkey` FOREIGN KEY (`mockTestId`) REFERENCES `MockTest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttemptQuestion` ADD CONSTRAINT `AttemptQuestion_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttemptQuestion` ADD CONSTRAINT `AttemptQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttemptAnswer` ADD CONSTRAINT `AttemptAnswer_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttemptAnswer` ADD CONSTRAINT `AttemptAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPurchase` ADD CONSTRAINT `ProductPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPurchase` ADD CONSTRAINT `ProductPurchase_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralPayoutMethod` ADD CONSTRAINT `ReferralPayoutMethod_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralWithdrawal` ADD CONSTRAINT `ReferralWithdrawal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralWithdrawal` ADD CONSTRAINT `ReferralWithdrawal_payoutMethodId_fkey` FOREIGN KEY (`payoutMethodId`) REFERENCES `ReferralPayoutMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `ProductPurchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReferralTransaction` ADD CONSTRAINT `ReferralTransaction_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `ReferralWithdrawal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactConversation` ADD CONSTRAINT `ContactConversation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactMessage` ADD CONSTRAINT `ContactMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ContactConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProfile` ADD CONSTRAINT `TuitionProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProfile` ADD CONSTRAINT `TuitionProfile_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `TuitionBoard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProfile` ADD CONSTRAINT `TuitionProfile_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `TuitionSubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProfile` ADD CONSTRAINT `TuitionProfile_activeSyllabusId_fkey` FOREIGN KEY (`activeSyllabusId`) REFERENCES `TuitionSyllabus`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabusUpload` ADD CONSTRAINT `TuitionSyllabusUpload_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabusUpload` ADD CONSTRAINT `TuitionSyllabusUpload_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabus` ADD CONSTRAINT `TuitionSyllabus_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabus` ADD CONSTRAINT `TuitionSyllabus_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabus` ADD CONSTRAINT `TuitionSyllabus_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `TuitionSyllabusUpload`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabus` ADD CONSTRAINT `TuitionSyllabus_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `TuitionBoard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabus` ADD CONSTRAINT `TuitionSyllabus_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `TuitionSubject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSyllabusChapter` ADD CONSTRAINT `TuitionSyllabusChapter_syllabusId_fkey` FOREIGN KEY (`syllabusId`) REFERENCES `TuitionSyllabus`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionChapterPlan` ADD CONSTRAINT `TuitionChapterPlan_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionChapterPlan` ADD CONSTRAINT `TuitionChapterPlan_syllabusChapterId_fkey` FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSession` ADD CONSTRAINT `TuitionSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSession` ADD CONSTRAINT `TuitionSession_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `TuitionProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionSession` ADD CONSTRAINT `TuitionSession_syllabusChapterId_fkey` FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionMessage` ADD CONSTRAINT `TuitionMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `TuitionSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProgress` ADD CONSTRAINT `TuitionProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TuitionProgress` ADD CONSTRAINT `TuitionProgress_syllabusChapterId_fkey` FOREIGN KEY (`syllabusChapterId`) REFERENCES `TuitionSyllabusChapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
