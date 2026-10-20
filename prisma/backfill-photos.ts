/**
 * Fills in vehicle photos for any submission that has none.
 *
 *   npm run photos:backfill
 *
 * The seed fetches photos from Wikimedia Commons as it goes, and Commons
 * occasionally throttles a long run and hands back empty results. Rather than
 * re-seeding everything, this picks up only what was missed. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const UA = "MLAutoQuote-Backfill/1.0 (internal demo data seeding)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SLOTS = ["FRONT_34", "LEFT_SIDE", "REAR_34", "INTERIOR_FRONT"] as const;

type CommonsImage = { url: string; sourcePage: string };

async function search(query: string, limit: number): Promise<CommonsImage[]> {
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

  try {
    const res = await fetch(api, { headers: { "User-Agent": UA } });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          { imageinfo?: Array<{ thumburl?: string; descriptionurl?: string }> }
        >;
      };
    };
    return Object.values(body.query?.pages ?? {}).flatMap((p) => {
      const info = p.imageinfo?.[0];
      return info?.thumburl
        ? [{ url: info.thumburl, sourcePage: info.descriptionurl ?? "" }]
        : [];
    });
  } catch {
    return [];
  }
}

async function store(key: string, body: Buffer): Promise<void> {
  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    const full = path.join(process.cwd(), ".uploads", key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }
  const { Storage } = await import("@google-cloud/storage");
  await new Storage()
    .bucket(process.env.GCS_BUCKET!)
    .file(key)
    .save(body, { contentType: "image/jpeg", resumable: false });
}

async function main() {
  const empty = await prisma.submission.findMany({
    where: { photos: { none: {} }, make: { not: null }, model: { not: null } },
    select: { id: true, make: true, model: true, year: true },
  });

  if (empty.length === 0) {
    console.log("Every submission already has photos.");
    return;
  }

  console.log(`Backfilling ${empty.length} submission(s)…\n`);
  let total = 0;

  for (const s of empty) {
    // Several phrasings, because Commons indexes nameplates inconsistently —
    // "Mazda Mazda3" finds nothing while "Mazda 3" does.
    const queries = [
      `${s.make} ${s.model}`,
      `${s.make} ${s.model!.replace(/([a-zA-Z])(\d)/, "$1 $2")}`,
      `${s.make} ${s.model} car`,
      String(s.make),
    ];

    let pool: CommonsImage[] = [];
    for (const q of queries) {
      pool = await search(q, 4);
      await sleep(900);
      if (pool.length >= 2) break;
    }

    let saved = 0;
    for (const [i, slot] of SLOTS.entries()) {
      const image = pool[i];
      if (!image) continue;
      try {
        const res = await fetch(image.url, { headers: { "User-Agent": UA } });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength < 2_000) continue;

        const key = `submissions/${s.id}/${slot.toLowerCase()}-${randomBytes(8).toString("hex")}.jpg`;
        await store(key, buf);
        await prisma.photo.create({
          data: {
            submissionId: s.id,
            slot: slot as never,
            storageKey: key,
            contentType: "image/jpeg",
            bytes: buf.byteLength,
          },
        });
        saved += 1;
        await sleep(300);
      } catch {
        // Skip this one and carry on.
      }
    }

    total += saved;
    console.log(
      `  ${`${s.year} ${s.make} ${s.model}`.padEnd(32)} ${saved} photos`,
    );
  }

  console.log(`\nAdded ${total} photos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
