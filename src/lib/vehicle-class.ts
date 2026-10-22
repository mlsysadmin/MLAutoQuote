import { VEHICLE_CATALOG, MAKES, type ModelSpec } from "./vehicles";
import { MOTORCYCLE_CATALOG, MOTORCYCLE_MAKES, displayMake } from "./motorcycles";

/**
 * Cars and motorcycles, and everything that differs between them.
 *
 * The two halves of the business share one funnel, one appraiser queue and
 * one valuation engine. What they do not share is the model list, how many
 * kilometres is a lot, or which photographs are worth asking for — a scooter
 * has no engine bay to open and no back seat to photograph.
 *
 * Every one of those differences is answered from this file, so adding a
 * third class later is a matter of filling in a column rather than hunting
 * through components for the word "car".
 */

export type VehicleClass = "FOUR_WHEEL" | "TWO_THREE_WHEEL";

export const VEHICLE_CLASSES = [
  {
    value: "FOUR_WHEEL" as const,
    label: "Car, SUV or pickup",
    short: "4 wheels up",
    hint: "Sedans, hatchbacks, SUVs, MPVs, vans and pickups.",
  },
  {
    value: "TWO_THREE_WHEEL" as const,
    label: "Motorcycle or tricycle",
    short: "2–3 wheels",
    hint: "Scooters, underbones, big bikes and tricycles.",
  },
];

export function isTwoThreeWheel(value: string | null | undefined): boolean {
  return value === "TWO_THREE_WHEEL";
}

/** "car" or "motorcycle", for copy that has to name the thing. */
export function vehicleNoun(vehicleClass: string | null | undefined): string {
  return isTwoThreeWheel(vehicleClass) ? "motorcycle" : "car";
}

/** The makes to offer for this class. */
export function makesForClass(vehicleClass: string | null | undefined): string[] {
  return isTwoThreeWheel(vehicleClass) ? MOTORCYCLE_MAKES : MAKES;
}

/** The label to show for a make key, which may carry underscores. */
export function makeLabel(make: string): string {
  return displayMake(make);
}

/** The models of a make within a class, filtered to the ones sold that year. */
export function modelsForClass(
  vehicleClass: string | null | undefined,
  make: string | null | undefined,
  year?: number | null,
): ModelSpec[] {
  const catalog = isTwoThreeWheel(vehicleClass)
    ? MOTORCYCLE_CATALOG
    : VEHICLE_CATALOG;

  const models = (make ? (catalog[make] ?? []) : []) as ModelSpec[];
  if (!year) return models;
  return models.filter((m) => year >= m.from && (m.to === null || year <= m.to));
}

export function findSpecForClass(
  vehicleClass: string | null | undefined,
  make: string | null | undefined,
  model: string | null | undefined,
): ModelSpec | null {
  if (!make || !model) return null;
  const catalog = isTwoThreeWheel(vehicleClass)
    ? MOTORCYCLE_CATALOG
    : VEHICLE_CATALOG;
  return ((catalog[make] ?? []) as ModelSpec[]).find((m) => m.name === model) ?? null;
}

/**
 * Typical kilometres a year, which is the yardstick the valuation measures a
 * reading against.
 *
 * A motorcycle that has done 60,000 km has been ridden hard for a living; a
 * car at the same figure is unremarkable. Using the car's number for both
 * would quietly overpay for worn-out tricycles and underpay for every bike
 * that has only been to the office and back.
 */
export function expectedKmPerYear(
  vehicleClass: string | null | undefined,
): number {
  return isTwoThreeWheel(vehicleClass) ? 8_000 : 15_000;
}

/**
 * The transmissions worth offering.
 *
 * Nearly every bike here is either a twist-and-go scooter or a sequential
 * gearbox, and neither answer means what "Automatic" and "Manual" mean on a
 * car. Asking the car question of a motorcycle owner gets a shrug.
 */
export function transmissionOptions(vehicleClass: string | null | undefined) {
  if (isTwoThreeWheel(vehicleClass)) {
    return [
      { value: "CVT", label: "Automatic (twist-and-go)" },
      { value: "MANUAL", label: "Manual clutch" },
      { value: "AUTOMATIC", label: "Semi-automatic" },
    ];
  }
  return [
    { value: "AUTOMATIC", label: "Automatic" },
    { value: "MANUAL", label: "Manual" },
    { value: "CVT", label: "CVT" },
    { value: "DCT", label: "Dual clutch" },
  ];
}

/** Body shapes for the class, as the customer would name them. */
export function bodyOptions(vehicleClass: string | null | undefined) {
  if (isTwoThreeWheel(vehicleClass)) {
    return [
      { value: "SCOOTER", label: "Scooter" },
      { value: "UNDERBONE", label: "Underbone" },
      { value: "SPORT", label: "Sport" },
      { value: "NAKED", label: "Naked / street" },
      { value: "ADVENTURE", label: "Adventure / dual sport" },
      { value: "CRUISER", label: "Cruiser" },
      { value: "TRICYCLE", label: "Tricycle" },
      { value: "OTHER", label: "Other" },
    ];
  }
  return [
    { value: "SEDAN", label: "Sedan" },
    { value: "HATCHBACK", label: "Hatchback" },
    { value: "SUV", label: "SUV" },
    { value: "MPV", label: "MPV" },
    { value: "PICKUP", label: "Pickup" },
    { value: "VAN", label: "Van" },
    { value: "CROSSOVER", label: "Crossover" },
    { value: "COUPE", label: "Coupe" },
    { value: "OTHER", label: "Other" },
  ];
}
