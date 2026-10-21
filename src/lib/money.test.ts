/**
 * The compact formatter carries a warning the appraiser reads just before
 * committing real money, so its rounding is worth pinning down.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { formatCompactPeso, parsePeso, roundToThousand } from "./money";

test("thousands read as K", () => {
  assert.equal(formatCompactPeso(137_000), "₱137K");
  assert.equal(formatCompactPeso(5_000), "₱5K");
  assert.equal(formatCompactPeso(1_000), "₱1K");
  // Rounded to the nearest thousand, not truncated.
  assert.equal(formatCompactPeso(137_600), "₱138K");
});

test("millions read as M, without a pointless decimal", () => {
  assert.equal(formatCompactPeso(1_200_000), "₱1.2M");
  assert.equal(formatCompactPeso(2_000_000), "₱2M");
  assert.equal(formatCompactPeso(12_400_000), "₱12M");
});

test("small amounts stay exact", () => {
  assert.equal(formatCompactPeso(999), "₱999");
  assert.equal(formatCompactPeso(0), "₱0");
});

test("negatives keep their sign", () => {
  assert.equal(formatCompactPeso(-137_000), "-₱137K");
});

test("nothing in, dash out", () => {
  assert.equal(formatCompactPeso(null), "—");
  assert.equal(formatCompactPeso(undefined), "—");
  assert.equal(formatCompactPeso(Number.NaN), "—");
});

test("parsePeso accepts what an appraiser actually types", () => {
  assert.equal(parsePeso("485,000"), 485_000);
  assert.equal(parsePeso("₱485,000"), 485_000);
  assert.equal(parsePeso("485k"), 485_000);
  assert.equal(parsePeso("1.2m"), 1_200_000);
  assert.equal(parsePeso(""), null);
  assert.equal(parsePeso("abc"), null);
});

test("offers round to the nearest thousand", () => {
  assert.equal(roundToThousand(744_440), 744_000);
  assert.equal(roundToThousand(744_600), 745_000);
});
