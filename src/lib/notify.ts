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
      ? sendEmail(submission.customerEmail, "Your M Lhuillier offer is ready", sms)
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
    body: JSON.stringify({ to, subject, text: body }),
  });
  if (!res.ok) throw new Error(`email gateway ${res.status}`);
}

/** Keeps full numbers and addresses out of the logs. */
function mask(value: string): string {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}
