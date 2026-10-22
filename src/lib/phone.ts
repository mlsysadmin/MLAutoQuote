/**
 * Philippine mobile numbers, split between what the customer types and what we
 * store.
 *
 * The form shows "+63" as a fixed prefix beside the box, so the customer types
 * the ten digits that follow it. Everyone here has typed their number as
 * 0917… their whole life, though, so the leading zero is dropped rather than
 * rejected — the two forms mean the same number and arguing about it helps
 * nobody.
 *
 * Storage is always +63 followed by ten digits: one shape for the SMS gateway,
 * for the CSV exports and for matching a returning customer against the number
 * they gave last time.
 */

/** Ten digits: a PH mobile is 9XXXXXXXXX once the country code is off. */
const NATIONAL_LENGTH = 10;

/**
 * The part the customer types, from whatever shape we have stored.
 * `+639171234567`, `09171234567` and `639171234567` all give `9171234567`.
 */
export function toNationalDigits(stored: string | null | undefined): string {
  let digits = (stored ?? "").replace(/\D/g, "");

  // Country code, however it was written.
  if (digits.startsWith("63")) digits = digits.slice(2);
  // Trunk prefix, which a Filipino keys in out of habit.
  digits = digits.replace(/^0+/, "");

  return digits.slice(0, NATIONAL_LENGTH);
}

/**
 * What to store for what was typed. Empty in, empty out — a bare "+63" is not
 * a phone number, and storing one would make an unanswered field look filled.
 */
export function toStoredPhone(national: string): string {
  const digits = toNationalDigits(national);
  return digits ? `+63${digits}` : "";
}
