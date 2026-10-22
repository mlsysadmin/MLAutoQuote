import "server-only";

/**
 * Getting an email to a customer.
 *
 * Two ways out, chosen by what is configured:
 *
 *   SMTP     — a mail server, which is what M Lhuillier already runs and what
 *              Google Workspace and Microsoft 365 both speak. Set the host and
 *              it is used.
 *   webhook  — POST the message to an endpoint that sends it. For a team that
 *              already has a gateway, or a provider's HTTP API behind a small
 *              shim.
 *   neither  — the message is written to the log and nothing is delivered.
 *
 * That last case is the dangerous one, and it is why `emailTransport()` exists
 * as something the staff settings page can ask about: an offer that was
 * "sent" and never arrived looks identical to a working system from inside
 * the app. The page says plainly which of the three is in force.
 */

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type EmailTransport = "api" | "smtp" | "webhook" | "none";

/**
 * Which route is configured, best first.
 *
 * The API key leads deliberately. Getting a mail server's credentials out of
 * a corporate IT department is a week; signing up for a sending service and
 * copying a key is two minutes, and it is one HTTPS call rather than an SMTP
 * port that half of all networks block outbound — including, as it turns out,
 * the one this was built on.
 */
export function emailTransport(): EmailTransport {
  if (process.env.EMAIL_API_KEY) return "api";
  if (process.env.SMTP_HOST) return "smtp";
  if (process.env.EMAIL_WEBHOOK_URL) return "webhook";
  return "none";
}

/** The address customers see in their inbox. */
export function emailFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    "noreply@mlhuillier.com"
  );
}

/**
 * Sends, or explains why it could not.
 *
 * Returns rather than throws for the "nothing configured" case, because a
 * missing gateway must not fail a submission the customer has completed — but
 * a configured gateway that rejects the message does throw, since that is a
 * fault someone needs to see.
 */
export async function deliverEmail(
  message: EmailMessage,
): Promise<{ delivered: boolean; transport: EmailTransport; detail?: string }> {
  const transport = emailTransport();

  if (transport === "none") {
    console.info("[email:not-configured]", {
      to: mask(message.to),
      subject: message.subject,
    });
    return {
      delivered: false,
      transport,
      detail: "No mail server or webhook is configured.",
    };
  }

  if (transport === "api") {
    await sendViaApi(message);
    return { delivered: true, transport };
  }

  if (transport === "smtp") {
    await sendViaSmtp(message);
    return { delivered: true, transport };
  }

  await sendViaWebhook(message);
  return { delivered: true, transport };
}

// ── Sending API ──────────────────────────────────────────────────────────────

/**
 * A transactional email provider's HTTP API.
 *
 * Defaults to Resend's endpoint and request shape, which SendGrid, Postmark
 * and Mailgun do not share — so `EMAIL_API_URL` exists for swapping the
 * endpoint, and anything stranger goes through the webhook transport instead.
 *
 * HTTPS rather than SMTP is the point: it works from Cloud Run, from behind a
 * corporate firewall, and from a network that silently drops port 25.
 */
async function sendViaApi(message: EmailMessage): Promise<void> {
  const url = process.env.EMAIL_API_URL || "https://api.resend.com/emails";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      },
      signal: controller.signal,
      // Next caches server-side fetches by default. A sent email is not a
      // cacheable GET, and a replayed one would be worse than a failed one.
      cache: "no-store",
      body: JSON.stringify({
        from: emailFrom(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
    });
  } catch (err) {
    // Node reports every network failure as the word "fetch failed" and hides
    // the reason — DNS, a refused connection, a proxy, an expired certificate
    // — one level down in `cause`. That reason is the entire diagnostic value
    // of this error, so it is dug out rather than passed along as-is.
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const why = cause?.code ?? cause?.message ?? (err as Error).message;
    throw new Error(`couldn't reach the email service at ${url} — ${why}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // The provider's own words — "domain not verified", "key revoked" — are
    // what the administrator needs to see, so they are passed through.
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`email API ${res.status}: ${detail}`);
  }

  // The provider's id for this message. A 200 means "accepted for delivery",
  // which is not the same as "arrived" — a sandbox restriction or a bounce
  // happens afterwards. Logging the id is what makes the difference
  // traceable: it is the handle for looking the message up later.
  try {
    const body = (await res.json()) as { id?: string };
    if (body.id) {
      console.info("[email:accepted]", { id: body.id, to: mask(message.to) });
    }
  } catch {
    // A provider that returns no JSON body is fine; the send still happened.
  }
}

// ── SMTP ─────────────────────────────────────────────────────────────────────

/**
 * One connection pool for the process.
 *
 * Opening a TLS session per email is slow and makes a provider think it is
 * being hammered by a stranger; a pool keeps one authenticated connection and
 * reuses it.
 */
let pool: import("nodemailer").Transporter | null = null;

async function smtpPool(): Promise<import("nodemailer").Transporter> {
  if (pool) return pool;

  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const host = process.env.SMTP_HOST ?? "";

  // A relay on this machine is reachable only from this machine, so there is
  // no wire to intercept and nothing for TLS to protect. Every other host
  // must encrypt: an SMTP password crossing a network in the clear is the
  // whole account. The exception is by address, not by a setting, so it
  // cannot be switched on for a real mail server by accident.
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);

  pool = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; 587 opens in the clear and upgrades with STARTTLS,
    // which `secure: false` means here — not "no encryption".
    secure: port === 465,
    requireTLS: port !== 465 && !loopback,
    ignoreTLS: loopback && port !== 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD ?? "",
        }
      : undefined,
    pool: true,
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
  });

  return pool;
}

async function sendViaSmtp(message: EmailMessage): Promise<void> {
  const transporter = await smtpPool();
  await transporter.sendMail({
    from: emailFrom(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

/** Drops the pool — after a settings change, and in tests. */
export function resetEmailPool(): void {
  pool?.close?.();
  pool = null;
}

// ── Webhook ──────────────────────────────────────────────────────────────────

async function sendViaWebhook(message: EmailMessage): Promise<void> {
  const url = process.env.EMAIL_WEBHOOK_URL as string;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EMAIL_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
        : {}),
    },
    // `text` is always sent, so a gateway that ignores `html` still delivers
    // something readable with the link in it.
    body: JSON.stringify({
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    }),
  });

  if (!res.ok) throw new Error(`email gateway ${res.status}`);
}

/** Logs never carry a full address. */
function mask(value: string): string {
  const [name, domain] = value.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
}
