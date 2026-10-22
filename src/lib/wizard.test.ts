import test from "node:test";
import assert from "node:assert/strict";
import {
  validateStep,
  stepCompletion,
  requiredSlotsFor,
  photoSlotsFor,
  STEP_LABELS,
  EMPTY_DRAFT,
  type Draft,
} from "./wizard";

/**
 * These exist because of a real failure: the car and condition steps were
 * merged into one, and the validation rules kept the old numbering. Step 2
 * became the photo step but still demanded the CR and OR answers, which had
 * moved to the photo slots — so Continue refused, and refused silently,
 * because there was no field on the page to hang the error on.
 *
 * The lesson is in the first test: the step numbers in the rules must agree
 * with STEP_LABELS, and that agreement is now checked rather than remembered.
 */

const complete: Draft = {
  ...EMPTY_DRAFT,
  make: "Toyota",
  model: "Vios",
  year: 2019,
  transmission: "AUTOMATIC",
  fuelType: "GASOLINE",
  mileageKm: 62_000,
  conditionGrade: "GOOD",
  hasAccidentHistory: false,
  isFloodDamaged: false,
  customerName: "Juan Dela Cruz",
  customerPhone: "+639171234567",
  birthDate: "1988-04-12",
  idType: "DRIVERS_LICENSE",
  idNumber: "N01-23-456789",
  consentGiven: true,
};

test("there are three steps, and the rules know it", () => {
  assert.equal(STEP_LABELS.length, 3);
  // A rule for a step that doesn't exist can never be satisfied or seen.
  assert.deepEqual(validateStep(4, EMPTY_DRAFT), {});
});

test("the first step asks for the car and its condition together", () => {
  const e = validateStep(1, EMPTY_DRAFT);
  for (const field of [
    "make",
    "model",
    "year",
    "transmission",
    "fuelType",
    "mileageKm",
    "conditionGrade",
    "hasAccidentHistory",
    "isFloodDamaged",
  ]) {
    assert.ok(e[field], `step 1 should ask for ${field}`);
  }
});

test("the photo step never blocks — not for papers, not for anything", () => {
  // The customer in a car park without their CR must still reach the end.
  assert.deepEqual(validateStep(2, EMPTY_DRAFT), {});
  assert.deepEqual(validateStep(2, { ...EMPTY_DRAFT, hasCR: null, hasOR: null }), {});
});

test("no rule anywhere depends on the paperwork answers", () => {
  // They are answered by uploading the document, so a rule naming them has
  // no field on screen to report against — which is how Continue died.
  for (const step of [1, 2, 3]) {
    const e = validateStep(step, { ...complete, hasCR: null, hasOR: null });
    assert.ok(!("hasCR" in e), `step ${step} must not require hasCR`);
    assert.ok(!("hasOR" in e), `step ${step} must not require hasOR`);
  }
});

test("the last step asks who the seller is", () => {
  const e = validateStep(3, EMPTY_DRAFT);
  for (const field of ["customerName", "customerPhone", "birthDate", "idType", "idNumber", "consentGiven"]) {
    assert.ok(e[field], `step 3 should ask for ${field}`);
  }
});

test("a complete draft passes every step", () => {
  for (const step of [1, 2, 3]) {
    assert.deepEqual(validateStep(step, complete), {}, `step ${step}`);
  }
});

test("a financed unit must say what is still owed", () => {
  const e = validateStep(1, { ...complete, isUnderFinancing: true, financingBalance: null });
  assert.ok(e.financingBalance);
  assert.deepEqual(
    validateStep(1, { ...complete, isUnderFinancing: true, financingBalance: 250_000 }),
    {},
  );
});

test("someone under 18 can't sell a vehicle", () => {
  const sixteen = new Date();
  sixteen.setFullYear(sixteen.getFullYear() - 16);
  const e = validateStep(3, { ...complete, birthDate: sixteen.toISOString().slice(0, 10) });
  assert.match(e.birthDate ?? "", /18/);
});

test("completion and validation agree about which step is which", () => {
  const photos = new Set(requiredSlotsFor(complete.vehicleClass));
  const done = stepCompletion(complete, photos);

  // Step 1 complete means step 1 has nothing left to complain about.
  assert.equal(done[1], true);
  assert.deepEqual(validateStep(1, complete), {});
  // Step 2 is the photo step in both.
  assert.equal(done[2], true);
  assert.equal(done[3], true);
});

test("a motorcycle is not asked for photographs it cannot have", () => {
  const slots = photoSlotsFor("TWO_THREE_WHEEL").map((s) => s.slot);
  assert.ok(!slots.includes("INTERIOR_FRONT"));
  assert.ok(!slots.includes("INTERIOR_REAR"));
  // But the paperwork is the same on two wheels.
  assert.ok(slots.includes("DOC_CR"));
  assert.ok(slots.includes("DOC_ID"));
});
