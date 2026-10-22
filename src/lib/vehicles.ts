/**
 * Philippine used-car reference catalogue, model years 2000 onward.
 *
 * Each entry carries the years that nameplate was sold here, so the model
 * picker only offers what could actually exist for the year the customer
 * chose — a 2004 Toyota can't be a Raize, and a 2023 one can't be a Revo.
 *
 * `newPricePhp` is an approximate SRP for a mid-range variant. For a nameplate
 * that has run for twenty years it is the recent SRP, and `floorRatio` is what
 * keeps the oldest model years landing somewhere sensible — for long-running,
 * expensive nameplates the floor is deliberately low, because depreciation off
 * a current SRP would otherwise leave a 2001 unit far above its real value.
 *
 * These are reference figures for the fallback valuation, not a price list.
 * The appraiser always sees the real comparables beside them.
 */

export type BodyKind =
  | "SEDAN"
  | "HATCHBACK"
  | "SUV"
  | "MPV"
  | "PICKUP"
  | "VAN"
  | "CROSSOVER"
  | "COUPE"
  | "OTHER";

export type ModelSpec = {
  name: string;
  body: BodyKind;
  /** Approximate SRP of a mid-range variant, in pesos. */
  newPricePhp: number;
  /** Observed first-years depreciation rate for this nameplate locally. */
  annualDep: number;
  /** Floor as a share of SRP — older units stop falling at some point. */
  floorRatio: number;
  /** First model year sold in the Philippines (catalogue starts at 2000). */
  from: number;
  /** Last model year, or null while it is still sold new. */
  to: number | null;
};

/** The oldest model year this catalogue covers. */
export const CATALOG_FROM_YEAR = 2000;

/** Where each make comes from — used to group the picker. */
export type MakeRegion = "Japanese" | "Korean" | "Chinese" | "European" | "American";

export const MAKE_REGIONS: Record<string, MakeRegion> = {
  Toyota: "Japanese",
  Mitsubishi: "Japanese",
  Honda: "Japanese",
  Nissan: "Japanese",
  Suzuki: "Japanese",
  Isuzu: "Japanese",
  Mazda: "Japanese",
  Subaru: "Japanese",
  Hyundai: "Korean",
  Kia: "Korean",
  MG: "Chinese",
  Geely: "Chinese",
  Chery: "Chinese",
  Changan: "Chinese",
  Foton: "Chinese",
  BMW: "European",
  "Mercedes-Benz": "European",
  Audi: "European",
  Volkswagen: "European",
  Volvo: "European",
  Peugeot: "European",
  MINI: "European",
  Porsche: "European",
  "Land Rover": "European",
  Jaguar: "European",
  Ford: "American",
  Chevrolet: "American",
  Jeep: "American",
  Dodge: "American",
  Chrysler: "American",
  Cadillac: "American",
  GMC: "American",
  Lincoln: "American",
  Tesla: "American",
};

