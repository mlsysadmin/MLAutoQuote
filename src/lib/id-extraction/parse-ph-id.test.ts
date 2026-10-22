import test from "node:test";
import assert from "node:assert/strict";
import { parsePhilippineId } from "./parse-ph-id";

/**
 * The OCR text these tests parse is the real layout of each card, in the order
 * an OCR engine returns it — label rows above value rows, two fields to a line.
 *
 * That layout is the whole difficulty. The parser used to read "Last Name,
 * First Name, Middle Name" as the customer's name and "Expiration Date" as
 * their licence number, because both follow a label on the same line. These
 * cases exist so that cannot come back.
 */

const LICENCE = `REPUBLIC OF THE PHILIPPINES
DEPARTMENT OF TRANSPORTATION
LAND TRANSPORTATION OFFICE
NON-PROFESSIONAL DRIVER'S LICENSE
Last Name, First Name, Middle Name
DELA CRUZ, JUAN SANTOS
Date of Birth  Nationality
1988/04/12  PHL
License No.  Expiration Date
N01-23-456789  2028/04/12`;

const PHILSYS = `REPUBLIKA NG PILIPINAS
PHILIPPINE IDENTIFICATION CARD
PAMBANSANG PAGKAKAKILANLAN
APELYIDO/LAST NAME
REYES
MGA PANGALAN/GIVEN NAMES
MARIA CLARA
GITNANG APELYIDO/MIDDLE NAME
BAUTISTA
PETSA NG KAPANGANAKAN/DATE OF BIRTH
MARCH 7, 1995
PCN
1234-5678-9012-3456`;

const UMID = `UNIFIED MULTI-PURPOSE ID
SOCIAL SECURITY SYSTEM
SURNAME
SANTOS
GIVEN NAME
PEDRO
DATE OF BIRTH
12 JUNE 1979
CRN
0111-2223334-5`;

test("reads a driver's licence without mistaking its labels for values", () => {
  const r = parsePhilippineId(LICENCE);
  assert.equal(r.fullName, "Juan Santos Dela Cruz");
  assert.equal(r.birthDate, "1988-04-12");
  assert.equal(r.idType, "DRIVERS_LICENSE");
  assert.equal(r.idNumber, "N01-23-456789");
  assert.equal(r.confidence, 1);
});

test("a label row is never read as the customer's name", () => {
  const r = parsePhilippineId(LICENCE);
  assert.doesNotMatch(r.fullName ?? "", /first name/i);
  assert.doesNotMatch(r.fullName ?? "", /middle name/i);
});

test("a run of letters with no digits is not an ID number", () => {
  const r = parsePhilippineId(LICENCE);
  assert.doesNotMatch(r.idNumber ?? "", /EXPIRATION/);
  assert.match(r.idNumber ?? "", /\d/);
});

test("reads a PhilSys card from its bilingual labels", () => {
  const r = parsePhilippineId(PHILSYS);
  assert.equal(r.fullName, "Maria Clara Bautista Reyes");
  assert.equal(r.birthDate, "1995-03-07");
  assert.equal(r.idType, "PHILSYS");
  assert.equal(r.idNumber, "1234-5678-9012-3456");
});

test("reads a UMID, including a day-month-year birth date", () => {
  const r = parsePhilippineId(UMID);
  assert.equal(r.birthDate, "1979-06-12");
  assert.equal(r.idType, "UMID");
  assert.equal(r.idNumber, "0111-2223334-5");
});

test("Filipino name particles keep the capitals the card prints", () => {
  const r = parsePhilippineId(
    "DRIVER'S LICENSE\nLast Name, First Name, Middle Name\nDELOS SANTOS, ANA MARIE\nLicense No.\nD12-34-567890",
  );
  assert.equal(r.fullName, "Ana Marie Delos Santos");
});

test("an unreadable card fills nothing rather than guessing", () => {
  const r = parsePhilippineId("~~~~\n****\n????");
  assert.equal(r.filled.length, 0);
  assert.equal(r.confidence, 0);
});
