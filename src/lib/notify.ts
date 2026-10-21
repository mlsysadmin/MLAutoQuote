import "server-only";

import { formatPeso } from "./money";

/**
 * Customer notifications.
 *
 * Deliberately thin: it formats the message and posts it to whatever gateway
 * you configure. Most Philippine SMS providers (and M Lhuillier's own internal
 * messaging service) expose a simple HTTP endpoint, so pointing
 * SMS_WEBHOOK_URL at it is the whole integration.
 *
 * With nothing configured the message is logged, which is what you want in
 * development and keeps a record in Cloud Logging until the gateway is wired up.
 */

type SubmissionReceivedInput = {
  submission: {
    refCode: string;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  };
  link: string;
};

/**
 * Sent the moment a submission lands.
 *
 * The confirmation screen promises a text, and until this ran that promise was
 * empty — a customer who closed the tab had no way back to their offer. The
 * SMS carries the reference so they can recover the link from /track even if
 * the message is deleted; the email carries the link itself as a button.
 */
export async function notifySubmissionReceived(
  input: SubmissionReceivedInput,
): Promise<void> {
  const { submission, link } = input;
  const firstName = (submission.customerName ?? "").split(" ")[0] || "there";
  const vehicle =
    [submission.year, submission.make, submission.model]
      .filter(Boolean)
      .join(" ") || "your vehicle";

  const sms =
    `Hi ${firstName}! M Lhuillier AutoQuote received your ${vehicle}. ` +
    `Reference ${submission.refCode}. We'll text again when your offer is ` +
    `ready, usually within 24 hours. Track it here: ${link}`;

  await Promise.all([
    submission.customerPhone ? sendSms(submission.customerPhone, sms) : null,
    submission.customerEmail
      ? sendEmail(
          submission.customerEmail,
          `We've got your ${vehicle} — reference ${submission.refCode}`,
          sms,
          receivedEmailHtml({ firstName, vehicle, link, refCode: submission.refCode }),
        )
      : null,
  ]);
}

type OfferSentInput = {
  submission: {
    refCode: string;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  };
  offerPhp: number;
  link: string;
  validUntil: Date;
};

export async function notifyOfferSent(input: OfferSentInput): Promise<void> {
  const { submission, offerPhp, link, validUntil } = input;
  const firstName = (submission.customerName ?? "").split(" ")[0] || "there";
  const vehicle = [submission.year, submission.make, submission.model]
    .filter(Boolean)
    .join(" ");

  const sms =
    `Hi ${firstName}! Your M Lhuillier offer for your ${vehicle} is ready: ` +
    `${formatPeso(offerPhp)}. Valid until ${validUntil.toLocaleDateString("en-PH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}. View it here: ${link} (Ref ${submission.refCode})`;

  await Promise.all([
    submission.customerPhone ? sendSms(submission.customerPhone, sms) : null,
    submission.customerEmail
      ? sendEmail(
          submission.customerEmail,
          "Your M Lhuillier offer is ready",
          sms,
          offerEmailHtml({
            firstName,
            vehicle,
            link,
            offer: formatPeso(offerPhp),
            validUntil: validUntil.toLocaleDateString("en-PH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
          }),
        )
      : null,
  ]);
}

async function sendSms(to: string, body: string): Promise<void> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    console.info("[sms:not-configured]", { to: mask(to), body });
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SMS_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ to, message: body }),
  });
  if (!res.ok) throw new Error(`sms gateway ${res.status}`);
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  html?: string,
): Promise<void> {
  const url = process.env.EMAIL_WEBHOOK_URL;
  if (!url) {
    console.info("[email:not-configured]", { to: mask(to), subject });
    return;
  }

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
    body: JSON.stringify({ to, subject, text: body, ...(html ? { html } : {}) }),
  });
  if (!res.ok) throw new Error(`email gateway ${res.status}`);
}

// ── Email bodies ─────────────────────────────────────────────────────────────
//
// Tables and inline styles, because email clients are twenty years behind
// browsers: Outlook ignores flexbox, Gmail strips <style> blocks. The button is
// a padded table cell rather than an <a> with a background, which is the one
// shape that renders everywhere.

function emailShell(inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f7f6;font-family:Arial,Helvetica,sans-serif;color:#1f1d1b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7f6;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
${inner}
<tr><td style="padding-top:28px;border-top:1px solid #efeeec;color:#827d77;font-size:12px;line-height:1.5">
M Lhuillier AutoQuote. If you didn't request this, you can ignore this message.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function button(link: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:#c8120c;border-radius:10px">
<a href="${link}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">${label}</a>
</td></tr></table>`;
}

function receivedEmailHtml(input: {
  firstName: string;
  vehicle: string;
  link: string;
  refCode: string;
}): string {
  return emailShell(`
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:12px">Thanks, ${input.firstName} — we're on it</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#56524e;padding-bottom:24px">
Your ${input.vehicle} is with our appraisers. We price it against current
marketplace listings, a licensed appraiser reviews it, and we'll let you know
as soon as your offer is ready — usually within 24 hours.
</td></tr>
<tr><td style="padding-bottom:24px">${button(input.link, "Track my appraisal")}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#56524e">
Your reference is <strong style="font-family:monospace">${input.refCode}</strong>.
Keep it — with the mobile number you gave us, it will get you back to your offer
at any time.
</td></tr>`);
}

function offerEmailHtml(input: {
  firstName: string;
  vehicle: string;
  link: string;
  offer: string;
  validUntil: string;
}): string {
  return emailShell(`
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:12px">${input.firstName}, your offer is ready</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#56524e;padding-bottom:20px">For your ${input.vehicle}:</td></tr>
<tr><td style="padding-bottom:20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#c8120c;border-radius:12px">
<tr><td align="center" style="padding:28px 16px">
<div style="color:#ffd9d6;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding-bottom:8px">Our offer</div>
<div style="color:#ffffff;font-size:38px;font-weight:bold">${input.offer}</div>
<div style="color:#ffd9d6;font-size:13px;padding-top:8px">Valid until ${input.validUntil}</div>
</td></tr></table>
</td></tr>
<tr><td style="padding-bottom:24px">${button(input.link, "View my offer")}</td></tr>
<tr><td style="font-size:14px;line-height:1.6;color:#56524e">
You'll see the marketplace listings we priced against, and you can accept or
decline from that page. There's no obligation either way.
</td></tr>`);
}

/** Keeps full numbers and addresses out of the logs. */
function mask(value: string): string {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}