export const VEHICLE_CATALOG: Record<string, ModelSpec[]> = {
  // ── Japanese ──────────────────────────────────────────────────────────────
  Toyota: [
    { name: "Vios", body: "SEDAN", newPricePhp: 850_000, annualDep: 0.1, floorRatio: 0.2, from: 2003, to: null },
    { name: "Wigo", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.11, floorRatio: 0.2, from: 2014, to: null },
    { name: "Yaris", body: "HATCHBACK", newPricePhp: 950_000, annualDep: 0.115, floorRatio: 0.17, from: 2007, to: 2021 },
    { name: "Corolla", body: "SEDAN", newPricePhp: 800_000, annualDep: 0.12, floorRatio: 0.17, from: 2000, to: 2007 },
    { name: "Corolla Altis", body: "SEDAN", newPricePhp: 1_300_000, annualDep: 0.115, floorRatio: 0.13, from: 2001, to: null },
    { name: "Corolla Cross", body: "CROSSOVER", newPricePhp: 1_700_000, annualDep: 0.1, floorRatio: 0.22, from: 2020, to: null },
    { name: "Camry", body: "SEDAN", newPricePhp: 2_300_000, annualDep: 0.14, floorRatio: 0.1, from: 2000, to: null },
    { name: "Innova", body: "MPV", newPricePhp: 1_350_000, annualDep: 0.085, floorRatio: 0.21, from: 2005, to: null },
    { name: "Revo", body: "MPV", newPricePhp: 700_000, annualDep: 0.1, floorRatio: 0.18, from: 2000, to: 2005 },
    { name: "Avanza", body: "MPV", newPricePhp: 950_000, annualDep: 0.105, floorRatio: 0.18, from: 2006, to: null },
    { name: "Veloz", body: "MPV", newPricePhp: 1_250_000, annualDep: 0.1, floorRatio: 0.21, from: 2022, to: null },
    { name: "Rush", body: "CROSSOVER", newPricePhp: 1_120_000, annualDep: 0.1, floorRatio: 0.21, from: 2018, to: null },
    { name: "Raize", body: "CROSSOVER", newPricePhp: 1_000_000, annualDep: 0.1, floorRatio: 0.21, from: 2022, to: null },
    { name: "RAV4", body: "SUV", newPricePhp: 2_300_000, annualDep: 0.12, floorRatio: 0.12, from: 2001, to: null },
    { name: "Fortuner", body: "SUV", newPricePhp: 2_100_000, annualDep: 0.095, floorRatio: 0.17, from: 2005, to: null },
    { name: "Hilux", body: "PICKUP", newPricePhp: 1_450_000, annualDep: 0.09, floorRatio: 0.21, from: 2000, to: null },
    { name: "Hiace", body: "VAN", newPricePhp: 1_900_000, annualDep: 0.095, floorRatio: 0.18, from: 2000, to: null },
    { name: "Lite Ace", body: "VAN", newPricePhp: 900_000, annualDep: 0.1, floorRatio: 0.2, from: 2019, to: null },
    { name: "Alphard", body: "VAN", newPricePhp: 4_500_000, annualDep: 0.1, floorRatio: 0.2, from: 2008, to: null },
    { name: "Previa", body: "MPV", newPricePhp: 2_200_000, annualDep: 0.13, floorRatio: 0.1, from: 2000, to: 2019 },
    { name: "Prius", body: "HATCHBACK", newPricePhp: 2_200_000, annualDep: 0.14, floorRatio: 0.1, from: 2010, to: 2022 },
    { name: "FJ Cruiser", body: "SUV", newPricePhp: 2_600_000, annualDep: 0.07, floorRatio: 0.32, from: 2012, to: 2022 },
    { name: "Land Cruiser Prado", body: "SUV", newPricePhp: 3_400_000, annualDep: 0.085, floorRatio: 0.2, from: 2000, to: null },
    { name: "Land Cruiser", body: "SUV", newPricePhp: 5_200_000, annualDep: 0.08, floorRatio: 0.22, from: 2000, to: null },
  ],
  Mitsubishi: [
    { name: "Mirage", body: "HATCHBACK", newPricePhp: 720_000, annualDep: 0.12, floorRatio: 0.18, from: 2012, to: null },
    { name: "Mirage G4", body: "SEDAN", newPricePhp: 780_000, annualDep: 0.12, floorRatio: 0.18, from: 2014, to: null },
    { name: "Lancer", body: "SEDAN", newPricePhp: 900_000, annualDep: 0.12, floorRatio: 0.14, from: 2000, to: 2017 },
    { name: "Lancer Evolution", body: "SEDAN", newPricePhp: 2_800_000, annualDep: 0.06, floorRatio: 0.4, from: 2003, to: 2016 },
    { name: "Galant", body: "SEDAN", newPricePhp: 1_400_000, annualDep: 0.14, floorRatio: 0.1, from: 2000, to: 2012 },
    // Mostly grey imports here, and an enthusiast car rather than a commuter —
    // hence the high floor. It stopped falling years ago.
    { name: "Eclipse", body: "COUPE", newPricePhp: 1_600_000, annualDep: 0.11, floorRatio: 0.25, from: 2000, to: 2012 },
    { name: "Adventure", body: "MPV", newPricePhp: 900_000, annualDep: 0.09, floorRatio: 0.2, from: 2000, to: 2017 },
    { name: "Xpander", body: "MPV", newPricePhp: 1_150_000, annualDep: 0.1, floorRatio: 0.21, from: 2018, to: null },
    { name: "Xpander Cross", body: "CROSSOVER", newPricePhp: 1_300_000, annualDep: 0.1, floorRatio: 0.21, from: 2020, to: null },
    { name: "ASX", body: "CROSSOVER", newPricePhp: 1_200_000, annualDep: 0.13, floorRatio: 0.13, from: 2011, to: 2020 },
    { name: "Outlander", body: "SUV", newPricePhp: 1_800_000, annualDep: 0.13, floorRatio: 0.12, from: 2004, to: 2021 },
    { name: "Eclipse Cross", body: "CROSSOVER", newPricePhp: 1_600_000, annualDep: 0.12, floorRatio: 0.16, from: 2018, to: null },
    { name: "Montero Sport", body: "SUV", newPricePhp: 1_900_000, annualDep: 0.105, floorRatio: 0.18, from: 2008, to: null },
    { name: "Pajero", body: "SUV", newPricePhp: 2_700_000, annualDep: 0.1, floorRatio: 0.16, from: 2000, to: 2021 },
    { name: "Strada", body: "PICKUP", newPricePhp: 1_400_000, annualDep: 0.1, floorRatio: 0.21, from: 2000, to: null },
    { name: "L300", body: "VAN", newPricePhp: 1_030_000, annualDep: 0.075, floorRatio: 0.28, from: 2000, to: null },
  ],
  Honda: [
    { name: "City", body: "SEDAN", newPricePhp: 1_000_000, annualDep: 0.105, floorRatio: 0.15, from: 2000, to: null },
    { name: "Civic", body: "SEDAN", newPricePhp: 1_650_000, annualDep: 0.115, floorRatio: 0.12, from: 2000, to: null },
    { name: "Accord", body: "SEDAN", newPricePhp: 2_300_000, annualDep: 0.14, floorRatio: 0.09, from: 2000, to: null },
    { name: "Jazz", body: "HATCHBACK", newPricePhp: 950_000, annualDep: 0.11, floorRatio: 0.16, from: 2004, to: 2020 },
    { name: "Brio", body: "HATCHBACK", newPricePhp: 750_000, annualDep: 0.11, floorRatio: 0.19, from: 2015, to: null },
    { name: "Mobilio", body: "MPV", newPricePhp: 950_000, annualDep: 0.12, floorRatio: 0.16, from: 2015, to: 2021 },
    { name: "BR-V", body: "MPV", newPricePhp: 1_200_000, annualDep: 0.105, floorRatio: 0.2, from: 2016, to: null },
    { name: "HR-V", body: "CROSSOVER", newPricePhp: 1_500_000, annualDep: 0.11, floorRatio: 0.19, from: 2015, to: null },
    { name: "CR-V", body: "SUV", newPricePhp: 2_100_000, annualDep: 0.115, floorRatio: 0.13, from: 2000, to: null },
    { name: "Pilot", body: "SUV", newPricePhp: 2_400_000, annualDep: 0.14, floorRatio: 0.1, from: 2008, to: 2015 },
    { name: "Odyssey", body: "VAN", newPricePhp: 2_600_000, annualDep: 0.14, floorRatio: 0.1, from: 2000, to: 2018 },
  ],
  Nissan: [
    { name: "Almera", body: "SEDAN", newPricePhp: 800_000, annualDep: 0.12, floorRatio: 0.17, from: 2012, to: null },
    { name: "Sentra", body: "SEDAN", newPricePhp: 850_000, annualDep: 0.125, floorRatio: 0.13, from: 2000, to: 2013 },
    { name: "Sylphy", body: "SEDAN", newPricePhp: 1_200_000, annualDep: 0.13, floorRatio: 0.12, from: 2012, to: 2020 },
    { name: "Altima", body: "SEDAN", newPricePhp: 1_600_000, annualDep: 0.14, floorRatio: 0.1, from: 2008, to: 2016 },
    { name: "Livina", body: "MPV", newPricePhp: 900_000, annualDep: 0.12, floorRatio: 0.15, from: 2008, to: 2014 },
    { name: "Juke", body: "CROSSOVER", newPricePhp: 1_050_000, annualDep: 0.13, floorRatio: 0.15, from: 2015, to: null },
    { name: "X-Trail", body: "SUV", newPricePhp: 1_650_000, annualDep: 0.125, floorRatio: 0.13, from: 2003, to: null },
    { name: "Murano", body: "SUV", newPricePhp: 2_300_000, annualDep: 0.15, floorRatio: 0.09, from: 2005, to: 2015 },
    { name: "Terra", body: "SUV", newPricePhp: 1_800_000, annualDep: 0.115, floorRatio: 0.18, from: 2018, to: null },
    { name: "Patrol", body: "SUV", newPricePhp: 3_200_000, annualDep: 0.11, floorRatio: 0.16, from: 2000, to: null },
    { name: "Frontier", body: "PICKUP", newPricePhp: 1_100_000, annualDep: 0.1, floorRatio: 0.18, from: 2000, to: 2008 },
    { name: "Navara", body: "PICKUP", newPricePhp: 1_450_000, annualDep: 0.11, floorRatio: 0.2, from: 2008, to: null },
    { name: "Urvan", body: "VAN", newPricePhp: 1_700_000, annualDep: 0.09, floorRatio: 0.22, from: 2000, to: null },
    { name: "Serena", body: "VAN", newPricePhp: 1_600_000, annualDep: 0.13, floorRatio: 0.11, from: 2000, to: 2011 },
  ],
  Suzuki: [
    { name: "Alto", body: "HATCHBACK", newPricePhp: 500_000, annualDep: 0.12, floorRatio: 0.15, from: 2010, to: 2019 },
    { name: "Celerio", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.12, floorRatio: 0.18, from: 2015, to: null },
    { name: "S-Presso", body: "HATCHBACK", newPricePhp: 620_000, annualDep: 0.125, floorRatio: 0.17, from: 2020, to: null },
    { name: "Swift", body: "HATCHBACK", newPricePhp: 800_000, annualDep: 0.115, floorRatio: 0.16, from: 2006, to: null },
    { name: "Dzire", body: "SEDAN", newPricePhp: 750_000, annualDep: 0.115, floorRatio: 0.17, from: 2018, to: null },
    { name: "Ciaz", body: "SEDAN", newPricePhp: 900_000, annualDep: 0.13, floorRatio: 0.14, from: 2016, to: 2021 },
    { name: "Ertiga", body: "MPV", newPricePhp: 1_000_000, annualDep: 0.11, floorRatio: 0.18, from: 2012, to: null },
    { name: "XL7", body: "CROSSOVER", newPricePhp: 1_100_000, annualDep: 0.11, floorRatio: 0.19, from: 2020, to: null },
    { name: "SX4", body: "CROSSOVER", newPricePhp: 1_000_000, annualDep: 0.14, floorRatio: 0.11, from: 2008, to: 2014 },
    { name: "Vitara", body: "SUV", newPricePhp: 1_300_000, annualDep: 0.13, floorRatio: 0.13, from: 2000, to: 2005 },
    { name: "Grand Vitara", body: "SUV", newPricePhp: 1_500_000, annualDep: 0.13, floorRatio: 0.12, from: 2006, to: 2018 },
    { name: "Jimny", body: "SUV", newPricePhp: 1_250_000, annualDep: 0.05, floorRatio: 0.38, from: 2000, to: null },
    { name: "APV", body: "VAN", newPricePhp: 850_000, annualDep: 0.1, floorRatio: 0.2, from: 2005, to: 2021 },
    { name: "Carry", body: "VAN", newPricePhp: 700_000, annualDep: 0.1, floorRatio: 0.2, from: 2010, to: null },
  ],
  Isuzu: [
    { name: "Hi-Lander", body: "MPV", newPricePhp: 900_000, annualDep: 0.09, floorRatio: 0.2, from: 2000, to: 2006 },
    { name: "Crosswind", body: "MPV", newPricePhp: 1_000_000, annualDep: 0.085, floorRatio: 0.22, from: 2001, to: 2017 },
    { name: "Trooper", body: "SUV", newPricePhp: 1_600_000, annualDep: 0.11, floorRatio: 0.14, from: 2000, to: 2004 },
    { name: "Alterra", body: "SUV", newPricePhp: 1_500_000, annualDep: 0.11, floorRatio: 0.16, from: 2005, to: 2014 },
    { name: "mu-X", body: "SUV", newPricePhp: 1_900_000, annualDep: 0.105, floorRatio: 0.2, from: 2014, to: null },
    { name: "D-Max", body: "PICKUP", newPricePhp: 1_400_000, annualDep: 0.1, floorRatio: 0.21, from: 2003, to: null },
    { name: "Traviz", body: "VAN", newPricePhp: 900_000, annualDep: 0.1, floorRatio: 0.22, from: 2019, to: null },
  ],
  Mazda: [
    { name: "Mazda 323", body: "SEDAN", newPricePhp: 700_000, annualDep: 0.13, floorRatio: 0.12, from: 2000, to: 2004 },
    { name: "Mazda2", body: "HATCHBACK", newPricePhp: 900_000, annualDep: 0.13, floorRatio: 0.14, from: 2010, to: null },
    { name: "Mazda3", body: "SEDAN", newPricePhp: 1_500_000, annualDep: 0.13, floorRatio: 0.13, from: 2004, to: null },
    { name: "Mazda6", body: "SEDAN", newPricePhp: 2_000_000, annualDep: 0.145, floorRatio: 0.1, from: 2003, to: null },
    { name: "CX-3", body: "CROSSOVER", newPricePhp: 1_300_000, annualDep: 0.135, floorRatio: 0.14, from: 2016, to: null },
    { name: "CX-30", body: "CROSSOVER", newPricePhp: 1_600_000, annualDep: 0.13, floorRatio: 0.17, from: 2020, to: null },
    { name: "CX-5", body: "SUV", newPricePhp: 1_900_000, annualDep: 0.13, floorRatio: 0.15, from: 2012, to: null },
    { name: "CX-8", body: "SUV", newPricePhp: 2_400_000, annualDep: 0.13, floorRatio: 0.16, from: 2019, to: null },
    { name: "CX-9", body: "SUV", newPricePhp: 2_600_000, annualDep: 0.14, floorRatio: 0.11, from: 2008, to: null },
    { name: "BT-50", body: "PICKUP", newPricePhp: 1_400_000, annualDep: 0.12, floorRatio: 0.17, from: 2012, to: null },
    { name: "Tribute", body: "SUV", newPricePhp: 1_300_000, annualDep: 0.14, floorRatio: 0.1, from: 2001, to: 2008 },
    { name: "MX-5", body: "COUPE", newPricePhp: 2_200_000, annualDep: 0.1, floorRatio: 0.22, from: 2000, to: null },
  ],
  Subaru: [
    { name: "Impreza", body: "SEDAN", newPricePhp: 1_400_000, annualDep: 0.14, floorRatio: 0.11, from: 2002, to: null },
    { name: "WRX", body: "SEDAN", newPricePhp: 2_300_000, annualDep: 0.11, floorRatio: 0.2, from: 2004, to: null },
    { name: "Legacy", body: "SEDAN", newPricePhp: 1_900_000, annualDep: 0.15, floorRatio: 0.09, from: 2000, to: 2015 },
    { name: "XV", body: "CROSSOVER", newPricePhp: 1_600_000, annualDep: 0.14, floorRatio: 0.14, from: 2012, to: null },
    { name: "Forester", body: "SUV", newPricePhp: 1_900_000, annualDep: 0.135, floorRatio: 0.12, from: 2000, to: null },
    { name: "Outback", body: "SUV", newPricePhp: 2_400_000, annualDep: 0.145, floorRatio: 0.1, from: 2003, to: null },
    { name: "BRZ", body: "COUPE", newPricePhp: 2_200_000, annualDep: 0.11, floorRatio: 0.2, from: 2013, to: null },
  ],

  // ── Korean ────────────────────────────────────────────────────────────────
  Hyundai: [
    { name: "Eon", body: "HATCHBACK", newPricePhp: 500_000, annualDep: 0.12, floorRatio: 0.14, from: 2012, to: 2019 },
    { name: "Getz", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.13, floorRatio: 0.11, from: 2003, to: 2011 },
    { name: "i10", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.13, floorRatio: 0.12, from: 2008, to: 2013 },
    { name: "Accent", body: "SEDAN", newPricePhp: 850_000, annualDep: 0.125, floorRatio: 0.14, from: 2000, to: null },
    { name: "Reina", body: "SEDAN", newPricePhp: 750_000, annualDep: 0.13, floorRatio: 0.13, from: 2019, to: 2022 },
    { name: "Elantra", body: "SEDAN", newPricePhp: 1_200_000, annualDep: 0.13, floorRatio: 0.12, from: 2001, to: null },
    { name: "Kona", body: "CROSSOVER", newPricePhp: 1_300_000, annualDep: 0.13, floorRatio: 0.14, from: 2019, to: null },
    { name: "Creta", body: "CROSSOVER", newPricePhp: 1_200_000, annualDep: 0.12, floorRatio: 0.17, from: 2022, to: null },
    { name: "Stargazer", body: "MPV", newPricePhp: 1_100_000, annualDep: 0.12, floorRatio: 0.17, from: 2022, to: null },
    { name: "Tucson", body: "SUV", newPricePhp: 1_600_000, annualDep: 0.13, floorRatio: 0.12, from: 2005, to: null },
    { name: "Santa Fe", body: "SUV", newPricePhp: 2_200_000, annualDep: 0.14, floorRatio: 0.1, from: 2001, to: null },
    { name: "Starex", body: "VAN", newPricePhp: 1_800_000, annualDep: 0.12, floorRatio: 0.15, from: 2000, to: null },
    { name: "Staria", body: "VAN", newPricePhp: 2_600_000, annualDep: 0.13, floorRatio: 0.16, from: 2022, to: null },
    { name: "H-100", body: "VAN", newPricePhp: 1_000_000, annualDep: 0.1, floorRatio: 0.2, from: 2008, to: null },
  ],
  Kia: [
    { name: "Pride", body: "SEDAN", newPricePhp: 450_000, annualDep: 0.13, floorRatio: 0.11, from: 2000, to: 2003 },
    { name: "Rio", body: "SEDAN", newPricePhp: 800_000, annualDep: 0.13, floorRatio: 0.12, from: 2001, to: null },
    { name: "Picanto", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.125, floorRatio: 0.14, from: 2005, to: null },
    { name: "Soluto", body: "SEDAN", newPricePhp: 750_000, annualDep: 0.13, floorRatio: 0.15, from: 2019, to: null },
    { name: "Forte", body: "SEDAN", newPricePhp: 1_000_000, annualDep: 0.14, floorRatio: 0.11, from: 2009, to: 2018 },
    { name: "Stonic", body: "CROSSOVER", newPricePhp: 950_000, annualDep: 0.13, floorRatio: 0.15, from: 2021, to: null },
    { name: "Seltos", body: "CROSSOVER", newPricePhp: 1_300_000, annualDep: 0.13, floorRatio: 0.15, from: 2020, to: null },
    { name: "Soul", body: "CROSSOVER", newPricePhp: 1_100_000, annualDep: 0.14, floorRatio: 0.11, from: 2010, to: 2019 },
    { name: "Carens", body: "MPV", newPricePhp: 1_100_000, annualDep: 0.14, floorRatio: 0.11, from: 2003, to: 2013 },
    { name: "Sportage", body: "SUV", newPricePhp: 1_600_000, annualDep: 0.14, floorRatio: 0.11, from: 2005, to: null },
    { name: "Sorento", body: "SUV", newPricePhp: 2_200_000, annualDep: 0.14, floorRatio: 0.1, from: 2003, to: null },
    { name: "Carnival", body: "VAN", newPricePhp: 2_400_000, annualDep: 0.12, floorRatio: 0.14, from: 2000, to: null },
  ],

  // ── Chinese ───────────────────────────────────────────────────────────────
  MG: [
    { name: "MG3", body: "HATCHBACK", newPricePhp: 750_000, annualDep: 0.15, floorRatio: 0.13, from: 2021, to: null },
    { name: "MG5", body: "SEDAN", newPricePhp: 900_000, annualDep: 0.155, floorRatio: 0.13, from: 2021, to: null },
    { name: "MG6", body: "SEDAN", newPricePhp: 1_300_000, annualDep: 0.16, floorRatio: 0.12, from: 2021, to: 2023 },
    { name: "ZS", body: "CROSSOVER", newPricePhp: 1_000_000, annualDep: 0.15, floorRatio: 0.13, from: 2019, to: null },
    { name: "RX5", body: "SUV", newPricePhp: 1_350_000, annualDep: 0.155, floorRatio: 0.13, from: 2019, to: null },
  ],
  Geely: [
    { name: "Emgrand", body: "SEDAN", newPricePhp: 900_000, annualDep: 0.15, floorRatio: 0.13, from: 2022, to: null },
    { name: "GX3 Pro", body: "CROSSOVER", newPricePhp: 800_000, annualDep: 0.15, floorRatio: 0.13, from: 2022, to: null },
    { name: "Coolray", body: "CROSSOVER", newPricePhp: 1_150_000, annualDep: 0.14, floorRatio: 0.14, from: 2019, to: null },
    { name: "Azkarra", body: "CROSSOVER", newPricePhp: 1_400_000, annualDep: 0.15, floorRatio: 0.13, from: 2020, to: null },
    { name: "Okavango", body: "SUV", newPricePhp: 1_650_000, annualDep: 0.145, floorRatio: 0.14, from: 2021, to: null },
  ],
  Chery: [
    { name: "Arrizo 5", body: "SEDAN", newPricePhp: 850_000, annualDep: 0.155, floorRatio: 0.12, from: 2019, to: 2022 },
    { name: "Tiggo 2 Pro", body: "CROSSOVER", newPricePhp: 800_000, annualDep: 0.15, floorRatio: 0.13, from: 2022, to: null },
    { name: "Tiggo 5X", body: "CROSSOVER", newPricePhp: 1_000_000, annualDep: 0.15, floorRatio: 0.13, from: 2019, to: null },
    { name: "Tiggo 7 Pro", body: "SUV", newPricePhp: 1_400_000, annualDep: 0.15, floorRatio: 0.13, from: 2021, to: null },
    { name: "Tiggo 8 Pro", body: "SUV", newPricePhp: 1_700_000, annualDep: 0.15, floorRatio: 0.13, from: 2021, to: null },
  ],
  Changan: [
    { name: "Alsvin", body: "SEDAN", newPricePhp: 750_000, annualDep: 0.15, floorRatio: 0.13, from: 2021, to: null },
    { name: "CS35 Plus", body: "CROSSOVER", newPricePhp: 1_000_000, annualDep: 0.15, floorRatio: 0.13, from: 2021, to: null },
    { name: "CS55 Plus", body: "SUV", newPricePhp: 1_300_000, annualDep: 0.15, floorRatio: 0.13, from: 2022, to: null },
  ],
  Foton: [
    { name: "Gratour", body: "VAN", newPricePhp: 650_000, annualDep: 0.12, floorRatio: 0.16, from: 2012, to: null },
    { name: "View Transvan", body: "VAN", newPricePhp: 1_300_000, annualDep: 0.12, floorRatio: 0.16, from: 2012, to: null },
    { name: "Thunder", body: "PICKUP", newPricePhp: 950_000, annualDep: 0.13, floorRatio: 0.15, from: 2014, to: null },
    { name: "Toplander", body: "SUV", newPricePhp: 1_200_000, annualDep: 0.14, floorRatio: 0.12, from: 2015, to: 2020 },
  ],

  // ── European ──────────────────────────────────────────────────────────────
  BMW: [
    { name: "1 Series", body: "HATCHBACK", newPricePhp: 2_400_000, annualDep: 0.16, floorRatio: 0.09, from: 2005, to: null },
    { name: "3 Series", body: "SEDAN", newPricePhp: 3_200_000, annualDep: 0.16, floorRatio: 0.08, from: 2000, to: null },
    { name: "5 Series", body: "SEDAN", newPricePhp: 4_800_000, annualDep: 0.17, floorRatio: 0.07, from: 2000, to: null },
    { name: "7 Series", body: "SEDAN", newPricePhp: 8_500_000, annualDep: 0.19, floorRatio: 0.05, from: 2000, to: null },
    { name: "M3", body: "SEDAN", newPricePhp: 7_500_000, annualDep: 0.12, floorRatio: 0.16, from: 2008, to: null },
    { name: "Z4", body: "COUPE", newPricePhp: 4_200_000, annualDep: 0.15, floorRatio: 0.11, from: 2003, to: null },
    { name: "X1", body: "CROSSOVER", newPricePhp: 2_900_000, annualDep: 0.15, floorRatio: 0.1, from: 2010, to: null },
    { name: "X3", body: "SUV", newPricePhp: 3_900_000, annualDep: 0.15, floorRatio: 0.09, from: 2004, to: null },
    { name: "X5", body: "SUV", newPricePhp: 5_800_000, annualDep: 0.16, floorRatio: 0.08, from: 2000, to: null },
    { name: "X7", body: "SUV", newPricePhp: 8_500_000, annualDep: 0.16, floorRatio: 0.1, from: 2019, to: null },
  ],
  "Mercedes-Benz": [
    { name: "A-Class", body: "HATCHBACK", newPricePhp: 2_700_000, annualDep: 0.16, floorRatio: 0.1, from: 2013, to: null },
    { name: "C-Class", body: "SEDAN", newPricePhp: 3_600_000, annualDep: 0.16, floorRatio: 0.08, from: 2000, to: null },
    { name: "CLA", body: "SEDAN", newPricePhp: 3_200_000, annualDep: 0.16, floorRatio: 0.1, from: 2014, to: null },
    { name: "E-Class", body: "SEDAN", newPricePhp: 5_200_000, annualDep: 0.17, floorRatio: 0.07, from: 2000, to: null },
    { name: "S-Class", body: "SEDAN", newPricePhp: 11_000_000, annualDep: 0.19, floorRatio: 0.05, from: 2000, to: null },
    { name: "GLA", body: "CROSSOVER", newPricePhp: 3_100_000, annualDep: 0.15, floorRatio: 0.1, from: 2014, to: null },
    { name: "GLB", body: "CROSSOVER", newPricePhp: 3_600_000, annualDep: 0.15, floorRatio: 0.11, from: 2020, to: null },
    { name: "GLC", body: "SUV", newPricePhp: 4_400_000, annualDep: 0.15, floorRatio: 0.1, from: 2016, to: null },
    { name: "GLE", body: "SUV", newPricePhp: 6_500_000, annualDep: 0.16, floorRatio: 0.08, from: 2000, to: null },
    { name: "V-Class", body: "VAN", newPricePhp: 5_200_000, annualDep: 0.15, floorRatio: 0.11, from: 2015, to: null },
  ],
  Audi: [
    { name: "A3", body: "HATCHBACK", newPricePhp: 2_600_000, annualDep: 0.16, floorRatio: 0.1, from: 2014, to: null },
    { name: "A4", body: "SEDAN", newPricePhp: 3_400_000, annualDep: 0.17, floorRatio: 0.08, from: 2000, to: null },
    { name: "A6", body: "SEDAN", newPricePhp: 5_200_000, annualDep: 0.18, floorRatio: 0.06, from: 2000, to: null },
    { name: "TT", body: "COUPE", newPricePhp: 4_000_000, annualDep: 0.15, floorRatio: 0.11, from: 2002, to: null },
    { name: "Q3", body: "CROSSOVER", newPricePhp: 3_000_000, annualDep: 0.16, floorRatio: 0.1, from: 2015, to: null },
    { name: "Q5", body: "SUV", newPricePhp: 4_200_000, annualDep: 0.16, floorRatio: 0.09, from: 2010, to: null },
    { name: "Q7", body: "SUV", newPricePhp: 6_200_000, annualDep: 0.17, floorRatio: 0.07, from: 2007, to: null },
  ],
  Volkswagen: [
    { name: "Polo", body: "HATCHBACK", newPricePhp: 1_000_000, annualDep: 0.14, floorRatio: 0.12, from: 2015, to: null },
    { name: "Golf", body: "HATCHBACK", newPricePhp: 1_800_000, annualDep: 0.15, floorRatio: 0.1, from: 2013, to: null },
    { name: "Beetle", body: "COUPE", newPricePhp: 2_200_000, annualDep: 0.13, floorRatio: 0.16, from: 2013, to: 2019 },
    { name: "Santana", body: "SEDAN", newPricePhp: 900_000, annualDep: 0.14, floorRatio: 0.12, from: 2019, to: 2022 },
    { name: "Lavida", body: "SEDAN", newPricePhp: 1_200_000, annualDep: 0.14, floorRatio: 0.12, from: 2019, to: 2023 },
    { name: "Jetta", body: "SEDAN", newPricePhp: 1_400_000, annualDep: 0.15, floorRatio: 0.1, from: 2013, to: 2019 },
    { name: "T-Cross", body: "CROSSOVER", newPricePhp: 1_400_000, annualDep: 0.14, floorRatio: 0.13, from: 2021, to: null },
    { name: "Tiguan", body: "SUV", newPricePhp: 2_200_000, annualDep: 0.15, floorRatio: 0.1, from: 2015, to: null },
    { name: "Touran", body: "MPV", newPricePhp: 1_800_000, annualDep: 0.15, floorRatio: 0.1, from: 2017, to: 2021 },
  ],
  Volvo: [
    { name: "S60", body: "SEDAN", newPricePhp: 3_200_000, annualDep: 0.17, floorRatio: 0.08, from: 2002, to: null },
    { name: "S90", body: "SEDAN", newPricePhp: 4_500_000, annualDep: 0.17, floorRatio: 0.08, from: 2017, to: null },
    { name: "XC40", body: "CROSSOVER", newPricePhp: 3_200_000, annualDep: 0.15, floorRatio: 0.11, from: 2019, to: null },
    { name: "XC60", body: "SUV", newPricePhp: 4_200_000, annualDep: 0.16, floorRatio: 0.09, from: 2010, to: null },
    { name: "XC90", body: "SUV", newPricePhp: 5_500_000, annualDep: 0.16, floorRatio: 0.09, from: 2003, to: null },
  ],
  Peugeot: [
    { name: "301", body: "SEDAN", newPricePhp: 1_100_000, annualDep: 0.16, floorRatio: 0.09, from: 2015, to: 2020 },
    { name: "308", body: "HATCHBACK", newPricePhp: 1_800_000, annualDep: 0.17, floorRatio: 0.08, from: 2015, to: null },
    { name: "2008", body: "CROSSOVER", newPricePhp: 1_500_000, annualDep: 0.16, floorRatio: 0.09, from: 2015, to: null },
    { name: "3008", body: "CROSSOVER", newPricePhp: 2_300_000, annualDep: 0.16, floorRatio: 0.09, from: 2014, to: null },
    { name: "5008", body: "SUV", newPricePhp: 2_700_000, annualDep: 0.16, floorRatio: 0.09, from: 2018, to: null },
    { name: "Traveller", body: "VAN", newPricePhp: 2_900_000, annualDep: 0.16, floorRatio: 0.1, from: 2019, to: null },
  ],
  MINI: [
    { name: "Cooper", body: "HATCHBACK", newPricePhp: 2_600_000, annualDep: 0.13, floorRatio: 0.14, from: 2003, to: null },
    { name: "Clubman", body: "HATCHBACK", newPricePhp: 2_900_000, annualDep: 0.14, floorRatio: 0.12, from: 2008, to: null },
    { name: "Countryman", body: "CROSSOVER", newPricePhp: 3_200_000, annualDep: 0.14, floorRatio: 0.12, from: 2011, to: null },
  ],
  Porsche: [
    { name: "Boxster", body: "COUPE", newPricePhp: 6_500_000, annualDep: 0.12, floorRatio: 0.16, from: 2000, to: null },
    { name: "911", body: "COUPE", newPricePhp: 12_000_000, annualDep: 0.09, floorRatio: 0.24, from: 2000, to: null },
    { name: "Panamera", body: "SEDAN", newPricePhp: 9_500_000, annualDep: 0.16, floorRatio: 0.09, from: 2010, to: null },
    { name: "Macan", body: "SUV", newPricePhp: 5_800_000, annualDep: 0.14, floorRatio: 0.14, from: 2014, to: null },
    { name: "Cayenne", body: "SUV", newPricePhp: 8_000_000, annualDep: 0.15, floorRatio: 0.1, from: 2003, to: null },
  ],
  "Land Rover": [
    { name: "Defender", body: "SUV", newPricePhp: 6_500_000, annualDep: 0.11, floorRatio: 0.2, from: 2000, to: null },
    { name: "Discovery", body: "SUV", newPricePhp: 5_800_000, annualDep: 0.16, floorRatio: 0.09, from: 2000, to: null },
    { name: "Discovery Sport", body: "SUV", newPricePhp: 4_200_000, annualDep: 0.16, floorRatio: 0.1, from: 2015, to: null },
    { name: "Range Rover Evoque", body: "SUV", newPricePhp: 4_500_000, annualDep: 0.16, floorRatio: 0.1, from: 2012, to: null },
    { name: "Range Rover Sport", body: "SUV", newPricePhp: 7_500_000, annualDep: 0.16, floorRatio: 0.09, from: 2006, to: null },
    { name: "Range Rover", body: "SUV", newPricePhp: 11_000_000, annualDep: 0.17, floorRatio: 0.07, from: 2000, to: null },
  ],
  Jaguar: [
    { name: "XE", body: "SEDAN", newPricePhp: 3_600_000, annualDep: 0.18, floorRatio: 0.07, from: 2016, to: null },
    { name: "XF", body: "SEDAN", newPricePhp: 4_500_000, annualDep: 0.18, floorRatio: 0.06, from: 2009, to: null },
    { name: "F-Pace", body: "SUV", newPricePhp: 5_200_000, annualDep: 0.17, floorRatio: 0.08, from: 2017, to: null },
  ],

  // ── American ──────────────────────────────────────────────────────────────
  Ford: [
    { name: "Lynx", body: "SEDAN", newPricePhp: 750_000, annualDep: 0.13, floorRatio: 0.11, from: 2000, to: 2005 },
    { name: "Fiesta", body: "HATCHBACK", newPricePhp: 850_000, annualDep: 0.145, floorRatio: 0.11, from: 2010, to: 2019 },
    { name: "Focus", body: "HATCHBACK", newPricePhp: 1_100_000, annualDep: 0.14, floorRatio: 0.11, from: 2005, to: 2016 },
    { name: "Mustang", body: "COUPE", newPricePhp: 3_200_000, annualDep: 0.09, floorRatio: 0.26, from: 2015, to: null },
    { name: "EcoSport", body: "CROSSOVER", newPricePhp: 950_000, annualDep: 0.14, floorRatio: 0.13, from: 2014, to: 2021 },
    { name: "Territory", body: "CROSSOVER", newPricePhp: 1_300_000, annualDep: 0.125, floorRatio: 0.16, from: 2021, to: null },
    { name: "Escape", body: "SUV", newPricePhp: 1_500_000, annualDep: 0.135, floorRatio: 0.11, from: 2001, to: null },
    { name: "Everest", body: "SUV", newPricePhp: 2_000_000, annualDep: 0.115, floorRatio: 0.16, from: 2004, to: null },
    { name: "Explorer", body: "SUV", newPricePhp: 2_600_000, annualDep: 0.13, floorRatio: 0.12, from: 2000, to: null },
    { name: "Expedition", body: "SUV", newPricePhp: 3_800_000, annualDep: 0.13, floorRatio: 0.12, from: 2000, to: null },
    { name: "Ranger", body: "PICKUP", newPricePhp: 1_600_000, annualDep: 0.105, floorRatio: 0.19, from: 2000, to: null },
    { name: "Ranger Raptor", body: "PICKUP", newPricePhp: 2_300_000, annualDep: 0.09, floorRatio: 0.26, from: 2019, to: null },
    { name: "F-150", body: "PICKUP", newPricePhp: 3_200_000, annualDep: 0.11, floorRatio: 0.18, from: 2000, to: null },
  ],
  Chevrolet: [
    { name: "Aveo", body: "HATCHBACK", newPricePhp: 700_000, annualDep: 0.15, floorRatio: 0.09, from: 2005, to: 2012 },
    { name: "Spark", body: "HATCHBACK", newPricePhp: 650_000, annualDep: 0.14, floorRatio: 0.11, from: 2010, to: 2019 },
    { name: "Optra", body: "SEDAN", newPricePhp: 800_000, annualDep: 0.15, floorRatio: 0.09, from: 2004, to: 2010 },
    { name: "Cruze", body: "SEDAN", newPricePhp: 1_100_000, annualDep: 0.15, floorRatio: 0.1, from: 2010, to: 2018 },
    { name: "Sail", body: "SEDAN", newPricePhp: 700_000, annualDep: 0.15, floorRatio: 0.1, from: 2015, to: 2019 },
    { name: "Camaro", body: "COUPE", newPricePhp: 3_200_000, annualDep: 0.11, floorRatio: 0.2, from: 2010, to: 2023 },
    { name: "Orlando", body: "MPV", newPricePhp: 1_300_000, annualDep: 0.15, floorRatio: 0.1, from: 2012, to: 2017 },
    { name: "Captiva", body: "SUV", newPricePhp: 1_500_000, annualDep: 0.15, floorRatio: 0.09, from: 2007, to: 2018 },
    { name: "Trailblazer", body: "SUV", newPricePhp: 1_800_000, annualDep: 0.145, floorRatio: 0.12, from: 2012, to: null },
    { name: "Tahoe", body: "SUV", newPricePhp: 3_800_000, annualDep: 0.12, floorRatio: 0.16, from: 2000, to: null },
    { name: "Suburban", body: "SUV", newPricePhp: 4_500_000, annualDep: 0.12, floorRatio: 0.16, from: 2000, to: null },
    { name: "Colorado", body: "PICKUP", newPricePhp: 1_500_000, annualDep: 0.14, floorRatio: 0.14, from: 2012, to: null },
  ],
  Jeep: [
    { name: "Renegade", body: "CROSSOVER", newPricePhp: 1_700_000, annualDep: 0.14, floorRatio: 0.12, from: 2016, to: null },
    { name: "Compass", body: "CROSSOVER", newPricePhp: 1_900_000, annualDep: 0.14, floorRatio: 0.12, from: 2018, to: null },
    { name: "Cherokee", body: "SUV", newPricePhp: 2_400_000, annualDep: 0.14, floorRatio: 0.12, from: 2014, to: null },
    { name: "Grand Cherokee", body: "SUV", newPricePhp: 3_600_000, annualDep: 0.13, floorRatio: 0.12, from: 2000, to: null },
    { name: "Wrangler", body: "SUV", newPricePhp: 3_200_000, annualDep: 0.07, floorRatio: 0.3, from: 2000, to: null },
  ],
  Dodge: [
    { name: "Journey", body: "MPV", newPricePhp: 1_800_000, annualDep: 0.15, floorRatio: 0.1, from: 2012, to: 2019 },
    { name: "Charger", body: "SEDAN", newPricePhp: 2_600_000, annualDep: 0.13, floorRatio: 0.14, from: 2012, to: null },
    { name: "Durango", body: "SUV", newPricePhp: 2_800_000, annualDep: 0.14, floorRatio: 0.12, from: 2012, to: null },
  ],
  Chrysler: [
    { name: "300C", body: "SEDAN", newPricePhp: 2_800_000, annualDep: 0.15, floorRatio: 0.1, from: 2006, to: 2019 },
    { name: "Town & Country", body: "VAN", newPricePhp: 2_400_000, annualDep: 0.15, floorRatio: 0.1, from: 2008, to: 2016 },
  ],
  Cadillac: [
    { name: "CTS", body: "SEDAN", newPricePhp: 2_800_000, annualDep: 0.16, floorRatio: 0.09, from: 2004, to: 2019 },
    { name: "SRX", body: "SUV", newPricePhp: 2_900_000, annualDep: 0.16, floorRatio: 0.09, from: 2010, to: 2016 },
    { name: "Escalade", body: "SUV", newPricePhp: 5_500_000, annualDep: 0.14, floorRatio: 0.12, from: 2002, to: null },
  ],
  GMC: [
    { name: "Yukon", body: "SUV", newPricePhp: 4_200_000, annualDep: 0.12, floorRatio: 0.16, from: 2010, to: null },
    { name: "Sierra", body: "PICKUP", newPricePhp: 3_800_000, annualDep: 0.12, floorRatio: 0.16, from: 2014, to: null },
    { name: "Savana", body: "VAN", newPricePhp: 3_600_000, annualDep: 0.12, floorRatio: 0.16, from: 2010, to: null },
  ],
  Lincoln: [
    { name: "Navigator", body: "SUV", newPricePhp: 5_200_000, annualDep: 0.14, floorRatio: 0.12, from: 2000, to: null },
  ],
  Tesla: [
    { name: "Model 3", body: "SEDAN", newPricePhp: 2_900_000, annualDep: 0.14, floorRatio: 0.16, from: 2022, to: null },
    { name: "Model Y", body: "CROSSOVER", newPricePhp: 3_300_000, annualDep: 0.14, floorRatio: 0.16, from: 2022, to: null },
    { name: "Model S", body: "SEDAN", newPricePhp: 5_500_000, annualDep: 0.16, floorRatio: 0.12, from: 2022, to: null },
    { name: "Model X", body: "SUV", newPricePhp: 6_200_000, annualDep: 0.16, floorRatio: 0.12, from: 2022, to: null },
  ],
};

