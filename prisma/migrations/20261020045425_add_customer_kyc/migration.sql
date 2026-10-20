-- AlterTable
ALTER TABLE `submission` ADD COLUMN `addressLine` VARCHAR(191) NULL,
    ADD COLUMN `barangay` VARCHAR(191) NULL,
    ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `customerId` VARCHAR(191) NULL,
    ADD COLUMN `idNumber` VARCHAR(64) NULL,
    ADD COLUMN `idType` ENUM('PHILSYS', 'DRIVERS_LICENSE', 'PASSPORT', 'UMID', 'SSS', 'GSIS', 'PRC', 'POSTAL', 'VOTERS', 'SENIOR_CITIZEN', 'PWD', 'TIN', 'OTHER') NULL;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `customerCode` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `suffix` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `nationality` VARCHAR(191) NOT NULL DEFAULT 'Filipino',
    `mobile` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NULL,
    `addressLine` VARCHAR(191) NULL,
    `barangay` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `postalCode` VARCHAR(10) NULL,
    `idType` ENUM('PHILSYS', 'DRIVERS_LICENSE', 'PASSPORT', 'UMID', 'SSS', 'GSIS', 'PRC', 'POSTAL', 'VOTERS', 'SENIOR_CITIZEN', 'PWD', 'TIN', 'OTHER') NULL,
    `idNumber` VARCHAR(64) NULL,
    `idExpiry` DATETIME(3) NULL,
    `tin` VARCHAR(20) NULL,
    `kycStatus` ENUM('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `riskRating` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
    `verifiedById` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `screenedAt` DATETIME(3) NULL,
    `kycNotes` TEXT NULL,
    `consentGivenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_customerCode_key`(`customerCode`),
    UNIQUE INDEX `Customer_mobile_key`(`mobile`),
    INDEX `Customer_kycStatus_createdAt_idx`(`kycStatus`, `createdAt`),
    INDEX `Customer_lastName_firstName_idx`(`lastName`, `firstName`),
    INDEX `Customer_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerDocument` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `kind` ENUM('ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS', 'SIGNATURE', 'OTHER') NOT NULL,
    `storageKey` VARCHAR(512) NOT NULL,
    `contentType` VARCHAR(100) NOT NULL,
    `bytes` INTEGER NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerDocument_customerId_kind_idx`(`customerId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Submission_customerId_idx` ON `Submission`(`customerId`);

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerDocument` ADD CONSTRAINT `CustomerDocument_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
