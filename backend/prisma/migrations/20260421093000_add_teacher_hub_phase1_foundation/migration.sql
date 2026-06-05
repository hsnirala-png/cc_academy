CREATE TABLE `TeacherFeatureFlagRollout` (
  `id` VARCHAR(191) NOT NULL,
  `flagKey` VARCHAR(120) NOT NULL,
  `scopeType` VARCHAR(40) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `teacherProfileId` VARCHAR(191) NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `note` TEXT NULL,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherFeatureFlagRollout_flagKey_scopeType_isEnabled_idx`(`flagKey`, `scopeType`, `isEnabled`),
  INDEX `TeacherFeatureFlagRollout_userId_flagKey_idx`(`userId`, `flagKey`),
  INDEX `TeacherFeatureFlagRollout_teacherProfileId_flagKey_idx`(`teacherProfileId`, `flagKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherProfile` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `headline` VARCHAR(191) NULL,
  `bio` LONGTEXT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `canTeachOneToOne` BOOLEAN NOT NULL DEFAULT true,
  `canTeachBatch` BOOLEAN NOT NULL DEFAULT false,
  `subjectsJson` JSON NULL,
  `boardsJson` JSON NULL,
  `classLevelsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TeacherProfile_userId_key`(`userId`),
  INDEX `TeacherProfile_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherKyc` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `legalName` VARCHAR(191) NULL,
  `documentType` VARCHAR(80) NULL,
  `documentNumberMasked` VARCHAR(80) NULL,
  `verificationStatus` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `documentMetaJson` JSON NULL,
  `verifiedByAdminId` VARCHAR(191) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TeacherKyc_teacherProfileId_key`(`teacherProfileId`),
  INDEX `TeacherKyc_verificationStatus_updatedAt_idx`(`verificationStatus`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherPayoutAccount` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `accountType` VARCHAR(40) NOT NULL,
  `accountLabelMasked` VARCHAR(191) NOT NULL,
  `accountMetaJson` JSON NULL,
  `isVerified` BOOLEAN NOT NULL DEFAULT false,
  `verifiedByAdminId` VARCHAR(191) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherPayoutAccount_teacherProfileId_createdAt_idx`(`teacherProfileId`, `createdAt`),
  INDEX `TeacherPayoutAccount_isVerified_updatedAt_idx`(`isVerified`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherOffering` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `mode` VARCHAR(40) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `board` VARCHAR(120) NULL,
  `classLevel` INTEGER NULL,
  `subject` VARCHAR(120) NOT NULL,
  `billingCycle` VARCHAR(40) NOT NULL,
  `cyclePrice` DECIMAL(10, 2) NOT NULL,
  `demoPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `batchCapacity` INTEGER NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `description` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherOffering_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherOffering_status_isPublished_updatedAt_idx`(`status`, `isPublished`, `updatedAt`),
  INDEX `TeacherOffering_subject_board_classLevel_idx`(`subject`, `board`, `classLevel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherOfferingPolicy` (
  `id` VARCHAR(191) NOT NULL,
  `teacherOfferingId` VARCHAR(191) NOT NULL,
  `cancellationPolicy` TEXT NULL,
  `refundPolicy` TEXT NULL,
  `noShowPolicy` TEXT NULL,
  `lateJoinPolicy` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TeacherOfferingPolicy_teacherOfferingId_key`(`teacherOfferingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherRequirement` (
  `id` VARCHAR(191) NOT NULL,
  `studentUserId` VARCHAR(191) NOT NULL,
  `board` VARCHAR(120) NULL,
  `classLevel` INTEGER NULL,
  `subject` VARCHAR(120) NOT NULL,
  `modeWanted` VARCHAR(40) NOT NULL,
  `goals` TEXT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherRequirement_studentUserId_updatedAt_idx`(`studentUserId`, `updatedAt`),
  INDEX `TeacherRequirement_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherEnrollment` (
  `id` VARCHAR(191) NOT NULL,
  `studentUserId` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `teacherOfferingId` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NULL,
  `mode` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `billingCycle` VARCHAR(40) NOT NULL,
  `currentCycleStart` DATETIME(3) NULL,
  `currentCycleEnd` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherEnrollment_studentUserId_updatedAt_idx`(`studentUserId`, `updatedAt`),
  INDEX `TeacherEnrollment_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherEnrollment_teacherOfferingId_updatedAt_idx`(`teacherOfferingId`, `updatedAt`),
  INDEX `TeacherEnrollment_batchId_updatedAt_idx`(`batchId`, `updatedAt`),
  INDEX `TeacherEnrollment_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBatch` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `teacherOfferingId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `capacity` INTEGER NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherBatch_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherBatch_teacherOfferingId_updatedAt_idx`(`teacherOfferingId`, `updatedAt`),
  INDEX `TeacherBatch_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBatchStudent` (
  `id` VARCHAR(191) NOT NULL,
  `batchId` VARCHAR(191) NOT NULL,
  `studentUserId` VARCHAR(191) NOT NULL,
  `enrollmentId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TeacherBatchStudent_batchId_studentUserId_key`(`batchId`, `studentUserId`),
  UNIQUE INDEX `TeacherBatchStudent_enrollmentId_key`(`enrollmentId`),
  INDEX `TeacherBatchStudent_batchId_updatedAt_idx`(`batchId`, `updatedAt`),
  INDEX `TeacherBatchStudent_studentUserId_updatedAt_idx`(`studentUserId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBoard` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `enrollmentId` VARCHAR(191) NULL,
  `batchId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherBoard_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherBoard_enrollmentId_updatedAt_idx`(`enrollmentId`, `updatedAt`),
  INDEX `TeacherBoard_batchId_updatedAt_idx`(`batchId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBoardSession` (
  `id` VARCHAR(191) NOT NULL,
  `teacherBoardId` VARCHAR(191) NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `endedAt` DATETIME(3) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  `summary` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherBoardSession_teacherBoardId_startedAt_idx`(`teacherBoardId`, `startedAt`),
  INDEX `TeacherBoardSession_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBoardArtifact` (
  `id` VARCHAR(191) NOT NULL,
  `teacherBoardId` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NULL,
  `artifactType` VARCHAR(40) NOT NULL,
  `title` VARCHAR(191) NULL,
  `storageUrl` VARCHAR(1000) NULL,
  `mimeType` VARCHAR(191) NULL,
  `payloadJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherBoardArtifact_teacherBoardId_updatedAt_idx`(`teacherBoardId`, `updatedAt`),
  INDEX `TeacherBoardArtifact_sessionId_updatedAt_idx`(`sessionId`, `updatedAt`),
  INDEX `TeacherBoardArtifact_artifactType_updatedAt_idx`(`artifactType`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherContentItem` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `enrollmentId` VARCHAR(191) NULL,
  `batchId` VARCHAR(191) NULL,
  `contentType` VARCHAR(40) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` LONGTEXT NULL,
  `visibility` VARCHAR(40) NOT NULL DEFAULT 'ENROLLED_ONLY',
  `status` VARCHAR(40) NOT NULL DEFAULT 'PUBLISHED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherContentItem_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherContentItem_enrollmentId_updatedAt_idx`(`enrollmentId`, `updatedAt`),
  INDEX `TeacherContentItem_batchId_updatedAt_idx`(`batchId`, `updatedAt`),
  INDEX `TeacherContentItem_contentType_status_updatedAt_idx`(`contentType`, `status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherContentAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `contentItemId` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `storageUrl` VARCHAR(1000) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherContentAttachment_contentItemId_createdAt_idx`(`contentItemId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherNotice` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(40) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PUBLISHED',
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherNotice_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherNotice_targetType_targetId_updatedAt_idx`(`targetType`, `targetId`, `updatedAt`),
  INDEX `TeacherNotice_status_publishedAt_idx`(`status`, `publishedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherNoticeRecipient` (
  `id` VARCHAR(191) NOT NULL,
  `teacherNoticeId` VARCHAR(191) NOT NULL,
  `studentUserId` VARCHAR(191) NOT NULL,
  `deliveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TeacherNoticeRecipient_teacherNoticeId_studentUserId_key`(`teacherNoticeId`, `studentUserId`),
  INDEX `TeacherNoticeRecipient_studentUserId_updatedAt_idx`(`studentUserId`, `updatedAt`),
  INDEX `TeacherNoticeRecipient_readAt_idx`(`readAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherOrder` (
  `id` VARCHAR(191) NOT NULL,
  `studentUserId` VARCHAR(191) NOT NULL,
  `teacherEnrollmentId` VARCHAR(191) NOT NULL,
  `teacherOfferingId` VARCHAR(191) NOT NULL,
  `billingCycle` VARCHAR(40) NOT NULL,
  `grossAmount` DECIMAL(10, 2) NOT NULL,
  `platformFeeAmount` DECIMAL(10, 2) NOT NULL,
  `netTeacherAmount` DECIMAL(10, 2) NOT NULL,
  `paymentStatus` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `cycleStart` DATETIME(3) NULL,
  `cycleEnd` DATETIME(3) NULL,
  `isDemo` BOOLEAN NOT NULL DEFAULT false,
  `razorpayOrderId` VARCHAR(191) NULL,
  `razorpayPaymentId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherOrder_studentUserId_updatedAt_idx`(`studentUserId`, `updatedAt`),
  INDEX `TeacherOrder_teacherEnrollmentId_updatedAt_idx`(`teacherEnrollmentId`, `updatedAt`),
  INDEX `TeacherOrder_paymentStatus_updatedAt_idx`(`paymentStatus`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherBillingCycle` (
  `id` VARCHAR(191) NOT NULL,
  `teacherEnrollmentId` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `cycleType` VARCHAR(40) NOT NULL,
  `startsOn` DATETIME(3) NOT NULL,
  `endsOn` DATETIME(3) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  `grossAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `platformFeeAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `netAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherBillingCycle_teacherEnrollmentId_updatedAt_idx`(`teacherEnrollmentId`, `updatedAt`),
  INDEX `TeacherBillingCycle_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherBillingCycle_status_endsOn_idx`(`status`, `endsOn`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherLedgerEntry` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `billingCycleId` VARCHAR(191) NULL,
  `teacherOrderId` VARCHAR(191) NULL,
  `entryType` VARCHAR(40) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherLedgerEntry_teacherProfileId_createdAt_idx`(`teacherProfileId`, `createdAt`),
  INDEX `TeacherLedgerEntry_billingCycleId_createdAt_idx`(`billingCycleId`, `createdAt`),
  INDEX `TeacherLedgerEntry_teacherOrderId_createdAt_idx`(`teacherOrderId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherPayout` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NOT NULL,
  `payoutAccountId` VARCHAR(191) NULL,
  `cycleCount` INTEGER NOT NULL DEFAULT 0,
  `grossAmount` DECIMAL(10, 2) NOT NULL,
  `platformFeeAmount` DECIMAL(10, 2) NOT NULL,
  `adjustmentAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `netAmount` DECIMAL(10, 2) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `releasedAt` DATETIME(3) NULL,
  `approvedByAdminId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherPayout_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`),
  INDEX `TeacherPayout_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherModerationFlag` (
  `id` VARCHAR(191) NOT NULL,
  `teacherProfileId` VARCHAR(191) NULL,
  `enrollmentId` VARCHAR(191) NULL,
  `contentItemId` VARCHAR(191) NULL,
  `noticeId` VARCHAR(191) NULL,
  `scopeType` VARCHAR(40) NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `details` TEXT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'OPEN',
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `TeacherModerationFlag_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `TeacherModerationFlag_teacherProfileId_updatedAt_idx`(`teacherProfileId`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TeacherAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `scopeType` VARCHAR(40) NOT NULL,
  `scopeId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(120) NOT NULL,
  `summary` TEXT NOT NULL,
  `detailsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `TeacherAuditLog_scopeType_scopeId_createdAt_idx`(`scopeType`, `scopeId`, `createdAt`),
  INDEX `TeacherAuditLog_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
