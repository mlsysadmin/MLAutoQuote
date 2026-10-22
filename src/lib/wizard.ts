/** Shared shape for the customer wizard — used by the client steps and the API. */

export type Draft = {
  /** Which half of the business: four wheels, or two and three. */
  vehicleClass: "FOUR_WHEEL" | "TWO_THREE_WHEEL";
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
  /** What the seller hopes to get. Optional — many have no figure in mind. */
  askingPricePhp: number | null;
  consentGiven: boolean;
};

export const EMPTY_DRAFT: Draft = {
  vehicleClass: "FOUR_WHEEL",
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
  askingPricePhp: null,
  consentGiven: false,
};

/**
 * Three steps, not seven.
 *
 * Each transition is a moment someone can decide they have better things to
 * do, so related questions are grouped rather than spread thin — one scroll
 * beats three taps on a phone.
 *
 * The vehicle and its condition used to be two steps. Merging them only paid
 * off once the page got shorter: fuel is pre-selected from the nameplate, and
 * the CR and OR questions moved to the photo slots that answer them. Eleven
 * required answers became nine, across one step instead of two.
 */
export const STEP_LABELS = ["Your car", "Photos", "You"];

export const TOTAL_STEPS = STEP_LABELS.length;

/** Roughly how long each step takes, shown so the end is always in sight. */
export const STEP_MINUTES = [2, 2, 1];

/**
 * Photo slots, in the order the customer is asked for them.
 *
 * Only five are required. Nine was enough to lose people at the photo step,
 * and the offer is provisional pending a branch inspection anyway — the rest
 * are marked `recommended`, which the UI frames as "gets you a firmer offer"
 * rather than as another hurdle.
 */
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
    slot: "DASH_ODOMETER",
    label: "Odometer",
    hint: "Engine on so the mileage reads clearly.",
    required: true,
  },
  {
    slot: "LEFT_SIDE",
    label: "Left side",
    hint: "Whole car in frame, taken straight on.",
    required: false,
    recommended: true,
  },
  {
    slot: "RIGHT_SIDE",
    label: "Right side",
    hint: "Whole car in frame, taken straight on.",
    required: false,
    recommended: true,
  },
  {
    slot: "INTERIOR_FRONT",
    label: "Front interior",
    hint: "From the rear seat, showing both front seats and the dashboard.",
    required: false,
    recommended: true,
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
    recommended: true,
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
    required: false,
    recommended: true,
    isDocument: true,
  },
  {
    slot: "DOC_ID",
    label: "Your government ID",
    hint: "Any current government ID. The name and number need to be readable.",
    required: true,
    isDocument: true,
  },
] as const;

/**
 * Which slots apply to two and three wheels, and what to call them there.
 *
 * A scooter has no engine bay to open, no back seat and no cabin, so asking
 * for those photographs is asking the customer to fail. The ones that do
 * carry over are renamed: "both tyres" rather than "tires", because a
 * motorcycle has exactly two and both matter.
 */
const BIKE_SLOTS: Record<string, { label?: string; hint?: string } | null> = {
  FRONT_34: { hint: "Stand at the front-left so you see the front and one side." },
  REAR_34: { hint: "Same idea from the opposite corner." },
  DASH_ODOMETER: { label: "Odometer", hint: "Ignition on so the reading is clear." },
  LEFT_SIDE: { hint: "Whole bike in frame, taken straight on." },
  RIGHT_SIDE: { hint: "Whole bike in frame, taken straight on." },
  INTERIOR_FRONT: null, // no cabin
  INTERIOR_REAR: null, // no back seat
  ENGINE_BAY: { label: "Engine", hint: "The engine and exhaust from the side." },
  TIRES: { label: "Both tyres", hint: "Close enough to see the tread on each." },
  DAMAGE: { hint: "Scratches, dents, cracked plastics — being upfront speeds up your offer." },
  // The paperwork is the same on two wheels: an LTO registration, a receipt
  // and the seller's ID. Absent from this map means "ask for it unchanged".
};

/**
 * The slots to ask for, for this class of vehicle.
 *
 * Returns the car list untouched for anything on four wheels, so nothing
 * about the existing flow changes.
 */
export function photoSlotsFor(
  vehicleClass: string | null | undefined,
): PhotoSlotSpec[] {
  if (vehicleClass !== "TWO_THREE_WHEEL") return [...PHOTO_SLOTS];

  return PHOTO_SLOTS.filter((spec) => BIKE_SLOTS[spec.slot] !== null).map(
    (spec) => {
      const override = BIKE_SLOTS[spec.slot];
      return override ? { ...spec, ...override } : spec;
    },
  ) as PhotoSlotSpec[];
}

/** The required slots for a class — what blocks the Continue button. */
export function requiredSlotsFor(
  vehicleClass: string | null | undefined,
): string[] {
  return photoSlotsFor(vehicleClass)
    .filter((s) => s.required)
    .map((s) => s.slot);
}

