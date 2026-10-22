import type { IdTypeValue } from "@/lib/id-types";
import type { ExtractedIdentity } from "./types";

/**
 * Pulling identity fields out of the raw text of a Philippine government ID.
 *
 * Philippine IDs are not one format but a dozen, and most label their fields in
 * both Filipino and English ("Apelyido / Last Name"). So the strategy is:
 * recognise the card from its distinctive wording, read labelled fields where
 * the card labels them, and fall back to shape-matching the ID number only when
 * it can't be read from a label.
 *
 * This is deliberately conservative. A field we are unsure of is left empty for
 * the customer to type, which costs them a moment; a field we get confidently
 * wrong could put the wrong name on a sale document.
 */

/** Distinctive wording per card, matched against the whole text, upper-cased. */
const CARD_SIGNATURES: Array<{ type: IdTypeValue; patterns: RegExp[] }> = [
  { type: "PHILSYS", patterns: [/PHILIPPINE IDENTIFICATION/, /PHILSYS/, /PAMBANSANG PAGKAKAKILANLAN/] },
  { type: "DRIVERS_LICENSE", patterns: [/DRIVER'?S LICENSE/, /LAND TRANSPORTATION OFFICE/, /\bLTO\b/] },
  { type: "PASSPORT", patterns: [/PASAPORTE/, /\bPASSPORT\b/, /REPUBLIKA NG PILIPINAS.*PASSPORT/] },
  { type: "UMID", patterns: [/UNIFIED MULTI-?PURPOSE/, /\bUMID\b/, /\bCRN\b/] },
  { type: "SSS", patterns: [/SOCIAL SECURITY SYSTEM/, /\bSSS\b/] },
  { type: "GSIS", patterns: [/GOVERNMENT SERVICE INSURANCE/, /\bGSIS\b/] },
  { type: "PRC", patterns: [/PROFESSIONAL REGULATION/, /\bPRC\b/] },
  { type: "POSTAL", patterns: [/POSTAL ID/, /PHLPOST/, /PHILIPPINE POSTAL/] },
  { type: "VOTERS", patterns: [/COMMISSION ON ELECTIONS/, /VOTER'?S ID/, /\bCOMELEC\b/] },
  { type: "SENIOR_CITIZEN", patterns: [/SENIOR CITIZEN/, /\bOSCA\b/] },
  { type: "PWD", patterns: [/PERSONS? WITH DISABILIT/, /\bPWD\b/] },
  { type: "TIN", patterns: [/BUREAU OF INTERNAL REVENUE/, /TAXPAYER IDENTIFICATION/, /\bTIN\b/] },
];

/** Shapes of the number itself, used when no label gives it away. */
const NUMBER_SHAPES: Array<{ type: IdTypeValue; pattern: RegExp }> = [
  // PhilSys PCN: 16 digits, usually printed in groups of four.
  { type: "PHILSYS", pattern: /\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}\b/ },
  // Driver's licence: one letter, then 2-2-6.
  { type: "DRIVERS_LICENSE", pattern: /\b[A-Z]\d{2}[-\s]\d{2}[-\s]\d{6}\b/ },
  // UMID CRN: 4-7-1.
  { type: "UMID", pattern: /\b\d{4}[-\s]\d{7}[-\s]\d\b/ },
  // SSS: 2-7-1.
  { type: "SSS", pattern: /\b\d{2}[-\s]\d{7}[-\s]\d\b/ },
  // TIN: 3-3-3, sometimes with a branch code.
  { type: "TIN", pattern: /\b\d{3}[-\s]\d{3}[-\s]\d{3}(?:[-\s]\d{3,5})?\b/ },
  // Passport: one or two letters then seven digits.
  { type: "PASSPORT", pattern: /\b[A-Z]{1,2}\d{7}[A-Z]?\b/ },
];

/** Labels that introduce a value, in both languages, longest first. */
const NAME_LABELS = [
  "APELYIDO/LAST NAME",
  "MGA PANGALAN/GIVEN NAMES",
  "GITNANG APELYIDO/MIDDLE NAME",
  "LAST NAME",
  "GIVEN NAMES",
  "GIVEN NAME",
  "MIDDLE NAME",
  "APELYIDO",
  "PANGALAN",
  "NAME",
];

const DOB_LABELS = [
  "PETSA NG KAPANGANAKAN/DATE OF BIRTH",
  "DATE OF BIRTH",
  "BIRTH DATE",
  "BIRTHDATE",
  "PETSA NG KAPANGANAKAN",
  "DOB",
];

const NUMBER_LABELS = [
  "IDENTIFICATION NUMBER",
  "COMMON REFERENCE NUMBER",
  "LICENSE NO",
  "LICENCE NO",
  "PASSPORT NO",
  "CRN",
  "PCN",
  "SSS NO",
  "TIN",
  "ID NO",
  "ID NUMBER",
  "NO.",
];

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

/** Lines that are chrome, not data — they must never be read as a name. */
const NOISE =
  /REPUBLIC|REPUBLIKA|PILIPINAS|PHILIPPINES|GOVERNMENT|DEPARTMENT|AUTHORITY|SIGNATURE|VALID|EXPIR|ISSUE|ADDRESS|TIRAHAN|SEX|KASARIAN|BLOOD|NATIONALITY|CITIZENSHIP|PLACE OF BIRTH|AGENCY|SYSTEM|OFFICE|BUREAU|COMMISSION|IDENTIFICATION CARD/;

/**
 * Words that only ever appear in a field's *label*, never in its value.
 *
 * Cards routinely print several labels on one line and their values on the
 * next — "Last Name, First Name, Middle Name" above "DELA CRUZ, JUAN SANTOS",
 * "License No.  Expiration Date" above the two numbers. Without this, whatever
 * follows a label on that line is read as the label's value, and the customer
 * is shown "First Name" as their name.
 */
const LABEL_WORDS =
  /\b(LAST NAME|FIRST NAME|MIDDLE NAME|GIVEN NAMES?|FULL NAME|NAME|APELYIDO|PANGALAN|KAPANGANAKAN|DATE OF BIRTH|BIRTH ?DATE|DOB|EXPIRATION|EXPIRY|LICENSE|LICENCE|PASSPORT|NUMBER|NO\.|NATIONALITY|SEX|WEIGHT|HEIGHT|CONDITIONS|RESTRICTIONS|AGENCY CODE)\b/;

/** True when a fragment is made of labels rather than somebody's details. */
function isLabelOnly(value: string): boolean {
  if (!LABEL_WORDS.test(value)) return false;
  const rest = value
    .replace(new RegExp(LABEL_WORDS.source, "g"), "")
    .replace(/[^A-Z0-9]/g, "");
  return rest.length < 3;
}

export function parsePhilippineId(rawText: string): ExtractedIdentity {
  const text = rawText.toUpperCase();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const idType = detectType(text);
  const birthDate = findBirthDate(lines, text);
  const idNumber = findIdNumber(lines, text, idType);
  const fullName = findName(lines);

  const filled: ExtractedIdentity["filled"] = [];
  if (fullName) filled.push("fullName");
  if (birthDate) filled.push("birthDate");
  if (idType) filled.push("idType");
  if (idNumber) filled.push("idNumber");

  return {
    fullName,
    birthDate,
    idType,
    idNumber,
    // Four fields found is a clean read; one is a hint at best.
    confidence: Math.min(1, filled.length / 4),
    filled,
    provider: "parser",
  };
}

// ── Card type ────────────────────────────────────────────────────────────────

export function detectType(text: string): IdTypeValue | null {
  for (const { type, patterns } of CARD_SIGNATURES) {
    if (patterns.some((p) => p.test(text))) return type;
  }
  for (const { type, pattern } of NUMBER_SHAPES) {
    if (pattern.test(text)) return type;
  }
  return null;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/**
 * Cards print dates every which way: 03/14/1985, 14 MARCH 1985, MARCH 14, 1985.
 * Returns ISO yyyy-mm-dd, or null when the result wouldn't be a plausible
 * birth date for someone selling a car.
 */
export function findBirthDate(lines: string[], text: string): string | null {
  const labelled = valueForLabel(lines, DOB_LABELS);
  const candidates = [labelled, text].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const iso = parseDate(candidate);
    if (iso) return iso;
  }
  return null;
}

function parseDate(value: string): string | null {
  // MONTH DD, YYYY  /  DD MONTH YYYY
  const monthName =
    value.match(/\b([A-Z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/) ??
    value.match(/\b(\d{1,2})\s+([A-Z]{3,9})\.?,?\s+(\d{4})\b/);

  if (monthName) {
    const a = monthName[1];
    const b = monthName[2];
    const year = Number(monthName[3]);
    const monthKey = (/^\d+$/.test(a) ? b : a).slice(0, 3);
    const day = Number(/^\d+$/.test(a) ? a : b);
    const month = MONTHS[monthKey];
    if (month) return validate(year, month, day);
  }

  // Numeric: mm/dd/yyyy is the Philippine convention; dd/mm/yyyy is accepted
  // only when the first number can't be a month.
  const numeric = value.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    const [month, day] = first > 12 ? [second, first] : [first, second];
    return validate(year, month, day);
  }

  // yyyy-mm-dd
  const iso = value.match(/\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/);
  if (iso) return validate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  return null;
}

function validate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const thisYear = new Date().getFullYear();
  // Someone selling a car is an adult, and nobody is 120.
  if (year > thisYear - 16 || year < thisYear - 120) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── ID number ────────────────────────────────────────────────────────────────

export function findIdNumber(
  lines: string[],
  text: string,
  idType: IdTypeValue | null,
): string | null {
  const labelled = valueForLabel(lines, NUMBER_LABELS);
  if (labelled) {
    const cleaned = cleanNumber(labelled);
    if (cleaned) return cleaned;
  }

  // Prefer the shape that matches the card we think we're looking at.
  const ordered = idType
    ? [
        ...NUMBER_SHAPES.filter((s) => s.type === idType),
        ...NUMBER_SHAPES.filter((s) => s.type !== idType),
      ]
    : NUMBER_SHAPES;

  for (const { pattern } of ordered) {
    const match = text.match(pattern);
    if (match) return match[0].replace(/\s+/g, "-");
  }
  return null;
}

function cleanNumber(value: string): string | null {
  const cleaned = value.replace(/[^A-Z0-9-]/g, "").replace(/^-+|-+$/g, "");
  // Too short to be any real ID number; probably a stray label fragment. And a
  // run of letters with no digit in it is a label rather than a number —
  // "Expiration Date" otherwise reads as a perfectly good 14 characters.
  if (cleaned.length < 6 || !/[0-9]/.test(cleaned)) return null;
  return cleaned;
}

// ── Name ─────────────────────────────────────────────────────────────────────

/**
 * Builds a name from the labelled parts where the card has them, falling back
 * to the longest plausible all-caps line.
 */
export function findName(lines: string[]): string | null {
  const last = valueForLabel(lines, ["APELYIDO/LAST NAME", "LAST NAME", "APELYIDO"]);
  const given = valueForLabel(lines, [
    "MGA PANGALAN/GIVEN NAMES",
    "GIVEN NAMES",
    "GIVEN NAME",
    "PANGALAN",
  ]);
  const middle = valueForLabel(lines, [
    "GITNANG APELYIDO/MIDDLE NAME",
    "MIDDLE NAME",
  ]);

  if (last && given) {
    return titleCase([given, middle, last].filter(Boolean).join(" "));
  }

  const single = valueForLabel(lines, NAME_LABELS);
  if (single && looksLikeName(single)) return titleCase(normaliseOrder(single));

  // Last resort: the longest line that reads like a person's name.
  const candidate = lines
    .filter((l) => looksLikeName(l))
    .sort((a, b) => b.length - a.length)[0];

  return candidate ? titleCase(normaliseOrder(candidate)) : null;
}

function looksLikeName(line: string): boolean {
  if (NOISE.test(line)) return false;
  if (LABEL_WORDS.test(line)) return false;
  if (/\d/.test(line)) return false;
  const letters = line.replace(/[^A-Z]/g, "").length;
  if (letters < 5 || line.length > 48) return false;
  const words = line.split(/[\s,]+/).filter(Boolean);
  return words.length >= 2 && words.length <= 6;
}

/** "DELA CRUZ, JUAN SANTOS" reads back as "Juan Santos Dela Cruz". */
function normaliseOrder(value: string): string {
  const [surname, rest] = value.split(",").map((s) => s.trim());
  return rest ? `${rest} ${surname}` : value;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    // Dutch and Spanish particles stay lowercase. The Filipino ones do not:
    // CRs, ORs and IDs all print "Dela Cruz" and "Delos Santos", and the name
    // on the deed has to match the name on the card.
    .replace(/\b(Van|Von|Y)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ── Shared ───────────────────────────────────────────────────────────────────

/**
 * Finds the value for a label, whether the card prints it on the same line
 * ("Last Name: DELA CRUZ") or on the line beneath, which most PH cards do.
 */
function valueForLabel(lines: string[], labels: string[]): string | null {
  for (const label of labels) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.includes(label)) continue;

      const after = line
        .slice(line.indexOf(label) + label.length)
        .replace(/^[:\s.,/|-]+/, "");
      // A remainder that is itself a label means this is a label row and the
      // value sits on the line below it.
      if (after.length > 1 && !isLabelOnly(after)) return after.trim();

      const next = lines[i + 1];
      if (next && !labels.some((l) => next.includes(l)) && !NOISE.test(next)) {
        return next.trim();
      }
    }
  }
  return null;
}
