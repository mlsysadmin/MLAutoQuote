import type { ModelSpec } from "./vehicles";

/**
 * The two- and three-wheel catalogue.
 *
 * A separate file from the cars because almost nothing transfers: a ₱70,000
 * scooter and a ₱1,500,000 sedan do not depreciate alike, and the shapes
 * ("underbone", "tricycle") have no car equivalent. Sharing `ModelSpec` keeps
 * the valuation engine indifferent to which list a unit came from.
 *
 * Prices are PH SRP for a mid-range variant. Depreciation is steeper than for
 * cars in the first years and flattens earlier — a well-kept ten-year-old
 * Honda TMX is still worth real money to a tricycle operator, which is what
 * the higher floor ratios on the workhorses are saying.
 */

/** Body shapes that only exist on two and three wheels. */
export type BikeBody =
  | "SCOOTER"
  | "UNDERBONE"
  | "SPORT"
  | "NAKED"
  | "ADVENTURE"
  | "CRUISER"
  | "TRICYCLE"
  | "OTHER";

export type BikeSpec = Omit<ModelSpec, "body"> & { body: BikeBody };

export const MOTORCYCLE_CATALOG: Record<string, BikeSpec[]> = {
  Honda: [
    { name: "Click 125i", body: "SCOOTER", newPricePhp: 87_000, annualDep: 0.13, floorRatio: 0.22, from: 2015, to: null },
    { name: "Click 160", body: "SCOOTER", newPricePhp: 115_000, annualDep: 0.12, floorRatio: 0.24, from: 2022, to: null },
    { name: "Beat", body: "SCOOTER", newPricePhp: 73_000, annualDep: 0.14, floorRatio: 0.2, from: 2011, to: null },
    { name: "PCX160", body: "SCOOTER", newPricePhp: 165_000, annualDep: 0.12, floorRatio: 0.24, from: 2010, to: null },
    { name: "ADV160", body: "SCOOTER", newPricePhp: 175_000, annualDep: 0.12, floorRatio: 0.25, from: 2022, to: null },
    { name: "Airblade 160", body: "SCOOTER", newPricePhp: 125_000, annualDep: 0.13, floorRatio: 0.22, from: 2023, to: null },
    { name: "Wave 110", body: "UNDERBONE", newPricePhp: 62_000, annualDep: 0.13, floorRatio: 0.24, from: 2000, to: null },
    { name: "RS125", body: "UNDERBONE", newPricePhp: 78_000, annualDep: 0.13, floorRatio: 0.22, from: 2008, to: null },
    { name: "XRM125", body: "UNDERBONE", newPricePhp: 72_000, annualDep: 0.12, floorRatio: 0.26, from: 2004, to: null },
    { name: "TMX125 Alpha", body: "UNDERBONE", newPricePhp: 68_000, annualDep: 0.1, floorRatio: 0.3, from: 2004, to: null },
    { name: "TMX Supremo", body: "UNDERBONE", newPricePhp: 82_000, annualDep: 0.1, floorRatio: 0.3, from: 2012, to: null },
    { name: "CB150X", body: "ADVENTURE", newPricePhp: 165_000, annualDep: 0.13, floorRatio: 0.22, from: 2021, to: null },
    { name: "CB650R", body: "NAKED", newPricePhp: 520_000, annualDep: 0.13, floorRatio: 0.2, from: 2019, to: null },
    { name: "CBR150R", body: "SPORT", newPricePhp: 185_000, annualDep: 0.13, floorRatio: 0.22, from: 2011, to: null },
    { name: "XR150L", body: "ADVENTURE", newPricePhp: 125_000, annualDep: 0.12, floorRatio: 0.25, from: 2015, to: null },
    { name: "Rebel 500", body: "CRUISER", newPricePhp: 420_000, annualDep: 0.13, floorRatio: 0.21, from: 2017, to: null },
  ],
  Yamaha: [
    { name: "Mio i125", body: "SCOOTER", newPricePhp: 75_000, annualDep: 0.14, floorRatio: 0.2, from: 2016, to: null },
    { name: "Mio Sporty", body: "SCOOTER", newPricePhp: 70_000, annualDep: 0.14, floorRatio: 0.2, from: 2007, to: null },
    { name: "Mio Gear", body: "SCOOTER", newPricePhp: 82_000, annualDep: 0.13, floorRatio: 0.21, from: 2021, to: null },
    { name: "NMAX", body: "SCOOTER", newPricePhp: 155_000, annualDep: 0.12, floorRatio: 0.25, from: 2015, to: null },
    { name: "Aerox 155", body: "SCOOTER", newPricePhp: 135_000, annualDep: 0.12, floorRatio: 0.24, from: 2017, to: null },
    { name: "Sniper 155", body: "UNDERBONE", newPricePhp: 125_000, annualDep: 0.13, floorRatio: 0.22, from: 2019, to: null },
    { name: "Sniper 150", body: "UNDERBONE", newPricePhp: 110_000, annualDep: 0.13, floorRatio: 0.22, from: 2015, to: 2019 },
    { name: "YTX125", body: "UNDERBONE", newPricePhp: 72_000, annualDep: 0.12, floorRatio: 0.26, from: 2018, to: null },
    { name: "XTZ125", body: "ADVENTURE", newPricePhp: 115_000, annualDep: 0.12, floorRatio: 0.24, from: 2016, to: null },
    { name: "YZF-R15", body: "SPORT", newPricePhp: 175_000, annualDep: 0.13, floorRatio: 0.22, from: 2014, to: null },
    { name: "MT-15", body: "NAKED", newPricePhp: 170_000, annualDep: 0.13, floorRatio: 0.22, from: 2019, to: null },
    { name: "MT-07", body: "NAKED", newPricePhp: 480_000, annualDep: 0.13, floorRatio: 0.21, from: 2015, to: null },
  ],
  Suzuki: [
    { name: "Raider R150", body: "UNDERBONE", newPricePhp: 125_000, annualDep: 0.13, floorRatio: 0.23, from: 2006, to: null },
    { name: "Raider J Crossover", body: "UNDERBONE", newPricePhp: 78_000, annualDep: 0.13, floorRatio: 0.22, from: 2018, to: null },
    { name: "Smash 115", body: "UNDERBONE", newPricePhp: 62_000, annualDep: 0.13, floorRatio: 0.24, from: 2008, to: null },
    { name: "Burgman Street", body: "SCOOTER", newPricePhp: 90_000, annualDep: 0.13, floorRatio: 0.21, from: 2019, to: null },
    { name: "Avenis 125", body: "SCOOTER", newPricePhp: 82_000, annualDep: 0.13, floorRatio: 0.21, from: 2022, to: null },
    { name: "Gixxer 155", body: "NAKED", newPricePhp: 125_000, annualDep: 0.13, floorRatio: 0.22, from: 2017, to: null },
  ],
  Kawasaki: [
    { name: "Barako II", body: "UNDERBONE", newPricePhp: 85_000, annualDep: 0.1, floorRatio: 0.3, from: 2008, to: null },
    { name: "CT100", body: "UNDERBONE", newPricePhp: 62_000, annualDep: 0.12, floorRatio: 0.26, from: 2010, to: null },
    { name: "Rouser NS160", body: "NAKED", newPricePhp: 125_000, annualDep: 0.13, floorRatio: 0.22, from: 2017, to: null },
    { name: "Ninja 400", body: "SPORT", newPricePhp: 390_000, annualDep: 0.13, floorRatio: 0.21, from: 2018, to: null },
    { name: "Dominar 400", body: "NAKED", newPricePhp: 320_000, annualDep: 0.14, floorRatio: 0.2, from: 2017, to: null },
  ],
  Kymco: [
    { name: "Like 150i", body: "SCOOTER", newPricePhp: 125_000, annualDep: 0.14, floorRatio: 0.19, from: 2018, to: null },
    { name: "Downtown 250i", body: "SCOOTER", newPricePhp: 230_000, annualDep: 0.15, floorRatio: 0.18, from: 2016, to: null },
  ],
  SYM: [
    { name: "Jet 14", body: "SCOOTER", newPricePhp: 95_000, annualDep: 0.14, floorRatio: 0.19, from: 2019, to: null },
    { name: "Sport Rider 125i", body: "UNDERBONE", newPricePhp: 85_000, annualDep: 0.14, floorRatio: 0.19, from: 2017, to: null },
  ],
  Rusi: [
    { name: "Classic 150", body: "NAKED", newPricePhp: 58_000, annualDep: 0.16, floorRatio: 0.16, from: 2010, to: null },
    { name: "TC125", body: "UNDERBONE", newPricePhp: 48_000, annualDep: 0.16, floorRatio: 0.16, from: 2012, to: null },
    { name: "Classic 200", body: "CRUISER", newPricePhp: 72_000, annualDep: 0.16, floorRatio: 0.16, from: 2014, to: null },
  ],
  Motorstar: [
    { name: "Cafe 400", body: "CRUISER", newPricePhp: 75_000, annualDep: 0.16, floorRatio: 0.16, from: 2015, to: null },
    { name: "MSX125", body: "UNDERBONE", newPricePhp: 52_000, annualDep: 0.16, floorRatio: 0.16, from: 2013, to: null },
  ],
  KTM: [
    { name: "Duke 200", body: "NAKED", newPricePhp: 185_000, annualDep: 0.14, floorRatio: 0.2, from: 2013, to: null },
    { name: "Duke 390", body: "NAKED", newPricePhp: 330_000, annualDep: 0.14, floorRatio: 0.2, from: 2014, to: null },
    { name: "RC 390", body: "SPORT", newPricePhp: 350_000, annualDep: 0.14, floorRatio: 0.2, from: 2015, to: null },
    { name: "Adventure 390", body: "ADVENTURE", newPricePhp: 420_000, annualDep: 0.14, floorRatio: 0.2, from: 2020, to: null },
  ],
  Royal_Enfield: [
    { name: "Classic 350", body: "CRUISER", newPricePhp: 290_000, annualDep: 0.12, floorRatio: 0.24, from: 2021, to: null },
    { name: "Hunter 350", body: "NAKED", newPricePhp: 240_000, annualDep: 0.12, floorRatio: 0.23, from: 2022, to: null },
    { name: "Himalayan", body: "ADVENTURE", newPricePhp: 330_000, annualDep: 0.13, floorRatio: 0.22, from: 2018, to: null },
  ],
  CFMoto: [
    { name: "150NK", body: "NAKED", newPricePhp: 120_000, annualDep: 0.16, floorRatio: 0.17, from: 2018, to: null },
    { name: "300NK", body: "NAKED", newPricePhp: 215_000, annualDep: 0.16, floorRatio: 0.17, from: 2019, to: null },
  ],
  Bajaj: [
    { name: "Rouser 135", body: "NAKED", newPricePhp: 85_000, annualDep: 0.14, floorRatio: 0.2, from: 2012, to: null },
    { name: "Rouser NS200", body: "NAKED", newPricePhp: 145_000, annualDep: 0.14, floorRatio: 0.2, from: 2014, to: null },
  ],
};

/**
 * Makes with a space in the name are keyed with an underscore, because the
 * key is also what the public valuation pages use in their URLs. One place to
 * turn it back into something readable.
 */
export function displayMake(key: string): string {
  return key.replace(/_/g, " ");
}

export const MOTORCYCLE_MAKES = Object.keys(MOTORCYCLE_CATALOG).sort((a, b) =>
  displayMake(a).localeCompare(displayMake(b)),
);

/**
 * A tricycle is a motorcycle with a sidecar, and in the Philippines that is
 * most often an ordinary underbone someone has had a body built onto. So it
 * is a body type the customer picks, not a separate catalogue.
 */
export const TRICYCLE_BODY: BikeBody = "TRICYCLE";
