# Architecture

How AutoQuote is put together, and why. Written for whoever picks this up
next — including the decisions that look odd without their reasoning.

---

## The shape of it

One Next.js application, one MySQL database, one object store.

```
                 ┌──────────── Cloud Run ─────────────┐
   customer ───▶ │  Next.js (App Router, standalone)  │
   appraiser ──▶ │   pages · route handlers · engine  │
                 └──────┬──────────────────┬──────────┘
                        │                  │
                 Cloud SQL (MySQL)   Cloud Storage
                 submissions,        CR / OR / ID
                 offers, customers,  and vehicle photos
                 users, audit
```

No queue, no cache tier, no microservices. The whole workload is one appraisal
at a time, and every one of those would be a part that can fail
independently.

---

## The one rule the design serves

**The valuation engine proposes; a person decides.**

`generateOffer()` always writes `PENDING_REVIEW`. The only path to a customer
is `POST /api/staff/offers/[id]/send`, which requires a signed-in appraiser.
There is no automatic path, no scheduled job, no override — the capability
does not exist in the code.

Everything else bends around that: the offer has versions rather than being
edited in place, every adjustment is attributed, and sending is a deliberate,
confirmed act.

---

## Request flow

### Customer

1. **Wizard** (`/sell`) — a client component holding a draft in React state,
   mirrored to `localStorage` and autosaved to the server on a debounce.
   The server row is created on the first *meaningful* input, not page load,
   so bouncing visitors leave no rows.
2. **Photos** — the browser downscales to 1600px, re-encodes as WebP, and
   `PUT`s straight to Cloud Storage with a signed URL. A ten-photo submission
   drops from ~50 MB to under 3 MB and never passes through the server.
3. **Submit** — validates completeness, upserts the customer record, runs the
   valuation, sends a confirmation. A valuation failure does **not** reject the
   submission; it lands in the queue for manual pricing.
4. **Track** (`/track/<token>`) — status, then the offer.

### Appraiser

1. **Queue** → **submission detail**: photos, comparables, the offer editor.
2. Adjust, recalculate, release.

---

## The valuation engine

`src/lib/valuation/`, four parts that stay separate on purpose:

| Part | Does | Pure? |
| --- | --- | --- |
| `providers/` | Where comparable listings come from | No — network, database |
| `stats.ts` | Outlier trimming, the low/mid/high band | **Yes** |
| `adjustments.ts` | Per-vehicle lines | **Yes** |
| `index.ts` | Orchestrates, persists, versions | No |

The two pure modules are where the money is decided, which is why they carry
the tests: they can be exercised without a database, a network or a browser.

### Comparables are never scraped

Facebook prohibits automated scraping of Marketplace. A scraper would be a
legal exposure and would break on every page change. So listings arrive
through a provider interface instead:

- `manual` — real listings entered by staff, or posted to the ingest endpoint
- `partner` — a licensed market-data feed
- `seed` — a local SRP-and-depreciation model, always labelled **Reference
  estimate**, whose links open the live Marketplace *search* so an appraiser
  can verify in one click

All enabled providers merge into one set and are trimmed together.

### Why the band is recomputed for display

The offer stores the band it was priced against. The submission page shows the
band computed **live** from whatever is currently included, so excluding a
listing moves the numbers immediately — and an amber nudge appears when the
live band has drifted from the saved one. Showing a frozen band beside a table
the appraiser is actively editing is how people lose trust in a screen.

---

## Data model

```
Customer ──< Submission ──< Photo
                 │    └──< Comparable
                 └──< Offer ──< OfferEvent
User ──< Offer (appraiser)
User ──< AuditLog
```

**Money is `Int`, in whole pesos.** Used-car prices are never quoted in
centavos, and integers keep arithmetic exact and JSON cheap. No floats
anywhere near a price.

**Offers version rather than mutate.** Recalculating supersedes the previous
version and keeps it. What an appraiser saw when they decided stays readable.

**Accounts deactivate rather than delete.** An appraiser's name is on the
offers they released; those have to stay attributable.

---

## Deliberate decisions

**No webfont.** The system font stack renders the real page on first paint.
On mobile data in the provinces that is worth more than any typeface.

**Photos never touch the server.** Signed direct upload. The biggest single
win for upload speed, and it keeps Cloud Run instances from moving bytes.

**Signed read URLs cached in-process.** On Cloud Run each signature is an IAM
round trip; a twelve-photo gallery would otherwise cost twelve.

**One Prisma client per container.** Cloud Run reuses instances and `next dev`
reloads modules; either would otherwise open a new pool each time and exhaust
Cloud SQL's connection limit.

**Migrations do not run at container start.** Cloud Run gives a revision a
limited window to listen on `$PORT`; a cold database inside that window fails
the deploy with a confusing port error. The server starts first, and
`scripts/migrate-job.*` applies migrations as a one-off Cloud Run Job — once
per deploy rather than once per instance.

**Rate limiting is in-process.** Costs nothing, adds no dependency, and Cloud
Run's concurrency caps the blast radius. Documented as a limitation in
[SECURITY.md](SECURITY.md).

---

## Conventions

- `src/lib/` is logic, `src/components/` is presentation, `src/app/` routes.
- Anything touching secrets or the database imports `server-only`.
- Validation lives in `src/lib/validation.ts` and runs on the **server**;
  client checks are a courtesy, never the boundary.
- A rule enforced in two places lives in one function imported by both — e.g.
  `requiresJustification()`, so the form and the API cannot disagree.
- Comments explain *why*. What the code does is readable from the code.

---

## Testing

`npm test` — no database, no network, runs anywhere. It covers the band
maths, the adjustment lines, peso formatting and parsing, the justification
rule, and the guard that keeps blank passwords out of production.

Not covered: the browser flows, the extraction providers (no credentials), and
anything needing Cloud SQL. Those are exercised by hand; see the QA notes in
[README.md](README.md).

---

## Where to start reading

| To understand | Read |
| --- | --- |
| How a price is decided | `src/lib/valuation/index.ts`, then `adjustments.ts` |
| What an appraiser does | `src/components/staff/OfferEditor.tsx` |
| What a customer does | `src/components/wizard/Wizard.tsx` |
| The data | `prisma/schema.prisma` |
| Shipping it | [DEPLOYMENT.md](DEPLOYMENT.md), [PACKAGE.md](PACKAGE.md) |
| How it's protected | [SECURITY.md](SECURITY.md) |
