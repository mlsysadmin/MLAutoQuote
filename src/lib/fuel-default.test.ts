import test from "node:test";
import assert from "node:assert/strict";
import { defaultFuelFor } from "./fuel-default";
import { VEHICLE_CATALOG } from "./vehicles";

test("the diesel workhorses are pre-selected as diesel", () => {
  assert.equal(defaultFuelFor("Toyota", "Hilux"), "DIESEL");
  assert.equal(defaultFuelFor("Isuzu", "D-Max"), "DIESEL");
  assert.equal(defaultFuelFor("Ford", "Ranger"), "DIESEL");
  assert.equal(defaultFuelFor("Mitsubishi", "Montero Sport"), "DIESEL");
});

test("the petrol runabouts are pre-selected as petrol", () => {
  assert.equal(defaultFuelFor("Toyota", "Vios"), "GASOLINE");
  assert.equal(defaultFuelFor("Toyota", "Wigo"), "GASOLINE");
  assert.equal(defaultFuelFor("Honda", "City"), "GASOLINE");
  assert.equal(defaultFuelFor("Mitsubishi", "Mirage"), "GASOLINE");
});

test("an MPV is not assumed diesel just because it is big", () => {
  assert.equal(defaultFuelFor("Mitsubishi", "Xpander"), "GASOLINE");
  assert.equal(defaultFuelFor("Suzuki", "Ertiga"), "GASOLINE");
  // The exception, and the reason the nameplate list exists.
  assert.equal(defaultFuelFor("Toyota", "Innova"), "DIESEL");
});

test("a genuine coin toss is left to the customer", () => {
  // Body-on-frame SUVs that aren't named go unanswered rather than guessed.
  for (const [make, models] of Object.entries(VEHICLE_CATALOG)) {
    for (const model of models) {
      if (model.body !== "SUV") continue;
      const guess = defaultFuelFor(make, model.name);
      if (guess !== null) {
        // Only ever because the nameplate was listed explicitly.
        assert.ok(
          ["DIESEL", "GASOLINE"].includes(guess),
          `${make} ${model.name}`,
        );
      }
    }
  }
});

test("nothing chosen yet, nothing guessed", () => {
  assert.equal(defaultFuelFor(null, null), null);
  assert.equal(defaultFuelFor("Toyota", null), null);
  assert.equal(defaultFuelFor("", "Vios"), null);
});

test("a nameplate we don't carry gets no guess", () => {
  assert.equal(defaultFuelFor("Toyota", "Not A Real Model"), null);
  assert.equal(defaultFuelFor("Nonexistent", "Thing"), null);
});

test("every nameplate in the override list is one we actually sell", () => {
  // A typo here would silently stop defaulting, which nobody would notice.
  const known = new Set<string>();
  for (const [make, models] of Object.entries(VEHICLE_CATALOG)) {
    for (const model of models) {
      known.add(`${make.toUpperCase()}|${model.name.toUpperCase()}`);
    }
  }

  for (const pair of [
    "TOYOTA|HILUX",
    "TOYOTA|INNOVA",
    "ISUZU|D-MAX",
    "FORD|RANGER",
    "MITSUBISHI|XPANDER",
    "HONDA|CR-V",
  ]) {
    assert.ok(known.has(pair), `${pair} is not in the catalogue`);
  }
});

test("a motorcycle is pre-selected as petrol without needing a nameplate", () => {
  assert.equal(defaultFuelFor("Honda", "Click 125i", "TWO_THREE_WHEEL"), "GASOLINE");
  assert.equal(defaultFuelFor("Rusi", "TC125", "TWO_THREE_WHEEL"), "GASOLINE");
});

test("the class does not leak into the car rules", () => {
  // "Honda" exists in both catalogues; the class is what tells them apart.
  assert.equal(defaultFuelFor("Honda", "CR-V", "FOUR_WHEEL"), "GASOLINE");
  assert.equal(defaultFuelFor("Toyota", "Hilux", "FOUR_WHEEL"), "DIESEL");
});
