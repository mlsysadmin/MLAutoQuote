import type { BodyKind } from "./vehicles";
import { findSpec } from "./vehicles";

/**
 * A first guess at what a nameplate runs on, so the customer confirms instead
 * of choosing.
 *
 * Fuel is the one answer on the vehicle step that the customer cannot get
 * wrong and cannot enjoy giving: every Vios is a petrol car and every Hilux is
 * a diesel, and asking is asking them to tell us something we know. So we
 * pre-select and let them change it.
 *
 * This is a default, never a fact. It is shown as a selected option in the
 * same picker as before — one tap away from being corrected — and the appraiser
 * sees the unit in person before any money changes hands. A wrong guess on a
 * rare variant costs one tap; not guessing costs every customer one choice.
 */
export type FuelKind = "GASOLINE" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG";

/**
 * Nameplates that are effectively one fuel in the Philippine market,
 * overriding the body-shape rule below. Keyed `MAKE|MODEL`, upper-cased.
 *
 * Only genuinely one-sided cases belong here. A model sold here in both petrol
 * and diesel — Montero Sport is diesel-only, but Everest and CR-V have had
 * both — is left to the body rule, or to the customer where that is no help.
 */
const BY_NAMEPLATE: Record<string, FuelKind> = {
  // Diesel-only workhorses.
  "TOYOTA|HILUX": "DIESEL",
  "TOYOTA|FORTUNER": "DIESEL",
  "TOYOTA|HIACE": "DIESEL",
  "TOYOTA|LAND CRUISER": "DIESEL",
  "TOYOTA|INNOVA": "DIESEL",
  "MITSUBISHI|MONTERO SPORT": "DIESEL",
  "MITSUBISHI|STRADA": "DIESEL",
  "MITSUBISHI|L300": "DIESEL",
  "MITSUBISHI|ADVENTURE": "DIESEL",
  "ISUZU|D-MAX": "DIESEL",
  "ISUZU|MU-X": "DIESEL",
  "ISUZU|CROSSWIND": "DIESEL",
  "ISUZU|TRAVIZ": "DIESEL",
  "FORD|RANGER": "DIESEL",
  "FORD|EVEREST": "DIESEL",
  "NISSAN|NAVARA": "DIESEL",
  "NISSAN|TERRA": "DIESEL",
  "NISSAN|URVAN": "DIESEL",
  "NISSAN|PATROL": "DIESEL",
  "CHEVROLET|COLORADO": "DIESEL",
  "CHEVROLET|TRAILBLAZER": "DIESEL",
  "MAZDA|BT-50": "DIESEL",
  "HYUNDAI|H-100": "DIESEL",
  "HYUNDAI|STAREX": "DIESEL",
  "FOTON|TRANSVAN": "DIESEL",
  "JMC|VIGUS": "DIESEL",
  "MAXUS|V80": "DIESEL",

  // Petrol nameplates whose body shape would otherwise suggest diesel.
  "TOYOTA|RUSH": "GASOLINE",
  "TOYOTA|VELOZ": "GASOLINE",
  "TOYOTA|AVANZA": "GASOLINE",
  "TOYOTA|RAIZE": "GASOLINE",
  "TOYOTA|COROLLA CROSS": "GASOLINE",
  "HONDA|BR-V": "GASOLINE",
  "HONDA|HR-V": "GASOLINE",
  "HONDA|CR-V": "GASOLINE",
  "SUZUKI|ERTIGA": "GASOLINE",
  "SUZUKI|JIMNY": "GASOLINE",
  "MITSUBISHI|XPANDER": "GASOLINE",
  "NISSAN|LIVINA": "GASOLINE",
  "GEELY|OKAVANGO": "GASOLINE",
};

/**
 * Body shapes that are overwhelmingly diesel here. Everything else — the
 * sedans, hatchbacks and small crossovers that make up most of what we buy —
 * defaults to petrol.
 */
const DIESEL_BODIES = new Set<BodyKind>(["PICKUP", "VAN"]);

/**
 * What to pre-select for this nameplate, or null when it is a genuine
 * question and the customer should answer it themselves.
 */
export function defaultFuelFor(
  make: string | null | undefined,
  model: string | null | undefined,
  vehicleClass?: string | null,
): FuelKind | null {
  if (!make || !model) return null;

  // Every motorcycle in the catalogue runs on petrol. Electric scooters are
  // arriving, so this stays a pre-selection the rider can change rather than
  // a fact — but asking the question of a Click owner is asking for nothing.
  if (vehicleClass === "TWO_THREE_WHEEL") return "GASOLINE";

  const named = BY_NAMEPLATE[`${make.toUpperCase()}|${model.toUpperCase()}`];
  if (named) return named;

  const spec = findSpec(make, model);
  if (!spec) return null;

  // A body-on-frame SUV is a coin toss here — the Fortuners and Monteros are
  // named above, and what is left is as likely to be petrol. Ask.
  if (spec.body === "SUV") return null;

  return DIESEL_BODIES.has(spec.body) ? "DIESEL" : "GASOLINE";
}
