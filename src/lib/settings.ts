import "server-only";
import { prisma } from "./prisma";
import { env } from "./env";

/**
 * Settings an administrator can change from the app, without a redeploy.
 *
 * The buy margin is the first of them, and the reason the table exists: it is
 * the single number that decides what every offer opens at, and until now
 * moving it meant editing an environment variable and shipping a new
 * revision. That is too slow for a lever the business needs to pull when the
 * second-hand market turns.
 *
 * Precedence is database, then environment, then the built-in default. A
 * deployment that has never touched the page behaves exactly as it did.
 */

export const BUY_MARGIN_KEY = "valuation.buyMargin";

/**
 * The band the margin may be set within.
 *
 * Below the floor we would be offering so far under the market that nobody
 * sells to us and the appraisers override every quote by hand; above the
 * ceiling we buy at a price we cannot resell at. Neither is a judgement the
 * app should let a mistyped digit make.
 */
export const BUY_MARGIN_MIN = 0.5;
export const BUY_MARGIN_MAX = 1.0;

/** Clamps whatever we were given into something safe to price with. */
export function clampBuyMargin(value: number): number {
  if (!Number.isFinite(value)) return env.valuation.buyMargin;
  return Math.min(BUY_MARGIN_MAX, Math.max(BUY_MARGIN_MIN, value));
}

/**
 * Settings are read on every valuation, so a short cache keeps that from
 * being a query per offer. Thirty seconds is long enough to matter under load
 * and short enough that an admin who changes the margin sees it take effect
 * while they are still looking at the page.
 */
const CACHE_MS = 30_000;
let cached: { value: number; at: number } | null = null;

export async function getBuyMargin(): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  let value = env.valuation.buyMargin;
  try {
    const row = await prisma.setting.findUnique({
      where: { key: BUY_MARGIN_KEY },
      select: { value: true },
    });
    if (row) {
      const parsed = Number(row.value);
      if (Number.isFinite(parsed)) value = clampBuyMargin(parsed);
    }
  } catch (err) {
    // A settings table that isn't there yet, or a database blip, must not
    // stop the app pricing cars. The environment value still works.
    console.error("buy margin lookup failed, using the environment", err);
  }

  cached = { value, at: Date.now() };
  return value;
}

/** What the page shows before anyone has saved anything. */
export function envBuyMargin(): number {
  return clampBuyMargin(env.valuation.buyMargin);
}

export async function setBuyMargin(
  value: number,
  actorUserId: string,
): Promise<number> {
  const clamped = clampBuyMargin(value);
  const asText = clamped.toFixed(4);

  await prisma.setting.upsert({
    where: { key: BUY_MARGIN_KEY },
    create: { key: BUY_MARGIN_KEY, value: asText, updatedById: actorUserId },
    update: { value: asText, updatedById: actorUserId },
  });

  cached = { value: clamped, at: Date.now() };
  return clamped;
}

/** Drops the cache — for tests, and after a write from another process. */
export function clearSettingsCache(): void {
  cached = null;
}

/** When the margin was last changed, and by whom, for the settings page. */
export async function buyMarginMeta(): Promise<{
  value: number;
  fromDatabase: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
}> {
  try {
    const row = await prisma.setting.findUnique({
      where: { key: BUY_MARGIN_KEY },
      select: {
        value: true,
        updatedAt: true,
        updatedBy: { select: { name: true } },
      },
    });

    if (row) {
      return {
        value: clampBuyMargin(Number(row.value)),
        fromDatabase: true,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy?.name ?? null,
      };
    }
  } catch {
    // Fall through to the environment value.
  }

  return {
    value: envBuyMargin(),
    fromDatabase: false,
    updatedAt: null,
    updatedBy: null,
  };
}
