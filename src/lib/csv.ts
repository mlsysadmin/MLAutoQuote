/**
 * CSV generation for exports people open in Excel.
 *
 * Two things this gets right that a naive `join(",")` does not:
 *
 * 1. **Quoting.** Commas, quotes and newlines inside a value are escaped, so a
 *    customer note containing a comma doesn't silently shift every later
 *    column by one.
 *
 * 2. **Formula injection.** A cell beginning `=`, `+`, `-`, `@`, or a tab or
 *    carriage return, is treated by Excel and Sheets as a formula. A customer
 *    who types `=HYPERLINK(...)` into a free-text field would otherwise have
 *    that execute on the machine of whoever opens the export. Prefixing a
 *    single quote neutralises it, and spreadsheets hide the quote.
 */

const NEEDS_QUOTING = /[",\n\r]/;
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = value instanceof Date ? value.toISOString() : String(value);

  if (FORMULA_START.test(text)) text = `'${text}`;

  if (NEEDS_QUOTING.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/**
 * A complete CSV document.
 *
 * The leading byte-order mark is deliberate: without it Excel on Windows reads
 * UTF-8 as the local code page, and every peso sign and every "ñ" in a
 * customer's name arrives mangled.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [csvRow(headers), ...rows.map(csvRow)];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** A filename that sorts chronologically and is safe on every platform. */
export function csvFilename(prefix: string, at = new Date()): string {
  const stamp = at.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `${prefix}-${stamp}.csv`;
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // An export is a point-in-time extract; never let one be served again.
      "Cache-Control": "no-store, private",
    },
  });
}
