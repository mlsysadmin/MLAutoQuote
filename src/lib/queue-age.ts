/**
 * How long a submission has been waiting for an appraiser.
 *
 * The promise on the customer's tracking page is "usually within 24 hours".
 * Forty-eight is therefore not a target being missed by a little — it is a
 * customer who has been told twice over that we would have come back by now,
 * and who is most likely selling to someone else while they wait.
 *
 * So the queue marks those rows rather than leaving an appraiser to work out
 * which "2d ago" is the oldest one.
 */

/** Past this, a submission waiting on an appraiser is late, not just queued. */
export const OVERDUE_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;

/** Statuses that mean nobody has released an offer yet. */
const AWAITING: ReadonlySet<string> = new Set(["SUBMITTED", "IN_REVIEW"]);

/**
 * Whether this row should be flagged as overdue.
 *
 * `now` is a parameter so the caller passes one timestamp for the whole table
 * — a row must not be late because it was evaluated a millisecond later than
 * its neighbour — and so this can be tested without mocking the clock.
 */
export function isOverdue(
  status: string,
  waitingSince: Date | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!AWAITING.has(status)) return false;
  if (!waitingSince) return false;

  const elapsed = now - waitingSince.getTime();
  // A clock skew that puts a submission in the future is not overdue.
  if (elapsed < 0) return false;

  return elapsed > OVERDUE_HOURS * MS_PER_HOUR;
}

/**
 * One clock reading for a whole table.
 *
 * It lives here rather than in the page because reading the clock is exactly
 * the impure thing a React component is not supposed to do — and because every
 * row of a queue must be judged against the same instant, which is easiest to
 * guarantee when there is one obvious place to take it from.
 */
export function queueClock(): number {
  return Date.now();
}

/** Whole hours waited, for telling the appraiser how bad it is. */
export function hoursWaiting(
  waitingSince: Date | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!waitingSince) return null;
  const elapsed = now - waitingSince.getTime();
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / MS_PER_HOUR);
}
