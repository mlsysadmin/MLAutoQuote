import test from "node:test";
import assert from "node:assert/strict";
import { compareAsking } from "./asking-price";

test("a seller asking above the recommendation is flagged, with the percentage", () => {
  const r = compareAsking(600_000, 324_000);
  assert.equal(r?.direction, "above");
  assert.equal(r?.overAsking, true);
  assert.equal(r?.deltaPhp, 276_000);
  assert.equal(r?.pct, 85);
});

test("a seller asking below the recommendation is not a problem", () => {
  const r = compareAsking(300_000, 400_000);
  assert.equal(r?.direction, "below");
  assert.equal(r?.overAsking, false);
  assert.equal(r?.deltaPhp, -100_000);
  assert.equal(r?.pct, 25);
});

test("asking exactly the recommendation reads as agreement, not as a gap", () => {
  const r = compareAsking(324_000, 324_000);
  assert.equal(r?.direction, "equal");
  assert.equal(r?.overAsking, false);
  assert.equal(r?.deltaPhp, 0);
  assert.equal(r?.pct, 0);
});

test("the percentage is of the recommendation, not of the asking price", () => {
  // 50 over 100 is 50% over. Measured the other way it would read 33%.
  const r = compareAsking(150, 100);
  assert.equal(r?.pct, 50);
});

test("no asking price means nothing to compare", () => {
  assert.equal(compareAsking(null, 324_000), null);
  assert.equal(compareAsking(undefined, 324_000), null);
  assert.equal(compareAsking(0, 324_000), null);
});

test("no recommendation means no percentage to divide by", () => {
  assert.equal(compareAsking(600_000, null), null);
  assert.equal(compareAsking(600_000, 0), null);
});

test("a seller asking double is reported as 100% over, not 200%", () => {
  const r = compareAsking(800_000, 400_000);
  assert.equal(r?.pct, 100);
  assert.equal(r?.deltaPhp, 400_000);
});
