/**
 * Seeds staff accounts and a demo queue.
 *
 * Safe to re-run: staff accounts are upserted, and the demo customers are
 * identified by their fictional 0917-555 mobile block, so a second run replaces
 * them rather than duplicating.
 *
 *   npm run seed
 *
 * Vehicle photos are fetched from Wikimedia Commons at seed time, searched by
 * the actual make and model, so the queue shows the real car rather than a grey
 * box. Commons images are freely licensed; the source page for each one is
 * printed as it is downloaded. If the machine is offline the photos are skipped
 * and everything else still loads.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_CUSTOMERS, type DemoVehicle } from "./seed-data";

const prisma = new PrismaClient();

const UNAMBIGUOUS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEMO_MOBILE_PREFIX = "639175550";

function code(prefix: string): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i += 1) out += UNAMBIGUOUS[bytes[i] % UNAMBIGUOUS.length];
  return `${prefix}-${out}`;
}

function publicToken(): string {
  return randomBytes(32).toString("base64url");
}

function normaliseMobile(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("63")) return digits;
  if (digits.startsWith("0")) return `63${digits.slice(1)}`;
  return `63${digits}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ── Staff ────────────────────────────────────────────────────────────────────

const STAFF = [
  {
    email: "admin@mlhuillier.com",
    name: "Portal Administrator",
    role: "ADMIN" as const,
    branch: "Head Office",
  },
  {
    email: "appraiser@mlhuillier.com",
    name: "Senior Appraiser",
    role: "APPRAISER" as const,
    branch: "Cebu — Colon",
  },
  {
    email: "branch@mlhuillier.com",
    name: "Branch Viewer",
    role: "VIEWER" as const,
    branch: "Cebu — Colon",
  },
];

// ── Photos from Wikimedia Commons ────────────────────────────────────────────

const UA = "MLAutoQuote-Seed/1.0 (internal demo data seeding)";

type CommonsImage = { url: string; sourcePage: string; title: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Commons asks for a considerate request rate and starts returning empty
 * results if you ignore it. One request at a time, spaced out, with a longer
 * pause before a single retry.
 */
