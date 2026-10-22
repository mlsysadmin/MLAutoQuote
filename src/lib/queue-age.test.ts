import test from "node:test";
import assert from "node:assert/strict";
import { isOverdue, hoursWaiting, OVERDUE_HOURS } from "./queue-age";

const NOW = new Date("2026-10-21T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000);

test("a submission waiting longer than the threshold is overdue", () => {
  assert.equal(isOverdue("SUBMITTED", hoursAgo(49), NOW), true);
  assert.equal(isOverdue("IN_REVIEW", hoursAgo(72), NOW), true);
});

test("one still inside the threshold is not", () => {
  assert.equal(isOverdue("SUBMITTED", hoursAgo(47), NOW), false);
  assert.equal(isOverdue("SUBMITTED", hoursAgo(1), NOW), false);
});

test("exactly at the threshold is not yet late", () => {
  assert.equal(isOverdue("SUBMITTED", hoursAgo(OVERDUE_HOURS), NOW), false);
});

test("an offer already dealt with is never flagged, however old", () => {
  for (const status of ["OFFER_SENT", "ACCEPTED", "DECLINED", "EXPIRED"]) {
    assert.equal(isOverdue(status, hoursAgo(500), NOW), false, status);
  }
});

test("a draft the customer never submitted is not ours to be late on", () => {
  assert.equal(isOverdue("DRAFT", hoursAgo(500), NOW), false);
});

test("no timestamp, no claim either way", () => {
  assert.equal(isOverdue("SUBMITTED", null, NOW), false);
  assert.equal(isOverdue("SUBMITTED", undefined, NOW), false);
});

test("a timestamp in the future is not overdue", () => {
  // Clock skew between the database and the server, not a late appraisal.
  assert.equal(isOverdue("SUBMITTED", hoursAgo(-5), NOW), false);
});

test("hours waiting rounds down, so it never overstates the wait", () => {
  assert.equal(hoursWaiting(hoursAgo(49.9), NOW), 49);
  assert.equal(hoursWaiting(hoursAgo(0.4), NOW), 0);
  assert.equal(hoursWaiting(null, NOW), null);
  assert.equal(hoursWaiting(hoursAgo(-3), NOW), 0);
});

test("every row is judged against one clock", () => {
  // Two submissions a millisecond apart must not land on opposite sides of
  // the line because the table was rendered row by row.
  const edge = new Date(NOW - OVERDUE_HOURS * 60 * 60 * 1000 - 1);
  assert.equal(isOverdue("SUBMITTED", edge, NOW), true);
  assert.equal(isOverdue("SUBMITTED", edge, NOW - 2), false);
});
