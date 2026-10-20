import type { Submission } from "@prisma/client";
import { EXPECTED_KM_PER_YEAR } from "@/lib/vehicles";

/**
 * One line of the offer breakdown.
 *
 * `kind` tells the UI how to render it: a factor multiplies the running total,
 * a deduction subtracts a flat peso amount. Every line carries the reason, so
 * both the appraiser and the customer see why the number moved.
 */
export type BreakdownLine = {
  code: string;
  label: string;
  kind: "factor" | "deduction";
  /** Multiplier for "factor" (1.0 = neutral), peso amount for "deduction". */
  value: number;
  /** Effect on the running total in pesos, filled in by the engine. */
  effectPhp?: number;
  detail?: string;
  /** Lines the customer should not see (internal risk pricing). */
  internalOnly?: boolean;
};

export type AdjustmentInput = Pick<
  Submission,
  | "year"
  | "mileageKm"
  | "conditionGrade"
  | "hasAccidentHistory"
  | "isFloodDamaged"
  | "tireConditionPct"
  | "hasWarningLights"
  | "airconWorking"
  | "hasCR"
  | "hasOR"
  | "orExpiryDate"
  | "isEncumbered"
  | "isUnderFinancing"
  | "financingBalance"
  | "lastRegistrationYear"
  | "transmission"
>;

const CONDITION_FACTOR: Record<string, number> = {
  EXCELLENT: 1.04,
  GOOD: 1.0,
  FAIR: 0.93,
  POOR: 0.84,
};

/**
 * Builds the adjustment lines for a submission. Pure — no database, no clock
 * beyond the current year, so it is trivially testable and fast.
 */
export function buildAdjustments(s: AdjustmentInput): BreakdownLine[] {
  const lines: BreakdownLine[] = [];
  const thisYear = new Date().getFullYear();

  // ── Mileage against what the age implies ──
  if (s.mileageKm && s.year) {
    const age = Math.max(1, thisYear - s.year);
    const expected = age * EXPECTED_KM_PER_YEAR;
    const excess = s.mileageKm - expected;
    const factor = clamp(1 + (-excess / 10_000) * 0.025, 0.88, 1.08);

    if (Math.abs(factor - 1) > 0.004) {
      lines.push({
        code: "MILEAGE",
        label: excess > 0 ? "Higher than average mileage" : "Lower than average mileage",
        kind: "factor",
        value: round4(factor),
        detail: `${fmtKm(s.mileageKm)} against ${fmtKm(expected)} typical for a ${age}-year-old unit`,
      });
    }
  }

  // ── Overall condition the customer declared ──
  if (s.conditionGrade) {
    const factor = CONDITION_FACTOR[s.conditionGrade] ?? 1;
    if (factor !== 1) {
      lines.push({
        code: "CONDITION",
        label: `Declared condition: ${titleCase(s.conditionGrade)}`,
        kind: "factor",
        value: factor,
      });
    }
  }

  // ── Known history ──
  if (s.isFloodDamaged) {
    lines.push({
      code: "FLOOD",
      label: "Flood history declared",
      kind: "factor",
      value: 0.6,
      detail: "Flood-affected units carry a steep resale discount and limited buyer demand.",
    });
  } else if (s.hasAccidentHistory) {
    lines.push({
      code: "ACCIDENT",
      label: "Accident repair history declared",
      kind: "factor",
      value: 0.9,
    });
  }

  // ── Items that cost us money to put right before resale ──
  if (s.hasWarningLights) {
    lines.push({
      code: "WARNING_LIGHTS",
      label: "Dashboard warning lights on",
      kind: "deduction",
      value: 15_000,
      detail: "Allowance for diagnosis and repair.",
    });
  }

  if (s.airconWorking === false) {
    lines.push({
      code: "AIRCON",
      label: "Air-conditioning not working",
      kind: "deduction",
      value: 18_000,
    });
  }

  if (s.tireConditionPct !== null && s.tireConditionPct !== undefined) {
    if (s.tireConditionPct < 30) {
      lines.push({
        code: "TIRES",
        label: "Tires need replacement",
        kind: "deduction",
        value: 20_000,
        detail: `Around ${s.tireConditionPct}% tread remaining.`,
      });
    } else if (s.tireConditionPct < 55) {
      lines.push({
        code: "TIRES",
        label: "Tires worn",
        kind: "deduction",
        value: 8_000,
        detail: `Around ${s.tireConditionPct}% tread remaining.`,
      });
    }
  }

  // ── Papers ──
  if (!s.hasCR) {
    lines.push({
      code: "NO_CR",
      label: "Certificate of Registration not available",
      kind: "factor",
      value: 0.88,
      detail: "Transfer cannot proceed without the CR; re-issuance takes time and cost.",
    });
  }

  if (!s.hasOR) {
    lines.push({
      code: "NO_OR",
      label: "Latest Official Receipt not available",
      kind: "deduction",
      value: 6_000,
    });
  }

  if (s.lastRegistrationYear && thisYear - s.lastRegistrationYear >= 2) {
    lines.push({
      code: "LAPSED_REG",
      label: "Registration lapsed",
      kind: "deduction",
      value: 12_000,
      detail: `Last registered ${s.lastRegistrationYear}. Covers penalties and re-registration.`,
    });
  }

  if (s.isEncumbered) {
    lines.push({
      code: "ENCUMBERED",
      label: "Mortgage annotated on the CR",
      kind: "deduction",
      value: 10_000,
      detail: "Allowance for cancellation of encumbrance and release processing.",
      internalOnly: false,
    });
  }

  if (s.isUnderFinancing && s.financingBalance && s.financingBalance > 0) {
    lines.push({
      code: "FINANCING",
      label: "Outstanding financing balance",
      kind: "deduction",
      value: s.financingBalance,
      detail: "Settled directly with the financing company out of the purchase price.",
    });
  }

  // ── Reconditioning allowance: every unit needs something ──
  lines.push({
    code: "RECON",
    label: "Reconditioning allowance",
    kind: "deduction",
    value: 15_000,
    detail: "Detailing, minor repairs and roadworthiness check before resale.",
    internalOnly: true,
  });

  return lines;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function fmtKm(km: number): string {
  return `${new Intl.NumberFormat("en-PH").format(Math.round(km))} km`;
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
