/** Peso formatting. All amounts in this app are whole pesos stored as Int. */

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }
  return peso.format(amount);
}

/**
 * "₱137K", "₱1.2M" — for a figure that has to land in a glance rather than be
 * read digit by digit, such as a warning the appraiser must take in before
 * committing to a number.
 */
export function formatCompactPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }

  const value = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (value >= 1_000_000) {
    // One decimal unless it's a round number of millions: 1.2M, but 2M not 2.0M.
    const millions = value / 1_000_000;
    const shown = millions >= 10 || Number.isInteger(millions)
      ? Math.round(millions).toString()
      : millions.toFixed(1);
    return `${sign}₱${shown}M`;
  }

  if (value >= 1_000) return `${sign}₱${Math.round(value / 1_000)}K`;

  return `${sign}₱${Math.round(value)}`;
}

/** "₱485,000" without the symbol, for tight table cells. */
export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }
  return plain.format(amount);
}

/** Rounds to the nearest ₱1,000 — offers are never quoted to the peso. */
export function roundToThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${plain.format(km)} km`;
}

/** Parses "₱485,000", "485k", "485 000" into 485000. Returns null if unusable. */
export function parsePeso(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  const multiplier = /(\d)\s*[km]$/.test(trimmed)
    ? trimmed.endsWith("m")
      ? 1_000_000
      : 1_000
    : 1;

  const digits = trimmed.replace(/[^0-9.]/g, "");
  if (!digits) return null;

  const value = Number(digits) * multiplier;
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}
