import "server-only";

import { randomBytes } from "node:crypto";
import type { Customer, IdType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Customer identity and KYC.
 *
 * Every person who submits a vehicle ends up on a record we can produce later.
 * The customer declares their details and their government ID in the wizard,
 * and that becomes their entry in the registry — we record, we don't verify.
 *
 * Records are keyed on the mobile number in normalised form, so a seller who
 * comes back with a second car lands on the same record instead of creating a
 * duplicate.
 *
 * The `kycStatus`, `riskRating` and `verifiedBy*` columns on Customer are
 * reserved for a later verification workflow and are deliberately not surfaced
 * anywhere yet.
 */

const UNAMBIGUOUS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCustomerCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += UNAMBIGUOUS[bytes[i] % UNAMBIGUOUS.length];
  }
  return `MLC-${out}`;
}

/**
 * 0917…, +63917…, 63917…, 9171234567 all become 639171234567.
 * Returns null for anything that isn't a plausible PH mobile number.
 */
export function normaliseMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");

  let national: string;
  if (digits.startsWith("63") && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) national = digits.slice(1);
  else if (digits.startsWith("9") && digits.length === 10) national = digits;
  else return null;

  return national.startsWith("9") ? `63${national}` : null;
}

/** 639171234567 → "0917 123 4567", which is how people read it back. */
export function formatMobile(normalised: string | null | undefined): string {
  if (!normalised) return "—";
  const national = normalised.startsWith("63")
    ? normalised.slice(2)
    : normalised;
  if (national.length !== 10) return normalised;
  return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** Splits "Juan Carlos Dela Cruz Jr." into parts, best effort. */
export function splitName(full: string): {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
} {
  const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);
  const parts = full.trim().split(/\s+/).filter(Boolean);

  let suffix: string | null = null;
  if (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    suffix = parts.pop()!;
  }

  if (parts.length === 0) {
    return { firstName: "Unknown", middleName: null, lastName: "Unknown", suffix };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: "—", suffix };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleName: null, lastName: parts[1], suffix };
  }

  // Philippine surnames are often two words ("Dela Cruz", "De Guzman"), so a
  // lowercase particle is folded into the surname rather than the middle name.
  const PARTICLES = new Set(["dela", "de", "del", "delos", "san", "santa", "sta", "sto"]);
  const particleAt = parts.findIndex(
    (p, i) => i > 0 && i < parts.length - 1 && PARTICLES.has(p.toLowerCase()),
  );
  if (particleAt > 0) {
    return {
      firstName: parts.slice(0, particleAt).join(" "),
      middleName: null,
      lastName: parts.slice(particleAt).join(" "),
      suffix,
    };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
    suffix,
  };
}

export function fullName(c: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
}): string {
  return [c.firstName, c.middleName, c.lastName, c.suffix]
    .filter(Boolean)
    .join(" ");
}

export function ageOn(birthDate: Date | null | undefined, at = new Date()): number | null {
  if (!birthDate) return null;
  let age = at.getFullYear() - birthDate.getFullYear();
  const monthDelta = at.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && at.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export type CustomerIntake = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  addressLine?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  birthDate?: Date | null;
  idType?: IdType | null;
  idNumber?: string | null;
};

/**
 * Finds the customer behind a submission, or creates the record.
 *
 * Existing records are topped up, never overwritten: if we already hold a
 * birth date and the new submission leaves it blank, the one on file stays.
 */
export async function upsertCustomerFromIntake(
  intake: CustomerIntake,
): Promise<Customer | null> {
  const mobile = normaliseMobile(intake.customerPhone);
  if (!mobile) return null;

  const name = splitName(intake.customerName);
  const existing = await prisma.customer.findUnique({ where: { mobile } });

  if (!existing) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await prisma.customer.create({
          data: {
            customerCode: makeCustomerCode(),
            mobile,
            firstName: name.firstName,
            middleName: name.middleName,
            lastName: name.lastName,
            suffix: name.suffix,
            email: intake.customerEmail ?? null,
            addressLine: intake.addressLine ?? null,
            barangay: intake.barangay ?? null,
            city: intake.city ?? null,
            province: intake.province ?? null,
            birthDate: intake.birthDate ?? null,
            idType: intake.idType ?? null,
            idNumber: intake.idNumber ?? null,
            kycStatus: "PENDING",
            consentGivenAt: new Date(),
          },
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        // A duplicate customerCode is worth retrying; a duplicate mobile means
        // someone else created the record a moment ago — fall through to it.
        if (code === "P2002" && attempt < 4) continue;
        throw err;
      }
    }
  }

  const customer =
    existing ?? (await prisma.customer.findUnique({ where: { mobile } }));
  if (!customer) return null;

  const data: Prisma.CustomerUpdateInput = {
    // Latest declaration wins for the name, since people correct spellings.
    firstName: name.firstName,
    middleName: name.middleName ?? customer.middleName,
    lastName: name.lastName,
    suffix: name.suffix ?? customer.suffix,
    // Everything else only fills a gap.
    email: customer.email ?? intake.customerEmail ?? null,
    addressLine: intake.addressLine ?? customer.addressLine,
    barangay: intake.barangay ?? customer.barangay,
    city: intake.city ?? customer.city,
    province: intake.province ?? customer.province,
    birthDate: customer.birthDate ?? intake.birthDate ?? null,
    idType: intake.idType ?? customer.idType,
    idNumber: intake.idNumber ?? customer.idNumber,
    consentGivenAt: customer.consentGivenAt ?? new Date(),
  };

  return prisma.customer.update({ where: { id: customer.id }, data });
}

/**
 * What the registry is still missing for this customer.
 *
 * Nothing here blocks an offer — it tells branch staff what to collect when
 * the seller turns up, so the record is complete before money changes hands.
 */
export function missingKycDetails(customer: {
  birthDate: Date | null;
  idType: IdType | null;
  idNumber: string | null;
  addressLine: string | null;
  city: string | null;
  email: string | null;
}): string[] {
  const missing: string[] = [];

  if (!customer.birthDate) missing.push("Date of birth");
  if (!customer.idType || !customer.idNumber) missing.push("Government ID");
  if (!customer.addressLine && !customer.city) missing.push("Address");
  if (!customer.email) missing.push("Email");

  return missing;
}

/** Under-18 sellers can't transfer a vehicle; worth flagging in the registry. */
export function isMinor(birthDate: Date | null): boolean {
  const age = ageOn(birthDate);
  return age !== null && age < 18;
}
