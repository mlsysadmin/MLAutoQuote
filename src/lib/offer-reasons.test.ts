/**
 * The rule that decides when an uplift must be justified. It runs in two
 * places — the offer form and the send endpoint — so it is worth pinning down
 * that they can only ever agree.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  OVERRIDE_REASONS,
  OVERRIDE_REASON_VALUES,
  overrideReasonLabel,
  requiresJustification,
  MIN_OVERRIDE_NOTE_LENGTH,
} from "./offer-reasons";

test("justification is required only above the recommendation", () => {
  assert.equal(requiresJustification(745_000, 744_000), true);
  assert.equal(requiresJustification(744_000, 744_000), false);
  assert.equal(requiresJustification(700_000, 744_000), false);
});

test("a single peso over still counts", () => {
  // The threshold is strict: there is no quiet band where an uplift escapes.
  assert.equal(requiresJustification(744_001, 744_000), true);
});

test("every reason has a distinct value, a label and a hint", () => {
  const values = OVERRIDE_REASONS.map((r) => r.value);
  assert.equal(new Set(values).size, values.length, "values must be unique");

  for (const reason of OVERRIDE_REASONS) {
    assert.ok(reason.label.length > 3, `${reason.value} needs a label`);
    assert.ok(reason.hint.length > 10, `${reason.value} needs a usable hint`);
  }
});

test("the enum list the schema validates against matches the options", () => {
  assert.deepEqual(
    [...OVERRIDE_REASON_VALUES].sort(),
    OVERRIDE_REASONS.map((r) => r.value).sort(),
  );
});

test("there is an escape hatch for cases the list doesn't cover", () => {
  assert.ok(OVERRIDE_REASONS.some((r) => r.value === "OTHER"));
});

test("labels resolve, and unknown values don't crash the page", () => {
  assert.equal(
    overrideReasonLabel("COMPETING_OFFER"),
    "Customer has a competing offer",
  );
  assert.equal(overrideReasonLabel(null), "—");
  // A value retired from the list must still render on an old offer.
  assert.equal(overrideReasonLabel("SOMETHING_OLD"), "SOMETHING_OLD");
});

test("the minimum note length asks for a sentence, not a word", () => {
  assert.ok(MIN_OVERRIDE_NOTE_LENGTH >= 10);
  assert.equal("Casa records complete.".length >= MIN_OVERRIDE_NOTE_LENGTH, true);
  assert.equal("ok".length >= MIN_OVERRIDE_NOTE_LENGTH, false);
});
