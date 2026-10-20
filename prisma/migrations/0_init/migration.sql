-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'APPRAISER', 'VIEWER') NOT NULL DEFAULT 'APPRAISER',
    `branch` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_active_role_idx`(`active`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` VARCHAR(191) NOT NULL,
    `publicToken` VARCHAR(191) NOT NULL,
    `refCode` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OFFER_SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `plateNumber` VARCHAR(191) NULL,
    `vin` VARCHAR(32) NULL,
    `make` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `variant` VARCHAR(191) NULL,
    `year` INTEGER NULL,
    `transmission` ENUM('AUTOMATIC', 'MANUAL', 'CVT', 'DCT') NULL,
    `fuelType` ENUM('GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG') NULL,
    `bodyType` ENUM('SEDAN', 'HATCHBACK', 'SUV', 'MPV', 'PICKUP', 'VAN', 'CROSSOVER', 'COUPE', 'OTHER') NULL,
    `colour` VARCHAR(191) NULL,
    `mileageKm` INTEGER NULL,
    `conditionGrade` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') NULL,
    `hasAccidentHistory` BOOLEAN NOT NULL DEFAULT false,
    `isFloodDamaged` BOOLEAN NOT NULL DEFAULT false,
    `tireConditionPct` INTEGER NULL,
    `hasWarningLights` BOOLEAN NOT NULL DEFAULT false,
    `airconWorking` BOOLEAN NOT NULL DEFAULT true,
    `issuesNotes` TEXT NULL,
    `hasCR` BOOLEAN NOT NULL DEFAULT false,
    `hasOR` BOOLEAN NOT NULL DEFAULT false,
    `orExpiryDate` DATETIME(3) NULL,
    `hasDeedOfSale` BOOLEAN NOT NULL DEFAULT false,
    `hasInsurance` BOOLEAN NOT NULL DEFAULT false,
    `isEncumbered` BOOLEAN NOT NULL DEFAULT false,
    `isUnderFinancing` BOOLEAN NOT NULL DEFAULT false,
    `financingBalance` INTEGER NULL,
    `lastRegistrationYear` INTEGER NULL,
    `customerName` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `preferredBranch` VARCHAR(191) NULL,
    `consentGiven` BOOLEAN NOT NULL DEFAULT false,
    `lastStep` INTEGER NOT NULL DEFAULT 1,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Submission_publicToken_key`(`publicToken`),
    UNIQUE INDEX `Submission_refCode_key`(`refCode`),
    INDEX `Submission_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `Submission_createdAt_idx`(`createdAt`),
    INDEX `Submission_customerPhone_idx`(`customerPhone`),
    INDEX `Submission_make_model_year_idx`(`make`, `model`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Photo` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `slot` ENUM('FRONT_34', 'REAR_34', 'LEFT_SIDE', 'RIGHT_SIDE', 'INTERIOR_FRONT', 'INTERIOR_REAR', 'DASH_ODOMETER', 'ENGINE_BAY', 'TIRES', 'DAMAGE', 'DOC_CR', 'DOC_OR', 'DOC_ID', 'OTHER') NOT NULL,
    `storageKey` VARCHAR(512) NOT NULL,
    `contentType` VARCHAR(100) NOT NULL,
    `bytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Photo_submissionId_slot_idx`(`submissionId`, `slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comparable` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `source` ENUM('FACEBOOK_MARKETPLACE', 'PARTNER_API', 'MANUAL', 'SEED') NOT NULL,
    `externalId` VARCHAR(128) NULL,
    `title` VARCHAR(400) NOT NULL,
    `url` TEXT NOT NULL,
    `pricePhp` INTEGER NOT NULL,
    `year` INTEGER NULL,
    `mileageKm` INTEGER NULL,
    `location` VARCHAR(191) NULL,
    `imageUrl` TEXT NULL,
    `postedAt` DATETIME(3) NULL,
    `isExcluded` BOOLEAN NOT NULL DEFAULT false,
    `bucket` ENUM('LOW', 'MID', 'HIGH') NULL,
    `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `addedById` VARCHAR(191) NULL,

    INDEX `Comparable_submissionId_isExcluded_idx`(`submissionId`, `isExcluded`),
    INDEX `Comparable_submissionId_pricePhp_idx`(`submissionId`, `pricePhp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Offer` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'SUPERSEDED') NOT NULL DEFAULT 'PENDING_REVIEW',
    `compLowPhp` INTEGER NOT NULL,
    `compMidPhp` INTEGER NOT NULL,
    `compHighPhp` INTEGER NOT NULL,
    `compCount` INTEGER NOT NULL DEFAULT 0,
    `compLowId` VARCHAR(191) NULL,
    `compMidId` VARCHAR(191) NULL,
    `compHighId` VARCHAR(191) NULL,
    `systemOfferPhp` INTEGER NOT NULL,
    `appraiserOfferPhp` INTEGER NULL,
    `finalOfferPhp` INTEGER NULL,
    `breakdown` JSON NOT NULL,
    `appraiserNotes` TEXT NULL,
    `customerMessage` TEXT NULL,
    `validUntil` DATETIME(3) NULL,
    `appraiserId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `respondedAt` DATETIME(3) NULL,
    `declineReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Offer_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Offer_appraiserId_idx`(`appraiserId`),
    UNIQUE INDEX `Offer_submissionId_version_key`(`submissionId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OfferEvent` (
    `id` VARCHAR(191) NOT NULL,
    `offerId` VARCHAR(191) NOT NULL,
    `type` ENUM('GENERATED', 'VIEWED_BY_APPRAISER', 'ADJUSTED', 'SENT_TO_CUSTOMER', 'VIEWED_BY_CUSTOMER', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'NOTE_ADDED', 'COMPARABLES_REFRESHED') NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OfferEvent_offerId_createdAt_idx`(`offerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity` VARCHAR(60) NOT NULL,
    `entityId` VARCHAR(60) NOT NULL,
    `meta` JSON NULL,
    `ip` VARCHAR(60) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comparable` ADD CONSTRAINT `Comparable_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `Submission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Offer` ADD CONSTRAINT `Offer_appraiserId_fkey` FOREIGN KEY (`appraiserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferEvent` ADD CONSTRAINT `OfferEvent_offerId_fkey` FOREIGN KEY (`offerId`) REFERENCES `Offer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OfferEvent` ADD CONSTRAINT `OfferEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

