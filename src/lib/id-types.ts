/**
 * Accepted government IDs.
 *
 * Client-safe on purpose: the wizard's picker and the staff registry both read
 * from this list, so there is one definition of what we accept.
 */

export const ID_TYPES = [
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
] as const;

export type IdTypeValue = (typeof ID_TYPES)[number];

export const ID_TYPE_LABELS: Record<IdTypeValue, string> = {
  PHILSYS: "PhilSys / National ID",
  DRIVERS_LICENSE: "Driver's licence",
  PASSPORT: "Passport",
  UMID: "UMID",
  SSS: "SSS ID",
  GSIS: "GSIS ID",
  PRC: "PRC ID",
  POSTAL: "Postal ID",
  VOTERS: "Voter's ID",
  SENIOR_CITIZEN: "Senior citizen ID",
  PWD: "PWD ID",
  TIN: "TIN ID",
  OTHER: "Other government ID",
};

/** Ordered for the picker — the ones people actually carry come first. */
export const ID_TYPE_OPTIONS = ID_TYPES.map((value) => ({
  value,
  label: ID_TYPE_LABELS[value],
}));

export function idTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ID_TYPE_LABELS[value as IdTypeValue] ?? value;
}
