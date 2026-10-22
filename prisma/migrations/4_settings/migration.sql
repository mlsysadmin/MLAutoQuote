-- Settings an administrator can change without a redeploy.
CREATE TABLE `Setting` (
    `key` VARCHAR(60) NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedById` VARCHAR(191) NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Setting` ADD CONSTRAINT `Setting_updatedById_fkey`
    FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
