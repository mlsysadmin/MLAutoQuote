import { z } from "zod";
import { ID_TYPES } from "./id-types";

/**
 * Wizard validation.
 *
 * Every step has its own schema so a partially-filled draft can be saved at any
 * point, and `submitSchema` is the gate that must pass before a valuation runs.
 * The same schemas back the client-side checks, so a customer never gets a
 * surprise error after waiting on a request.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const CURRENT_YEAR = new Date().getFullYear();

// PH plates: ABC 1234, ABC1234, 1234-AB, conduction stickers like AB1234.
const plateRegex = /^[A-Z0-9][A-Z0-9 -]{3,11}$/i;

// A VIN is 17 characters and never uses I, O or Q.
const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;

// 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX
const phoneRegex = /^(\+?63|0)9\d{9}$/;

export const vehicleStepSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .regex(plateRegex, "Enter the plate number as it appears on the CR.")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),
  vin: z
    .string()
    .trim()
    .regex(vinRegex, "A VIN / chassis number is 17 characters (no I, O or Q).")
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  make: z.string().trim().min(1, "Choose the make."),
  model: z.string().trim().min(1, "Choose the model."),
  variant: optionalText(80),
  year: z
    .number()
    .int()
    .min(1980, "We buy units from 1980 onwards.")
    .max(CURRENT_YEAR + 1),
  transmission: z.enum(["AUTOMATIC", "MANUAL", "CVT", "DCT"]),
  fuelType: z.enum(["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC", "LPG"]),
  bodyType: z
    .enum([
      "SEDAN",
      "HATCHBACK",
      "SUV",
      "MPV",
      "PICKUP",
      "VAN",
      "CROSSOVER",
      "COUPE",
      "OTHER",
    ])
    .optional()
    .nullable(),
  colour: optionalText(40),
  mileageKm: z
    .number()
    .int()
    .min(0)
    .max(1_500_000, "Please check the odometer reading."),
});

export const conditionStepSchema = z.object({
  conditionGrade: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]),
  hasAccidentHistory: z.boolean(),
  isFloodDamaged: z.boolean(),
  tireConditionPct: z.number().int().min(0).max(100).optional().nullable(),
  hasWarningLights: z.boolean(),
  airconWorking: z.boolean(),
  issuesNotes: optionalText(2000),
});

export const documentsStepSchema = z
  .object({
    hasCR: z.boolean(),
    hasOR: z.boolean(),
    orExpiryDate: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? new Date(v) : null)),
    hasDeedOfSale: z.boolean(),
    hasInsurance: z.boolean(),
    isEncumbered: z.boolean(),
    isUnderFinancing: z.boolean(),
    financingBalance: z.number().int().min(0).max(20_000_000).optional().nullable(),
    lastRegistrationYear: z
      .number()
      .int()
      .min(1980)
      .max(CURRENT_YEAR)
      .optional()
      .nullable(),
  })
  .refine(
    (d) => !d.isUnderFinancing || (d.financingBalance ?? 0) > 0,
    {
      message: "Enter the remaining balance so we can settle it for you.",
      path: ["financingBalance"],
    },
  );

export const contactStepSchema = z.object({
  customerName: z.string().trim().min(2, "Enter your full name.").max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter a Philippine mobile number, e.g. 0917 123 4567."),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),

  // ── Identity, for the customer record ──
  birthDate: z
    .string()
    .min(1, "Enter your date of birth.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid date.")
    .refine(
      (v) => new Date(v) <= eighteenYearsAgo(),
      "You must be at least 18 to sell a vehicle.",
    )
    .refine(
      (v) => new Date(v) >= new Date("1915-01-01"),
      "Please check the date of birth.",
    ),
  idType: z.enum(ID_TYPES, { message: "Choose which ID you're presenting." }),
  idNumber: z
    .string()
    .trim()
    .min(3, "Enter the number printed on your ID.")
    .max(64),

  addressLine: optionalText(160),
  barangay: optionalText(80),
  city: optionalText(80),
  province: optionalText(80),
  preferredBranch: optionalText(120),
  consentGiven: z.literal(true, {
    message: "Please confirm you agree before submitting.",
  }),
});

function eighteenYearsAgo(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

/** Partial save — any subset of any step, for autosave between steps. */
export const draftPatchSchema = z
  .object({
    lastStep: z.number().int().min(1).max(7).optional(),
  })
  .passthrough();

/** Everything that must hold before an offer can be generated. */
export const submitSchema = z.object({
  vehicle: vehicleStepSchema,
  condition: conditionStepSchema,
  documents: documentsStepSchema,
  contact: contactStepSchema,
});

export const photoConfirmSchema = z.object({
  slot: z.enum([
    "FRONT_34",
    "REAR_34",
    "LEFT_SIDE",
    "RIGHT_SIDE",
    "INTERIOR_FRONT",
    "INTERIOR_REAR",
    "DASH_ODOMETER",
    "ENGINE_BAY",
    "TIRES",
    "DAMAGE",
    "DOC_CR",
    "DOC_OR",
    "DOC_ID",
    "OTHER",
  ]),
  storageKey: z.string().min(1).max(512),
  contentType: z.string().min(1).max(100),
  bytes: z.number().int().min(1).max(20 * 1024 * 1024),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter your work email."),
  password: z.string().min(1, "Enter your password."),
});

export const offerAdjustSchema = z.object({
  appraiserOfferPhp: z
    .number()
    .int()
    .min(0)
    .max(50_000_000)
    .optional()
    .nullable(),
  appraiserNotes: optionalText(4000),
  customerMessage: optionalText(2000),
});

export const comparableInputSchema = z.object({
  url: z.string().trim().url("Paste the full listing link."),
  pricePhp: z.number().int().min(1_000).max(50_000_000),
  title: z.string().trim().min(3).max(400),
  year: z.number().int().min(1980).max(CURRENT_YEAR + 1).optional().nullable(),
  mileageKm: z.number().int().min(0).max(1_500_000).optional().nullable(),
  location: optionalText(120),
});

export const customerResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  reason: optionalText(500),
});

/** Flattens a ZodError into { field: message } for the form components. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

export type VehicleStep = z.infer<typeof vehicleStepSchema>;
export type ConditionStep = z.infer<typeof conditionStepSchema>;
export type DocumentsStep = z.infer<typeof documentsStepSchema>;
export type ContactStep = z.infer<typeof contactStepSchema>;
