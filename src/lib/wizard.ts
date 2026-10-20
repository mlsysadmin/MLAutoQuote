/** Shared shape for the customer wizard — used by the client steps and the API. */

export type Draft = {
  // Step 1–2: the vehicle
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  variant: string;
  year: number | null;
  transmission: string;
  fuelType: string;
  bodyType: string;
  colour: string;
  mileageKm: number | null;

  // Step 3: condition
  conditionGrade: string;
  hasAccidentHistory: boolean | null;
  isFloodDamaged: boolean | null;
  tireConditionPct: number | null;
  hasWarningLights: boolean | null;
  airconWorking: boolean | null;
  issuesNotes: string;

  // Step 4: papers
  hasCR: boolean | null;
  hasOR: boolean | null;
  orExpiryDate: string;
  hasDeedOfSale: boolean | null;
  hasInsurance: boolean | null;
  isEncumbered: boolean | null;
  isUnderFinancing: boolean | null;
  financingBalance: number | null;
  lastRegistrationYear: number | null;

  // Step 6: contact and identity (the customer's registry record)
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  birthDate: string;
  idType: string;
  idNumber: string;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  preferredBranch: string;
  consentGiven: boolean;
};

export const EMPTY_DRAFT: Draft = {
  plateNumber: "",
  vin: "",
  make: "",
  model: "",
  variant: "",
  year: null,
  transmission: "",
  fuelType: "",
  bodyType: "",
  colour: "",
  mileageKm: null,

  conditionGrade: "",
  hasAccidentHistory: null,
  isFloodDamaged: null,
  tireConditionPct: null,
  hasWarningLights: null,
  airconWorking: null,
  issuesNotes: "",

  hasCR: null,
  hasOR: null,
  orExpiryDate: "",
  hasDeedOfSale: null,
  hasInsurance: null,
  isEncumbered: null,
  isUnderFinancing: null,
  financingBalance: null,
  lastRegistrationYear: null,

  customerName: "",
  customerPhone: "",
  customerEmail: "",
  birthDate: "",
  idType: "",
  idNumber: "",
  addressLine: "",
  barangay: "",
  city: "",
  province: "",
  preferredBranch: "",
  consentGiven: false,
};

export const STEP_LABELS = [
  "Your car",
  "Details",
  "Condition",
  "Papers",
  "Photos",
  "Contact",
  "Review",
];

export const TOTAL_STEPS = STEP_LABELS.length;

/** Photo slots, in the order the customer is asked for them. */
export const PHOTO_SLOTS = [
  {
    slot: "FRONT_34",
    label: "Front, at an angle",
    hint: "Stand at the front-left corner so you see the front and one side.",
    required: true,
  },
  {
    slot: "REAR_34",
    label: "Rear, at an angle",
    hint: "Same idea from the opposite corner.",
    required: true,
  },
  {
    slot: "LEFT_SIDE",
    label: "Left side",
    hint: "Whole car in frame, taken straight on.",
    required: true,
  },
  {
    slot: "RIGHT_SIDE",
    label: "Right side",
    hint: "Whole car in frame, taken straight on.",
    required: true,
  },
  {
    slot: "DASH_ODOMETER",
    label: "Odometer",
    hint: "Engine on so the mileage reads clearly.",
    required: true,
  },
  {
    slot: "INTERIOR_FRONT",
    label: "Front interior",
    hint: "From the rear seat, showing both front seats and the dashboard.",
    required: true,
  },
  {
    slot: "INTERIOR_REAR",
    label: "Rear interior",
    hint: "From the front, showing the back seats.",
    required: false,
  },
  {
    slot: "ENGINE_BAY",
    label: "Engine bay",
    hint: "Hood open, engine cold.",
    required: false,
  },
  {
    slot: "TIRES",
    label: "Tires",
    hint: "Close enough to see the tread.",
    required: false,
  },
  {
    slot: "DAMAGE",
    label: "Any damage",
    hint: "Dents, scratches, cracks — being upfront speeds up your offer.",
    required: false,
    multiple: true,
  },
  {
    slot: "DOC_CR",
    label: "Certificate of Registration",
    hint: "Flat, all four corners visible, no glare.",
    required: true,
    isDocument: true,
  },
  {
    slot: "DOC_OR",
    label: "Official Receipt",
    hint: "Your most recent one.",
    required: true,
    isDocument: true,
  },
  {
    slot: "DOC_ID",
    label: "Your government ID",
    hint: "The one you entered on the next step. Make sure the name and number are readable.",
    required: true,
    isDocument: true,
  },
] as const;

export type PhotoSlotSpec = (typeof PHOTO_SLOTS)[number];

export const REQUIRED_SLOTS = PHOTO_SLOTS.filter((s) => s.required).map(
  (s) => s.slot,
);

export const TRANSMISSIONS = [
  { value: "AUTOMATIC", label: "Automatic" },
  { value: "MANUAL", label: "Manual" },
  { value: "CVT", label: "CVT" },
  { value: "DCT", label: "Dual clutch" },
];

export const FUEL_TYPES = [
  { value: "GASOLINE", label: "Gasoline" },
  { value: "DIESEL", label: "Diesel" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ELECTRIC", label: "Electric" },
  { value: "LPG", label: "LPG" },
];

export const CONDITION_GRADES = [
  {
    value: "EXCELLENT",
    label: "Excellent",
    description: "Looks and drives like new. No known issues.",
  },
  {
    value: "GOOD",
    label: "Good",
    description: "Normal wear for its age. Everything works.",
  },
  {
    value: "FAIR",
    label: "Fair",
    description: "Visible wear, or a few things need attention.",
  },
  {
    value: "POOR",
    label: "Poor",
    description: "Needs real work before it can be resold.",
  },
];

/** Which steps are complete, used for the stepper and the review page. */
export function stepCompletion(draft: Draft, photoSlots: Set<string>) {
  return {
    1: Boolean(draft.make && draft.model && draft.year),
    2: Boolean(draft.transmission && draft.fuelType && draft.mileageKm !== null),
    3: Boolean(
      draft.conditionGrade &&
        draft.hasAccidentHistory !== null &&
        draft.isFloodDamaged !== null,
    ),
    4: draft.hasCR !== null && draft.hasOR !== null,
    5: REQUIRED_SLOTS.every((s) => photoSlots.has(s)),
    6: Boolean(
      draft.customerName &&
        draft.customerPhone &&
        draft.birthDate &&
        draft.idType &&
        draft.idNumber &&
        draft.consentGiven,
    ),
    7: true,
  } as Record<number, boolean>;
}
