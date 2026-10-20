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