export const MAKES = Object.keys(VEHICLE_CATALOG).sort((a, b) =>
  a.localeCompare(b),
);

/** Makes grouped by origin, each group's makes sorted, for the picker. */
export const MAKES_BY_REGION: Array<{ region: MakeRegion; makes: string[] }> = (
  ["Japanese", "Korean", "Chinese", "European", "American"] as MakeRegion[]
).map((region) => ({
  region,
  makes: MAKES.filter((make) => MAKE_REGIONS[make] === region),
}));

/**
 * Models for a make, narrowed to the ones sold in that model year.
 *
 * Without a year every model is returned, so the picker still works if the
 * customer fills the form out of order.
 */
export function modelsFor(
  make: string | null | undefined,
  year?: number | null,
): ModelSpec[] {
  const models = make ? (VEHICLE_CATALOG[make] ?? []) : [];
  if (!year) return models;
  return models.filter(
    (m) => year >= m.from && (m.to === null || year <= m.to),
  );
}

/** Makes that sold at least one model in the given year. */
export function makesFor(year?: number | null): string[] {
  if (!year) return MAKES;
  return MAKES.filter((make) => modelsFor(make, year).length > 0);
}

export function findSpec(
  make: string | null | undefined,
  model: string | null | undefined,
): ModelSpec | null {
  if (!make || !model) return null;
  return VEHICLE_CATALOG[make]?.find((m) => m.name === model) ?? null;
}

/** Typical annual mileage in PH city use — the yardstick for mileage penalties. */
export const EXPECTED_KM_PER_YEAR = 15_000;

export const PROVINCES = [
  "Metro Manila",
  "Cebu",
  "Davao del Sur",
  "Pampanga",
  "Cavite",
  "Laguna",
  "Rizal",
  "Bulacan",
  "Batangas",
  "Iloilo",
  "Negros Occidental",
  "Pangasinan",
  "Nueva Ecija",
  "Benguet",
  "Misamis Oriental",
  "Zamboanga del Sur",
  "South Cotabato",
  "Albay",
  "Leyte",
  "Bohol",
  "Other",
];
