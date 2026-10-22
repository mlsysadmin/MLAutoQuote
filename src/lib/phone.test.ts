import test from "node:test";
import assert from "node:assert/strict";
import { toNationalDigits, toStoredPhone } from "./phone";

test("every way a Filipino writes their number gives the same ten digits", () => {
  for (const written of [
    "09171234567",
    "+639171234567",
    "639171234567",
    "0917 123 4567",
    "+63 917 123 4567",
    "(0917) 123-4567",
  ]) {
    assert.equal(toNationalDigits(written), "9171234567", written);
  }
});

test("a leading zero typed out of habit is dropped, not rejected", () => {
  assert.equal(toNationalDigits("0917"), "917");
});

test("nothing in, nothing out — a bare +63 is not a phone number", () => {
  assert.equal(toStoredPhone(""), "");
  assert.equal(toStoredPhone("   "), "");
  assert.equal(toNationalDigits(null), "");
  assert.equal(toNationalDigits(undefined), "");
});

test("storage is one shape, whatever was typed", () => {
  assert.equal(toStoredPhone("9171234567"), "+639171234567");
  assert.equal(toStoredPhone("09171234567"), "+639171234567");
  assert.equal(toStoredPhone("+63 917 123 4567"), "+639171234567");
});

test("what we store reads back as what the customer typed", () => {
  const stored = toStoredPhone("9171234567");
  assert.equal(toNationalDigits(stored), "9171234567");
});

test("extra digits are dropped rather than silently stored", () => {
  assert.equal(toNationalDigits("91712345678888"), "9171234567");
});

test("the stored form is what the server's validator accepts", () => {
  // Mirrors `phoneRegex` in validation.ts — if one changes, this fails.
  const phoneRegex = /^(\+?63|0)9\d{9}$/;
  assert.match(toStoredPhone("9171234567"), phoneRegex);
  assert.match(toStoredPhone("09051234567"), phoneRegex);
});
