/**
 * Why an appraiser went above the system's recommendation.
 *
 * The valuation engine prices from comparables and the customer's own
 * declarations. An appraiser has two things it doesn't: the photographs, and
 * the context of the deal. Going higher is often right — but it is the one
 * decision that costs money if it is wrong, so it is recorded with a reason
 * rather than left to a free-text note nobody reads.
 *
 * Recorded per offer, so the pattern across a branch can be read later: an
 * appraiser whose uplifts are nearly all "customer has a higher offer" is
 * telling you something different from one whose uplifts are "condition better
 * than declared".
 */

export const OVERRIDE_REASONS = [
  {
    value: "CONDITION_BETTER",
    label: "Condition better than declared",
    hint: "The photos show a unit in better shape than the customer's own grading.",
  },
  {
    value: "LOW_MILEAGE_VERIFIED",
    label: "Genuinely low mileage, verified",
    hint: "Odometer photo and service history agree, and it is well under typical for the age.",
  },
  {
    value: "COMPLETE_RECORDS",
    label: "Complete casa service records",
    hint: "Full dealer history, which resells faster and for more.",
  },
  {
    value: "HIGH_DEMAND_VARIANT",
    label: "High-demand variant or colour",
    hint: "This specification moves quickly in our market.",
  },
  {
    value: "RECENT_MAJOR_WORK",
    label: "Recent major work done",
    hint: "Engine, transmission, tyres or aircon recently replaced at the owner's cost.",
  },
  {
    value: "COMPARABLES_UNREPRESENTATIVE",
    label: "Comparables don't represent this unit",
    hint: "The listings we priced against are stale, far away, or in materially worse condition.",
  },
  {
    value: "COMPETING_OFFER",
    label: "Customer has a competing offer",
    hint: "They have a higher written offer elsewhere and we want the unit.",
  },
  {
    value: "REPEAT_CUSTOMER",
    label: "Repeat or fleet customer",
    hint: "Existing relationship worth protecting, or more units expected to follow.",
  },
  {
    value: "ACCESSORIES_ADD_VALUE",
    label: "Accessories add real resale value",
    hint: "Fitted extras a buyer will actually pay for, not just cosmetic.",
  },
  {
    value: "PAPERS_CLEAN",
    label: "Papers cleaner than assumed",
    hint: "No encumbrance, registration current, transfer will be straightforward.",
  },
  {
    value: "OTHER",
    label: "Other — explained in the notes",
    hint: "Anything the list doesn't cover. Say what it is in the internal notes.",
  },
] as const;

export type OverrideReasonValue = (typeof OVERRIDE_REASONS)[number]["value"];

export const OVERRIDE_REASON_VALUES = OVERRIDE_REASONS.map(
  (r) => r.value,
) as unknown as [OverrideReasonValue, ...OverrideReasonValue[]];

export function overrideReasonLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return OVERRIDE_REASONS.find((r) => r.value === value)?.label ?? value;
}

/** The notes an appraiser must write when going above are worth reading. */
export const MIN_OVERRIDE_NOTE_LENGTH = 15;

/**
 * The single rule, in one place, so the form and the API cannot disagree about
 * when a justification is required.
 */
export function requiresJustification(
  amountPhp: number,
  systemOfferPhp: number,
): boolean {
  return amountPhp > systemOfferPhp;
}
