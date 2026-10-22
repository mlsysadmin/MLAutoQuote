import { z } from "zod";
import { requireStaff, writeAudit } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { deliverEmail, emailTransport, emailFrom } from "@/lib/email";
import { fieldErrors } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  to: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/**
 * Sends one test message, so "is email working?" has an answer that isn't
 * "submit a car and wait".
 *
 * Admin-only, rate-limited and audited. It accepts an address because the
 * person setting this up is usually checking whether it reaches a real
 * mailbox they can open — but it records who sent what, where, so it cannot
 * quietly become a way to mail strangers from an M Lhuillier address.
 */
export async function POST(req: Request) {
  const auth = await requireStaff("ADMIN");
  if (auth instanceof Response) return auth;

  const limit = rateLimit(`test-email:${auth.id}`, 6, 15 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "That's enough test emails for now. Try again shortly." },
      { status: 429 },
    );
  }

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // An empty body means "send it to me".
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Check that address.", fields: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const to = parsed.data.to ?? auth.email;
  const transport = emailTransport();

  if (transport === "none") {
    return Response.json(
      {
        ok: false,
        transport,
        error:
          "Nothing is configured to send mail, so the message was only written to the log. Set SMTP_HOST, or EMAIL_WEBHOOK_URL, and redeploy.",
      },
      { status: 409 },
    );
  }

  try {
    const result = await deliverEmail({
      to,
      subject: "AutoQuote test message",
      text:
        `This is a test from M Lhuillier AutoQuote, sent by ${auth.name}.\n\n` +
        `If you are reading it, offers will reach customers.\n\n` +
        `Sent from: ${emailFrom()}\nVia: ${transport}`,
      html:
        `<p>This is a test from <strong>M Lhuillier AutoQuote</strong>, sent by ${escapeHtml(auth.name)}.</p>` +
        `<p>If you are reading it, offers will reach customers.</p>` +
        `<p style="color:#827d77;font-size:12px">Sent from ${escapeHtml(emailFrom())} via ${transport}.</p>`,
    });

    await writeAudit({
      actorUserId: auth.id,
      action: "settings.email.test",
      entity: "Setting",
      entityId: "email",
      meta: { to, transport },
      ip: clientIp(req),
    });

    return Response.json({ ok: result.delivered, transport, to });
  } catch (err) {
    // The reason a mail server rejected us is the whole point of this button,
    // so it is passed back rather than swallowed into a generic failure.
    const detail = err instanceof Error ? err.message : String(err);
    console.error("test email failed", detail);
    return Response.json({ ok: false, transport, error: detail }, { status: 502 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