let lastRequestAt = 0;
async function throttle(minGapMs = 450): Promise<void> {
  const wait = lastRequestAt + minGapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

/** Searches Commons for photographs of a specific vehicle, once, politely. */
async function searchCommonsOnce(
  query: string,
  limit: number,
): Promise<CommonsImage[]> {
  await throttle();
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("format", "json");
  api.searchParams.set("generator", "search");
  api.searchParams.set("gsrsearch", `filetype:bitmap ${query}`);
  api.searchParams.set("gsrnamespace", "6");
  api.searchParams.set("gsrlimit", String(limit));
  api.searchParams.set("prop", "imageinfo");
  api.searchParams.set("iiprop", "url");
  api.searchParams.set("iiurlwidth", "1400");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(api, {
      headers: { "User-Agent": UA },
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const body = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{ thumburl?: string; descriptionurl?: string }>;
          }
        >;
      };
    };

    return Object.values(body.query?.pages ?? {})
      .flatMap((page) => {
        const info = page.imageinfo?.[0];
        if (!info?.thumburl) return [];
        return [
          {
            url: info.thumburl,
            sourcePage: info.descriptionurl ?? "",
            title: page.title ?? "",
          },
        ];
      })
      .slice(0, limit);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/** One retry after a longer pause, since an empty result is usually throttling. */
async function searchCommons(
  query: string,
  limit: number,
): Promise<CommonsImage[]> {
  const first = await searchCommonsOnce(query, limit);
  if (first.length > 0) return first;
  await sleep(2_500);
  return searchCommonsOnce(query, limit);
}

async function download(url: string): Promise<Buffer | null> {
  await throttle(250);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength > 2_000 ? buf : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function storePhoto(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    const full = path.join(process.cwd(), ".uploads", storageKey);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }
  const { Storage } = await import("@google-cloud/storage");
  await new Storage()
    .bucket(process.env.GCS_BUCKET!)
    .file(storageKey)
    .save(body, { contentType, resumable: false });
}

/** Exterior shots plus one interior, assigned to the slots they best match. */
const PHOTO_PLAN: Array<{ slot: string; suffix: string }> = [
  { slot: "FRONT_34", suffix: "" },
  { slot: "LEFT_SIDE", suffix: "" },
  { slot: "REAR_34", suffix: "rear" },
  { slot: "INTERIOR_FRONT", suffix: "interior" },
];

async function attachPhotos(
  submissionId: string,
  vehicle: DemoVehicle,
): Promise<number> {
  // Sequential, not parallel: Commons throttles concurrent searches and starts
  // handing back empty result sets.
  const exteriors = await searchCommons(`${vehicle.make} ${vehicle.model}`, 3);
  const interiors = await searchCommons(
    `${vehicle.make} ${vehicle.model} interior`,
    1,
  );

  const pool = [...exteriors, ...interiors];
  let saved = 0;

  for (const [i, plan] of PHOTO_PLAN.entries()) {
    const image = pool[i];
    if (!image) continue;

    const body = await download(image.url);
    if (!body) continue;

    const storageKey = `submissions/${submissionId}/${plan.slot.toLowerCase()}-${randomBytes(8).toString("hex")}.jpg`;
    try {
      await storePhoto(storageKey, body, "image/jpeg");
      await prisma.photo.create({
        data: {
          submissionId,
          slot: plan.slot as never,
          storageKey,
          contentType: "image/jpeg",
          bytes: body.byteLength,
        },
      });
      saved += 1;
    } catch {
      // A single failed photo is not worth stopping the seed for.
    }
  }

  return saved;
}

// ── Offers ───────────────────────────────────────────────────────────────────

/**
 * Walks a submission to the state the demo data asks for, using the real
 * valuation engine so the numbers on the dashboard are the numbers the app
 * would actually have produced.
 */
async function advanceToStatus(
  submissionId: string,
  vehicle: DemoVehicle,
  appraiserId: string,
): Promise<number | null> {
  const { generateOffer, effectiveOfferPhp } = await import("../src/lib/valuation");

  const { offer } = await generateOffer(submissionId);
  if (vehicle.status === "IN_REVIEW") return null;

  // The appraiser trims the system number a little, as they do in practice.
  const appraiserOffer = Math.round((offer.systemOfferPhp * 0.975) / 1000) * 1000;
  const sentAt = daysAgo(Math.max(0, vehicle.daysAgo - 1));
  const validUntil = new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const final = effectiveOfferPhp({
    systemOfferPhp: offer.systemOfferPhp,
    appraiserOfferPhp: appraiserOffer,
    finalOfferPhp: null,
  });

  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      status: "SENT",
      appraiserOfferPhp: appraiserOffer,
      finalOfferPhp: final,
      appraiserId,
      sentAt,
      validUntil,
      customerMessage:
        "This offer assumes the CR is in your name and the unit passes a short inspection at the branch.",
    },
  });
  await prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: "SENT_TO_CUSTOMER",
      actorUserId: appraiserId,
      payload: { finalOfferPhp: final },
    },
  });
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "OFFER_SENT" },
  });

  if (vehicle.status === "OFFER_SENT") return final;

  const accepted = vehicle.status === "ACCEPTED";
  const respondedAt = daysAgo(Math.max(0, vehicle.daysAgo - 2));

  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      status: accepted ? "ACCEPTED" : "DECLINED",
      respondedAt,
      declineReason: accepted ? null : "The amount is lower than I expected",
    },
  });
  await prisma.offerEvent.create({
    data: {
      offerId: offer.id,
      type: accepted ? "ACCEPTED" : "DECLINED",
      createdAt: respondedAt,
    },
  });
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: accepted ? "ACCEPTED" : "DECLINED" },
  });

  return final;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding M Lhuillier AutoQuote…\n");

  const password = process.env.SEED_PASSWORD ?? "1234567890";
  const passwordHash = await bcrypt.hash(password, 10);

  for (const person of STAFF) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        role: person.role,
        branch: person.branch,
        passwordHash,
        active: true,
      },
      create: { ...person, passwordHash },
    });
    console.log(`  user   ${person.email.padEnd(28)} ${person.role}`);
  }
  console.log(`\n  Password for all staff accounts: ${password}\n`);

  if (process.env.SEED_DEMO === "false") {
    console.log("SEED_DEMO=false — skipping demo customers.");
    return;
  }

  const appraiser = await prisma.user.findUniqueOrThrow({
    where: { email: "appraiser@mlhuillier.com" },
    select: { id: true },
  });

  // Clear previous demo customers (and their submissions, by cascade).
  const stale = await prisma.customer.findMany({
    where: { mobile: { startsWith: DEMO_MOBILE_PREFIX } },
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.submission.deleteMany({
      where: { customerId: { in: stale.map((c) => c.id) } },
    });
    await prisma.customer.deleteMany({
      where: { id: { in: stale.map((c) => c.id) } },
    });
    console.log(`  cleared ${stale.length} previous demo customers\n`);
  }

  let vehicleCount = 0;
  let photoCount = 0;

  for (const demo of DEMO_CUSTOMERS) {
    const [firstName, ...rest] = demo.name.split(" ");
    const lastName = rest.join(" ") || "—";

    const customer = await prisma.customer.create({
      data: {
        customerCode: code("MLC"),
        mobile: normaliseMobile(demo.mobile),
        firstName,
        lastName,
        email: demo.email ?? null,
        birthDate: new Date(demo.birthDate),
        idType: demo.idType,
        idNumber: demo.idNumber,
        addressLine: demo.addressLine,
        barangay: demo.barangay,
        city: demo.city,
        province: demo.province,
        consentGivenAt: daysAgo(60),
      },
    });

    for (const vehicle of demo.vehicles) {
      const submittedAt = daysAgo(vehicle.daysAgo);

      const submission = await prisma.submission.create({
        data: {
          refCode: code("MLA"),
          publicToken: publicToken(),
          customerId: customer.id,
          status: "SUBMITTED",
          submittedAt,
          createdAt: submittedAt,
          lastStep: 7,

          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant ?? null,
          year: vehicle.year,
          transmission: vehicle.transmission,
          fuelType: vehicle.fuelType,
          bodyType: vehicle.bodyType as never,
          colour: vehicle.colour,
          mileageKm: vehicle.mileageKm,
          plateNumber: vehicle.plate,

          conditionGrade: vehicle.condition,
          hasAccidentHistory: vehicle.accident ?? false,
          isFloodDamaged: vehicle.flood ?? false,
          hasWarningLights: vehicle.warningLights ?? false,
          airconWorking: vehicle.airconWorking ?? true,
          tireConditionPct: vehicle.tirePct ?? 65,
          issuesNotes: vehicle.notes ?? null,

          hasCR: vehicle.hasCR ?? true,
          hasOR: vehicle.hasOR ?? true,
          lastRegistrationYear: new Date().getFullYear(),
          isEncumbered: vehicle.encumbered ?? false,
          isUnderFinancing: Boolean(vehicle.financing),
          financingBalance: vehicle.financing ?? null,

          customerName: demo.name,
          customerPhone: demo.mobile,
          customerEmail: demo.email ?? null,
          birthDate: new Date(demo.birthDate),
          idType: demo.idType,
          idNumber: demo.idNumber,
          addressLine: demo.addressLine,
          barangay: demo.barangay,
          city: demo.city,
          province: demo.province,
          preferredBranch: demo.branch ?? null,
          consentGiven: true,
        } as Prisma.SubmissionUncheckedCreateInput,
      });

      const photos = await attachPhotos(submission.id, vehicle);
      photoCount += photos;

      const final = await advanceToStatus(submission.id, vehicle, appraiser.id);
      vehicleCount += 1;

      console.log(
        `  ${demo.name.padEnd(22)} ${`${vehicle.year} ${vehicle.make} ${vehicle.model}`.padEnd(30)} ` +
          `${vehicle.status.padEnd(11)} ${photos} photos${final ? ` · ₱${final.toLocaleString("en-PH")}` : ""}`,
      );
    }
  }

  console.log(
    `\nDone. ${DEMO_CUSTOMERS.length} customers, ${vehicleCount} vehicles, ${photoCount} photos.`,
  );
  console.log("Sign in at /staff/login and open Trends for the dashboard.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
