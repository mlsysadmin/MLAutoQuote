import { z } from "zod";
import { requireStaff, writeAudit } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";
import {
  buyMarginMeta,
  setBuyMargin,
  BUY_MARGIN_MIN,
  BUY_MARGIN_MAX,
} from "@/lib/settings";
import { fieldErrors } from "@/lib/validation";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  // Sent as a share, not a percentage: 0.82, never 82.
  buyMargin: z
    .number()
    .min(BUY_MARGIN_MIN, `Can't go below ${Math.round(BUY_MARGIN_MIN * 100)}%.`)
    .max(BUY_MARGIN_MAX, `Can't go above ${Math.round(BUY_MARGIN_MAX * 100)}%.`),
});

/** The current pricing settings. Any signed-in member of staff may look. */
export async function GET() {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const margin = await buyMarginMeta();
  return Response.json({ buyMargin: margin });
}

/**
 * Changes the buy margin.
 *
 * Admin-only and audited: this one number decides what every offer in the
 * country opens at, so who moved it and when is not optional.
 */
export async function PATCH(req: Request) {
  const auth = await requireStaff("ADMIN");
  if (auth instanceof Response) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "That value can't be saved.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const before = await buyMarginMeta();
  const value = await setBuyMargin(parsed.data.buyMargin, auth.id);

  await writeAudit({
    actorUserId: auth.id,
    action: "settings.buy_margin.update",
    entity: "Setting",
    entityId: "valuation.buyMargin",
    meta: { from: before.value, to: value },
    ip: clientIp(req),
  });

  return Response.json({ buyMargin: { value } });
}
