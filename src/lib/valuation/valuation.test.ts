/**
 * Tests for the parts of the valuation that decide how much money changes
 * hands. Pure functions only — no database, so these run anywhere:
 *
 *   npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { computeBand, quantile, median } from "./stats";
import { buildAdjustments, type AdjustmentInput } from "./adjustments";
import { referenceMarketPrice } from "./providers/seed";

const THIS_YEAR = new Date().getFullYear();

function listings(...prices: number[]) {
  return prices.map((pricePhp, i) => ({ id: `c${i}`, pricePhp }));
}

// ── Quantiles ────────────────────────────────────────────────────────────────

test("quantile interpolates between points", () => {
  assert.equal(quantile([10, 20, 30, 40], 0.5), 25);
  assert.equal(quantile([10, 20, 30], 0.5), 20);
  assert.equal(quantile([42], 0.5), 42);
  assert.equal(quantile([], 0.5), 0);
});

test("median matches quantile(0.5) on unsorted input", () => {
  assert.equal(median([30, 10, 20]), 20);
});

// ── Band ─────────────────────────────────────────────────────────────────────

test("computeBand returns null for an empty set", () => {
  assert.equal(computeBand([]), null);
});

test("computeBand reads low, mid and high off a clean set", () => {
  const band = computeBand(listings(480_000, 500_000, 520_000, 540_000))!;
  assert.equal(band.lowPhp, 480_000);
  assert.equal(band.highPhp, 540_000);
  assert.equal(band.midPhp, 510_000);
  assert.equal(band.count, 4);
  assert.equal(band.excluded.length, 0);
});

test("computeBand drops a parts-car and a typo, and keeps them visible", () => {
  // 35k "for parts" and 2.4M typo against a cluster around 500k.
  const band = computeBand(
    listings(35_000, 480_000, 495_000, 500_000, 510_000, 520_000, 2_400_000),
  )!;

  const keptPrices = band.kept.map((l) => l.pricePhp);
  assert.ok(!keptPrices.includes(35_000), "parts car should be trimmed");
  assert.ok(!keptPrices.includes(2_400_000), "typo should be trimmed");
  assert.equal(band.excluded.length, 2, "both outliers stay on the record");
  assert.equal(band.lowPhp, 480_000);
  assert.equal(band.highPhp, 520_000);
});

test("computeBand trims down to three, but no further", () => {
  // Three tight prices plus one far out — trimming leaves exactly the minimum.
  const band = computeBand(listings(500_000, 505_000, 510_000, 2_000_000))!;
  assert.equal(band.count, 3);
  assert.equal(band.highPhp, 510_000);
  assert.equal(band.excluded.length, 1);
});

test("computeBand keeps everything when trimming would leave fewer than three", () => {
  // Two tight prices and two far out: a band built on two points isn't a band,
  // so the appraiser sees the lot and decides.
  const band = computeBand(listings(500_000, 505_000, 2_000_000, 2_050_000))!;
  assert.equal(band.count, 4, "nothing should be trimmed");
  assert.equal(band.excluded.length, 0);
});

test("computeBand handles sets too small for an IQR", () => {
  const band = computeBand(listings(400_000, 600_000, 800_000))!;
  assert.equal(band.count, 3);
  assert.equal(band.lowPhp, 400_000);
  assert.equal(band.midPhp, 600_000);
  assert.equal(band.highPhp, 800_000);
});

test("the mid listing is a real row near the median, not a computed number", () => {
  const band = computeBand(listings(400_000, 500_000, 900_000))!;
  assert.equal(band.midPhp, 500_000);
  assert.equal(band.mid.pricePhp, 500_000, "mid must point at an openable listing");
  assert.ok(band.kept.includes(band.mid));
});

// ── Adjustments ──────────────────────────────────────────────────────────────

function baseSubmission(over: Partial<AdjustmentInput> = {}): AdjustmentInput {
  return {
    vehicleClass: "FOUR_WHEEL",
    year: THIS_YEAR - 5,
    mileageKm: 75_000, // exactly age-typical at 15,000 km/year
    conditionGrade: "GOOD",
    hasAccidentHistory: false,
    isFloodDamaged: false,
    tireConditionPct: 80,
    hasWarningLights: false,
    airconWorking: true,
    hasCR: true,
    hasOR: true,
    orExpiryDate: null,
    isEncumbered: false,
    isUnderFinancing: false,
    financingBalance: null,
    lastRegistrationYear: THIS_YEAR,
    transmission: "AUTOMATIC",
    ...over,
  };
}

function codes(lines: ReturnType<typeof buildAdjustments>) {
  return lines.map((l) => l.code);
}

test("a clean, age-typical unit attracts only the reconditioning allowance", () => {
  const lines = buildAdjustments(baseSubmission());
  assert.deepEqual(codes(lines), ["RECON"]);
});

test("mileage well above typical is penalised, below is rewarded", () => {
  const high = buildAdjustments(baseSubmission({ mileageKm: 155_000 }));
  const highLine = high.find((l) => l.code === "MILEAGE")!;
  assert.ok(highLine.value < 1, "excess mileage should reduce the offer");

  const low = buildAdjustments(baseSubmission({ mileageKm: 25_000 }));
  const lowLine = low.find((l) => l.code === "MILEAGE")!;
  assert.ok(lowLine.value > 1, "low mileage should lift the offer");
});

test("the mileage factor is clamped, so an absurd odometer can't zero the offer", () => {
  const line = buildAdjustments(
    baseSubmission({ mileageKm: 1_400_000 }),
  ).find((l) => l.code === "MILEAGE")!;
  assert.ok(line.value >= 0.88, `clamped at 0.88, got ${line.value}`);
});

test("flood history supersedes accident history rather than stacking", () => {
  const lines = buildAdjustments(
    baseSubmission({ isFloodDamaged: true, hasAccidentHistory: true }),
  );
  assert.ok(codes(lines).includes("FLOOD"));
  assert.ok(
    !codes(lines).includes("ACCIDENT"),
    "a flooded unit should not also take the accident factor",
  );
});

test("missing papers and a lapsed registration are each priced", () => {
  const lines = buildAdjustments(
    baseSubmission({
      hasCR: false,
      hasOR: false,
      lastRegistrationYear: THIS_YEAR - 3,
    }),
  );
  assert.ok(codes(lines).includes("NO_CR"));
  assert.ok(codes(lines).includes("NO_OR"));
  assert.ok(codes(lines).includes("LAPSED_REG"));
});

test("an outstanding financing balance comes off in full", () => {
  const line = buildAdjustments(
    baseSubmission({ isUnderFinancing: true, financingBalance: 180_000 }),
  ).find((l) => l.code === "FINANCING")!;
  assert.equal(line.kind, "deduction");
  assert.equal(line.value, 180_000);
});

test("worn tires deduct less than bald ones", () => {
  const worn = buildAdjustments(baseSubmission({ tireConditionPct: 45 })).find(
    (l) => l.code === "TIRES",
  )!;
  const bald = buildAdjustments(baseSubmission({ tireConditionPct: 15 })).find(
    (l) => l.code === "TIRES",
  )!;
  assert.ok(bald.value > worn.value);
});

test("condition grade moves the offer in the expected direction", () => {
  const excellent = buildAdjustments(
    baseSubmission({ conditionGrade: "EXCELLENT" }),
  ).find((l) => l.code === "CONDITION")!;
  const poor = buildAdjustments(
    baseSubmission({ conditionGrade: "POOR" }),
  ).find((l) => l.code === "CONDITION")!;

  assert.ok(excellent.value > 1);
  assert.ok(poor.value < 1);
});

test("the reconditioning allowance is internal-only", () => {
  const recon = buildAdjustments(baseSubmission()).find(
    (l) => l.code === "RECON",
  )!;
  assert.equal(recon.internalOnly, true);
});

// ── Reference pricing ────────────────────────────────────────────────────────

test("reference price falls with age and never below the nameplate floor", () => {
  const base = { submissionId: "s1", make: "Toyota", model: "Vios" };

  const newer = referenceMarketPrice({ ...base, year: THIS_YEAR - 2 })!;
  const older = referenceMarketPrice({ ...base, year: THIS_YEAR - 10 })!;
  const ancient = referenceMarketPrice({ ...base, year: 1995 })!;

  assert.ok(newer > older, "a newer unit should be worth more");
  assert.ok(ancient > 0, "very old units still have a floor value");
  assert.ok(ancient <= older);
});

test("the seed band is age-typical, so mileage isn't charged for twice", async () => {
  // Two identical submissions that differ only in odometer must produce the
  // same comparables band — mileage is priced once, in buildAdjustments().
  const { SeedProvider } = await import("./providers/seed");
  const provider = new SeedProvider();
  const base = {
    submissionId: "same-seed",
    make: "Toyota",
    model: "Fortuner",
    year: THIS_YEAR - 7,
  };

  const lowKm = await provider.search({ ...base, mileageKm: 40_000 });
  const highKm = await provider.search({ ...base, mileageKm: 200_000 });

  assert.deepEqual(
    lowKm.map((l) => l.pricePhp),
    highKm.map((l) => l.pricePhp),
    "the market band must not move with the subject's odometer",
  );
});

test("reference price still prices mileage when asked to", () => {
  const base = {
    submissionId: "s1",
    make: "Toyota",
    model: "Fortuner",
    year: THIS_YEAR - 7,
  };
  const typical = referenceMarketPrice({ ...base, mileageKm: null })!;
  const thrashed = referenceMarketPrice({ ...base, mileageKm: 250_000 })!;
  assert.ok(thrashed < typical);
});

test("reference price is null for a nameplate we have no data for", () => {
  assert.equal(
    referenceMarketPrice({
      submissionId: "s1",
      make: "Ferrari",
      model: "F40",
      year: 1990,
    }),
    null,
  );
});

// ── The full line-by-line arithmetic ─────────────────────────────────────────

test("factors compound before deductions, and the running total is explained", () => {
  // Mirrors the order generateOffer applies them in.
  const lines = buildAdjustments(
    baseSubmission({
      conditionGrade: "FAIR",
      mileageKm: 155_000,
      hasWarningLights: true,
    }),
  );

  let running = 500_000;
  for (const line of lines) {
    if (line.kind !== "factor") continue;
    const before = running;
    running *= line.value;
    line.effectPhp = Math.round(running - before);
  }
  for (const line of lines) {
    if (line.kind !== "deduction") continue;
    running -= line.value;
    line.effectPhp = -line.value;
  }

  assert.ok(running < 500_000, "a worse-than-average unit must come out lower");
  assert.ok(running > 0);

  // Every line accounts for its own movement.
  const explained = lines.reduce((sum, l) => sum + (l.effectPhp ?? 0), 0);
  assert.ok(
    Math.abs(500_000 + explained - running) < 1,
    "the breakdown must add up to the result",
  );
});
