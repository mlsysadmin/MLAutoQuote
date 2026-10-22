/**
 * CSV exports open in Excel on someone's desktop, which makes two of these
 * cases security-relevant rather than cosmetic.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvRow, toCsv, csvFilename } from "./csv";

test("plain values pass through untouched", () => {
  assert.equal(csvCell("Toyota Vios"), "Toyota Vios");
  assert.equal(csvCell(485000), "485000");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
});

test("commas, quotes and newlines are quoted so columns can't shift", () => {
  assert.equal(csvCell("Cebu City, Cebu"), '"Cebu City, Cebu"');
  assert.equal(csvCell('He said "fine"'), '"He said ""fine"""');
  assert.equal(csvCell("line one\nline two"), '"line one\nline two"');
});

test("formulas are neutralised — a customer must not run code on a colleague's PC", () => {
  // Excel and Sheets execute a cell starting with any of these.
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+44 917"), "'+44 917");
  assert.equal(csvCell("-2"), "'-2");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(
    csvCell('=HYPERLINK("http://evil","click")'),
    `"'=HYPERLINK(""http://evil"",""click"")"`,
  );
});

test("a formula that also needs quoting gets both treatments", () => {
  assert.equal(csvCell("=A1,B2"), `"'=A1,B2"`);
});

test("rows join with commas, and a document carries a BOM and CRLF", () => {
  assert.equal(csvRow(["a", "b,c", 1]), 'a,"b,c",1');

  const doc = toCsv(["Name", "Amount"], [["Vios", 485000]]);
  assert.ok(doc.startsWith("﻿"), "Excel needs the BOM to read UTF-8");
  assert.ok(doc.includes("\r\n"), "CRLF line endings");
  assert.ok(doc.includes("Vios,485000"));
});

test("dates export as ISO, which sorts and parses anywhere", () => {
  assert.equal(
    csvCell(new Date("2026-10-21T06:30:00.000Z")),
    "2026-10-21T06:30:00.000Z",
  );
});

test("filenames sort chronologically and are safe on every platform", () => {
  const name = csvFilename("autoquote-offers", new Date("2026-10-21T14:05:09Z"));
  assert.equal(name, "autoquote-offers-2026-10-21-14-05-09.csv");
  assert.ok(!/[:<>"/\\|?*]/.test(name));
});