/** Slots we ask for but don't block on — framed as "firms up your offer". */
export const RECOMMENDED_SLOTS = PHOTO_SLOTS.filter(
  (s) => "recommended" in s && s.recommended,
).map((s) => s.slot);

export type PhotoSlotSpec = (typeof PHOTO_SLOTS)[number];

export const REQUIRED_SLOTS = PHOTO_SLOTS.filter((s) => s.required).map(
  (s) => s.slot,
);

/**
 * Slots that hold exactly one photo — every slot except the damage gallery.
 *
 * The server enforces this, not just the form. A customer who comes back the
 * next day, or opens the link on a second phone, starts with an empty
 * thumbnail grid and photographs the front of the car again; without this the
 * appraiser opens a submission with three fronts and four IDs and has to work
 * out which is current.
 */
export function slotHoldsOnePhoto(slot: string): boolean {
  const spec = PHOTO_SLOTS.find((s) => s.slot === slot);
  if (!spec) return false;
  return !("multiple" in spec && spec.multiple);
}

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

/** Which steps are complete, used by the stepper and the submit guard. */
export function stepCompletion(draft: Draft, photoSlots: Set<string>) {
  return {
    // The car and its condition, now one step. CR and OR are not here: they
    // are answered by uploading them on the photo step.
    1: Boolean(
      draft.make &&
        draft.model &&
        draft.year &&
        draft.transmission &&
        draft.fuelType &&
        draft.mileageKm !== null &&
        draft.conditionGrade &&
        draft.hasAccidentHistory !== null &&
        draft.isFloodDamaged !== null,
    ),
    2: requiredSlotsFor(draft.vehicleClass).every((s) => photoSlots.has(s)),
    3: Boolean(
      draft.customerName &&
        draft.customerPhone &&
        draft.birthDate &&
        draft.idType &&
        draft.idNumber &&
        draft.consentGiven,
    ),
  } as Record<number, boolean>;
}

/**
 * What must be answered before a step will let the customer move on.
 *
 * This lives here rather than inside the wizard component because it is the
 * one part of the form with no visible symptom when it goes wrong. A rule
 * that names a field no longer on the page can't render an error beside it,
 * so Continue simply stops working and the customer is left pressing a dead
 * button — which is exactly what happened when the car and condition steps
 * were merged and these numbers were left behind.
 *
 * Out here it is a pure function with tests, and the step numbers are checked
 * against STEP_LABELS rather than remembered.
 */
export function validateStep(
  step: number,
  draft: Draft,
): Record<string, string> {
  const e: Record<string, string> = {};

  // 1 — the vehicle and its condition, on one page.
  if (step === 1) {
    if (!draft.make) e.make = "Choose the make.";
    if (!draft.model) e.model = "Choose the model.";
    if (!draft.year) e.year = "Choose the year.";
    if (!draft.transmission) e.transmission = "Choose the transmission.";
    if (!draft.fuelType) e.fuelType = "Choose the fuel type.";
    if (draft.mileageKm === null || draft.mileageKm < 0) {
      e.mileageKm = "Enter the odometer reading.";
    }
    if (!draft.conditionGrade) e.conditionGrade = "Pick the closest match.";
    if (draft.hasAccidentHistory === null) {
      e.hasAccidentHistory = "Please answer this.";
    }
    if (draft.isFloodDamaged === null) e.isFloodDamaged = "Please answer this.";
    if (draft.isUnderFinancing && !draft.financingBalance) {
      e.financingBalance = "Enter the remaining balance.";
    }
  }

  // 2 — photos. Nothing here blocks: the papers are answered by uploading
  // them, a customer standing in a car park may not have the CR to hand, and
  // the summary on the last step nudges about anything still missing. An
  // offer made without them is simply a more provisional one.

  // 3 — who you are.
  if (step === 3) {
    if (!draft.customerName.trim()) e.customerName = "Enter your full name.";
    if (!/^(\+?63|0)9\d{9}$/.test(draft.customerPhone.replace(/[\s-]/g, ""))) {
      e.customerPhone = "Enter a mobile number like 0917 123 4567.";
    }
    if (!draft.birthDate) {
      e.birthDate = "Enter your date of birth.";
    } else {
      const eighteen = new Date();
      eighteen.setFullYear(eighteen.getFullYear() - 18);
      if (new Date(draft.birthDate) > eighteen) {
        e.birthDate = "You must be at least 18 to sell a vehicle.";
      }
    }
    if (!draft.idType) e.idType = "Choose which ID you're presenting.";
    if (draft.idNumber.trim().length < 3) {
      e.idNumber = "Enter the number printed on your ID.";
    }
    if (!draft.consentGiven) {
      e.consentGiven = "Please confirm before continuing.";
    }
  }

  return e;
}
