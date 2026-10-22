/**
 * Translates the wizard's loose client draft into Prisma field values.
 *
 * Only known keys get through — a client can't set `status` or `publicToken` by
 * adding them to the JSON body. Empty strings become null so partial drafts
 * don't fill the table with "".
 */

const TEXT_FIELDS = [
  "plateNumber",
  "vin",
  "make",
  "model",
  "variant",
  "colour",
  "issuesNotes",
  "customerName",
  "customerPhone",
  "customerEmail",
  "idNumber",
  "addressLine",
  "barangay",
  "city",
  "province",
  "preferredBranch",
] as const;

const INT_FIELDS = [
  "askingPricePhp",
  "year",
  "mileageKm",
  "tireConditionPct",
  "financingBalance",
  "lastRegistrationYear",
] as const;

const BOOL_FIELDS = [
  "hasAccidentHistory",
  "isFloodDamaged",
  "hasWarningLights",
  "airconWorking",
  "hasCR",
  "hasOR",
  "hasDeedOfSale",
  "hasInsurance",
  "isEncumbered",
  "isUnderFinancing",
  "consentGiven",
] as const;

const ENUM_FIELDS = {
  vehicleClass: ["FOUR_WHEEL", "TWO_THREE_WHEEL"],
  transmission: ["AUTOMATIC", "MANUAL", "CVT", "DCT"],
  fuelType: ["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "LPG"],
  bodyType: [
    "SEDAN",
    "HATCHBACK",
    "SUV",
    "MPV",
    "PICKUP",
    "VAN",
    "CROSSOVER",
    "COUPE",
    "SCOOTER",
    "UNDERBONE",
    "SPORT",
    "NAKED",
    "ADVENTURE",
    "CRUISER",
    "TRICYCLE",
    "OTHER",
  ],
  conditionGrade: ["EXCELLENT", "GOOD", "FAIR", "POOR"],
  idType: [
    "PHILSYS",
    "DRIVERS_LICENSE",
    "PASSPORT",
    "UMID",
    "SSS",
    "GSIS",
    "PRC",
    "POSTAL",
    "VOTERS",
    "SENIOR_CITIZEN",
    "PWD",
    "TIN",
    "OTHER",
  ],
} as const;

/**
 * A bag of validated column values. It is deliberately not a Prisma input type:
 * the same result feeds both `create` and `update`, whose generated types
 * differ, so each call site narrows it.
 */
export type SubmissionFields = Record<string, unknown>;

export function toSubmissionData(
  body: Record<string, unknown>,
): SubmissionFields {
  const data: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === null) {
      data[field] = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim().slice(0, 2000);
      data[field] = trimmed === "" ? null : trimmed;
    }
  }

  for (const field of INT_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === null || raw === "") {
      data[field] = null;
    } else {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) data[field] = Math.round(n);
    }
  }

  for (const field of BOOL_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (typeof raw === "boolean") data[field] = raw;
    // null means "not answered yet" — leave the column at its default.
  }

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (raw === null || raw === "") {
      data[field] = null;
    } else if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) {
      data[field] = raw;
    }
  }

  for (const field of ["orExpiryDate", "birthDate"] as const) {
    if (!(field in body)) continue;
    const raw = body[field];
    if (!raw) {
      data[field] = null;
    } else {
      const parsed = new Date(String(raw));
      data[field] = Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  if ("lastStep" in body) {
    const n = Number(body.lastStep);
    if (Number.isFinite(n)) data.lastStep = Math.min(Math.max(1, n), 7);
  }

  return data;
}

/** Fields the submission must have before an offer can be generated. */
export function missingForSubmit(s: {
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  transmission: unknown;
  fuelType: unknown;
  conditionGrade: unknown;
  customerName: string | null;
  customerPhone: string | null;
  birthDate: Date | null;
  idType: unknown;
  idNumber: string | null;
  consentGiven: boolean;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (!s.make) out.make = "Choose the make.";
  if (!s.model) out.model = "Choose the model.";
  if (!s.year) out.year = "Choose the model year.";
  if (s.mileageKm === null) out.mileageKm = "Enter the odometer reading.";
  if (!s.transmission) out.transmission = "Choose the transmission.";
  if (!s.fuelType) out.fuelType = "Choose the fuel type.";
  if (!s.conditionGrade) out.conditionGrade = "Choose the overall condition.";
  if (!s.customerName) out.customerName = "Enter your full name.";
  if (!s.customerPhone) out.customerPhone = "Enter your mobile number.";
  if (!s.birthDate) out.birthDate = "Enter your date of birth.";
  if (!s.idType) out.idType = "Choose which ID you're presenting.";
  if (!s.idNumber) out.idNumber = "Enter the number printed on your ID.";
  if (!s.consentGiven) out.consentGiven = "Please confirm before submitting.";
  return out;
}
