-- Motorcycles and tricycles alongside cars. Existing rows are all cars.
ALTER TABLE `submission`
  ADD COLUMN `vehicleClass` ENUM('FOUR_WHEEL', 'TWO_THREE_WHEEL') NOT NULL DEFAULT 'FOUR_WHEEL';

CREATE INDEX `Submission_vehicleClass_idx` ON `submission`(`vehicleClass`);

-- Body shapes that only exist on two and three wheels.
ALTER TABLE `submission` MODIFY COLUMN `bodyType` ENUM(
  'SEDAN', 'HATCHBACK', 'SUV', 'MPV', 'PICKUP', 'VAN', 'CROSSOVER', 'COUPE',
  'SCOOTER', 'UNDERBONE', 'SPORT', 'NAKED', 'ADVENTURE', 'CRUISER', 'TRICYCLE',
  'OTHER'
) NULL;
