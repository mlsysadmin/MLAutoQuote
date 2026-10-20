# M Lhuillier AutoQuote System

A guided web platform for buying second-hand vehicles. Customers describe their
car and upload photos and papers; the system prices it against marketplace
listings and prepares an offer; an appraiser reviews, adjusts and releases that
offer to the customer.

**The offer never reaches the customer automatically.** The valuation engine
proposes; a person decides.

---

## How it works

```
Customer                      System                        Appraiser
────────                      ──────                        ─────────
1. 7-step wizard
   (autosaves, resumable)
2. Photos → straight to
   Cloud Storage
3. Submit  ─────────────────▶ Collects comparables
                              Trims outliers (1.5×IQR)
                              Reads low / mid / high
                              Applies vehicle adjustments
                              Creates offer PENDING_REVIEW ──▶ 4. Reviews photos,
                                                                 comparables and
                                                                 the breakdown
                                                              5. Adjusts the number
                              Offer status SENT ◀───────────── 6. Releases it
7. Gets an SMS with a link
8. Accepts or declines
```

## Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript     |
| Styling   | Tailwind CSS v4, system font stack (no webfont)   |
| Database  | MySQL 8 via Prisma — Cloud SQL in production      |
| Photos    | Cloud Storage, V4 signed direct uploads           |
| Auth      | Signed httpOnly JWT cookies (`jose`), bcrypt      |
| Hosting   | Cloud Run, standalone Docker image                |

---

## Running it locally

You need **Node 20+** and a **MySQL 8** database.

On Windows, with MySQL already installed, one script does the lot — it creates
the database and user, writes `.env`, applies the migration and seeds:

```powershell
.\scripts\setup-local-db.ps1
```

It asks for your MySQL root password and nothing else. If MySQL isn't running,
start it first (its Windows service, or `mysqld --defaults-file=...my.ini`).

By hand, on any platform:

```bash
npm install
cp .env.example .env            # then edit DATABASE_URL
npx prisma migrate deploy       # or `npm run db:push` for a throwaway database
npm run seed
npm run dev
```

Open <http://localhost:3000>.

| What                    | Where                                        |
| ----------------------- | -------------------------------------------- |
| Customer wizard         | `/sell`                                       |
| Customer offer / status | `/track/<token>` — or `/track` to look it up  |
| Appraisal queue         | `/staff`                                      |
| Customer registry       | `/staff/customers`                            |
| Browse by vehicle       | `/staff/vehicles`                             |
| Trends dashboard        | `/staff/dashboard`                            |
| Staff sign in           | `/staff/login`                                |

The seed creates three accounts, all with password `1234567890`
(override with `SEED_PASSWORD` — and change them before going live):

| Email                        | Role      | Can do                                  |
| ---------------------------- | --------- | --------------------------------------- |
| `admin@mlhuillier.com`       | ADMIN     | everything, plus user management        |
| `appraiser@mlhuillier.com`   | APPRAISER | review, adjust and release offers       |
| `branch@mlhuillier.com`      | VIEWER    | read the queue, registry and dashboard  |

It also loads **20 demo customers and 22 vehicles**, with photos fetched from
Wikimedia Commons by make and model, offers already priced by the real
valuation engine, and a spread of statuses so the dashboard has something to
show. Two customers have brought in more than one vehicle.

If Commons throttles the run and some vehicles come out without photos:

```bash
npm run photos:backfill
```

## Customers and KYC

Every submission creates or updates a **customer record**, keyed on the mobile
number in normalised form — so a seller who returns with a second car lands on
the same record instead of looking like a stranger. The wizard collects name,
mobile, email, date of birth, address and a government ID (type and number),
and the customer uploads a photo of that ID alongside the CR and OR.

The platform **records**; it does not verify. `/staff/customers` is the registry
— searchable by name, mobile, customer code or ID number, with a "Missing
details" filter for incomplete records. Each record shows every vehicle that
person has brought in, what we offered, and what they decided.

The `kycStatus`, `riskRating` and `verifiedBy` columns on `Customer` are
reserved for a verification workflow and are deliberately not surfaced yet.

## Seeing the trends

`/staff/dashboard` answers what is actually coming through the door: model-year
distribution, makes, body types, provinces, transmissions, where submissions
stand, and what we're paying against market mid. `/staff/vehicles` is the same
data from the other direction — pick a nameplate and see every unit of it with
the customer behind each.

With `STORAGE_DRIVER=local` (the default) photos are written to `./.uploads`
and served through an access-checked route — no Google Cloud account needed to
develop.

---

## Where the comparables come from

This is the part worth reading carefully.

The offer band is built from current asking prices for the same make, model and
year. Facebook does not permit automated scraping of Marketplace, and an
unlicensed scraper would be both a legal exposure and operationally fragile —
it breaks every time the page changes. So the platform does **not** scrape.
Instead, comparables arrive through a provider interface and you choose which
providers to switch on with `COMPARABLES_PROVIDERS`:

| Provider  | What it is                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `manual`  | Real listings entered by your team. Appraisers paste a link and a price in the portal — this is the live, defensible path, and it is on by default. |
| `partner` | A licensed market-data feed. Set `COMPARABLES_API_URL` and it becomes the primary source. See below.     |
| `seed`    | A local reference model built from SRP and depreciation curves per nameplate. Labelled **Reference estimate** everywhere it appears, and every row links to the live Marketplace search for that vehicle so an appraiser can verify in one click. It exists so the queue is never empty. |

All enabled providers are merged, outlier-trimmed together, and ranked as one
set, so a licensed feed and your team's own entries back the same number.

There is also a collector endpoint for whatever tool your ops team uses:

```http
POST /api/ingest/comparables
Authorization: Bearer $COMPARABLES_INGEST_TOKEN
Content-Type: application/json

{
  "refCode": "MLA-7K3QD2",
  "listings": [
    {
      "url": "https://www.facebook.com/marketplace/item/1234567890",
      "title": "2019 Toyota Vios E CVT",
      "pricePhp": 528000,
      "year": 2019,
      "mileageKm": 48000,
      "location": "Mandaue"
    }
  ]
}
```

Re-posting the same URL updates that row rather than duplicating it. Disabled
unless `COMPARABLES_INGEST_TOKEN` is set.

### Plugging in a live comparables feed

Point `COMPARABLES_API_URL` at an endpoint that answers:

```
GET <COMPARABLES_API_URL>?make=Toyota&model=Vios&year=2019&country=PH
Authorization: Bearer <COMPARABLES_API_KEY>

{ "listings": [ { "id", "title", "url", "pricePhp", "year", "mileageKm", "location", "imageUrl", "postedAt" } ] }
```

Only `title`, `url` and `pricePhp` are required. The call is given a 4-second
budget — a slow feed degrades to the other providers rather than holding up a
customer's submission.

---

## How the offer is calculated

1. **Collect** comparables from every enabled provider.
2. **Trim** outliers with the 1.5×IQR rule — the ₱35,000 parts car and the
   ₱2.4M typo come out of the maths but stay visible to the appraiser.
3. **Read the band**: lowest kept price, median, highest kept price. The "mid"
   row is the real listing nearest the median, so it has a link.
4. **Start** from `market mid × VALUATION_BUY_MARGIN` (0.82 by default).
5. **Adjust** for the specific unit — mileage against its age, declared
   condition, accident or flood history, warning lights, aircon, tires,
   missing CR or OR, lapsed registration, encumbrance, financing balance, and a
   reconditioning allowance.
6. **Guardrails**: never above 95% of the lowest live asking price (we have to
   resell against it), never below 40% of market mid.

Every line is stored on the offer and shown to the appraiser. The customer sees
the same lines minus internal risk pricing.

Tune the policy in [`src/lib/valuation/adjustments.ts`](src/lib/valuation/adjustments.ts)
and the margin with `VALUATION_BUY_MARGIN`.

---

## Speed

Customers abandon slow forms, so this was treated as a feature, not a tuning
pass:

- **No webfont.** The system font stack renders the real page on first paint.
- **Photos never touch the server.** The browser downscales to 1600px and
  re-encodes as WebP, then PUTs straight to Cloud Storage with a signed URL. A
  ten-photo submission drops from ~50 MB to under 3 MB.
- **Static landing page.** Zero client JavaScript, zero image requests.
- **Autosave with local mirror.** Answers survive a dropped connection or a
  closed tab; the wizard resumes where it left off.
- **Standalone Docker output** and `--cpu-boost` with `--min-instances=1` keep
  cold starts off the customer's path.
- **Signed read URLs are cached in-process**, so a 12-photo gallery doesn't
  cost 12 IAM round trips on every view.
- **One Prisma client per container**, so Cloud SQL connections don't pile up.

---

## Security and privacy

- Draft submissions are bound to the browser that created them by a signed
  httpOnly cookie — a submission id alone grants nothing.
- Customer offer links carry 32 bytes of entropy and are `noindex`.
- Lost-link recovery needs both the reference code *and* the registered mobile
  number, and answers identically whether or not a match exists.
- CR, OR and ID scans are stored in a private bucket with public access
  prevention and reached only through short-lived signed URLs.
- Staff passwords are bcrypt; login runs a constant-cost comparison even for
  unknown emails.
- Rate limiting on login, submission creation and link recovery.
- Every offer adjustment, release and customer response is written to
  `AuditLog` and `OfferEvent`.

---

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)**. The short version:

```powershell
.\scripts\deploy.ps1 -ProjectId your-gcp-project
```

---

## Project layout

```
prisma/schema.prisma          Data model
prisma/seed.ts                Staff accounts + demo customers and vehicles
prisma/seed-data.ts           The demo customers themselves
src/lib/kyc.ts                Customer records, mobile normalisation, dedupe
src/app/page.tsx              Landing page (static)
src/app/sell/                 Customer wizard
src/app/track/                Customer status + offer
src/app/staff/                Appraiser portal, registry, vehicles, dashboard
src/components/staff/Charts.tsx   Dashboard charts
src/app/api/                  Route handlers
src/components/wizard/        The seven wizard steps
src/components/staff/         Offer editor, comparables, gallery
src/lib/valuation/            Band maths, adjustments, providers
src/lib/storage.ts            Signed uploads, GCS and local drivers
scripts/setup-local-db.ps1    Create the dev database, migrate and seed
scripts/deploy.ps1            One-command Cloud Run setup + deploy
scripts/create-user.ps1       Create a staff account on the live database
```

## Scripts

| Command              | What it does                                     |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Development server                               |
| `npm run build`      | Prisma generate + production build               |
| `npm run setup`      | Generate, push schema and seed in one go         |
| `npm run seed`       | Staff accounts, 20 demo customers and their cars  |
| `npm run photos:backfill` | Fill in any vehicle photos the seed missed   |
| `npm test`           | Valuation tests — band maths and adjustments     |
| `npm run migrate:dev`| Create a migration from schema changes           |
| `npm run typecheck`  | TypeScript, no emit                              |
| `npm run lint`       | ESLint                                           |

The pricing logic has real coverage, because it is the part that decides how
much money changes hands: outlier trimming, the low/mid/high read, every
adjustment line, and the arithmetic that the customer-facing breakdown has to
add up to. `npm test` needs no database.

### Migrations

`prisma/migrations/0_init` is the initial schema, and the container applies
pending migrations on start. After changing `schema.prisma`:

```bash
npm run migrate:dev -- --name describe_your_change
```

---

## Search and the public pages

Without the value guides this site has one indexable page, so there is nothing
to rank for. `/value` generates a page per make and per model — 272 static
pages — each answering a question people actually type ("what is a 2019 Toyota
Fortuner worth") with a year-by-year table derived from the same reference
model the valuation engine uses.

Guides are limited to nameplates still sold or discontinued within ten years.
A few hundred near-identical pages is how a site earns a thin-content problem
rather than traffic.

Also in place: `metadataBase` with canonical URLs, Open Graph and Twitter
cards, JSON-LD for `AutoDealer`, `WebSite`, `FAQPage`, `BreadcrumbList` and a
`WebPage`/`Car` pair per guide, and a sitemap covering all 274 URLs.

> **The public origin must be passed at build time.** Canonical and Open Graph
> URLs on statically rendered pages are fixed when the image is built, so pass
> `--build-arg NEXT_PUBLIC_APP_URL=https://your-domain`. `robots.txt` and the
> sitemap read `APP_URL` at runtime instead, so those are right immediately.
> `scripts/deploy.ps1` handles both; see PACKAGE.md.

## Cross-selling

`CrossSell` places M Lhuillier's other products where the customer's situation
makes them useful — never inside the wizard, where an interruption costs more
in abandoned submissions than it could return. A declined offer leaves someone
with the problem that brought them here, so that placement gets the prominent
treatment and leads with the pawnshop product; an accepted one gets a quiet
footer. Every tile deep-links to the live product page with a UTM so the web
team can attribute it.

## Brand

Taken from mlhuillier.com as it is built today: **Poppins** throughout, vivid
red `#FA0000` for the word that carries the message, orange `#FF5F00` for the
one action we want taken, charcoal `#333` for every other action, sections
alternating white and `#F5F5F5`, pill buttons and 20px cards resting on
`0 4px 12px rgb(0 0 0 / .08)`.

Orange is reserved for the primary call to action, which is always large —
white on `#FF5F00` clears the 3:1 bar for large text but not the 4.5:1 that
body-sized text needs. That constraint is enforced in
[`button-styles.ts`](src/components/ui/button-styles.ts): the `cta` variant is
orange, everything smaller is charcoal.

All of it lives as tokens at the top of
[`src/app/globals.css`](src/app/globals.css). The wordmark in
[`src/components/ui/Logo.tsx`](src/components/ui/Logo.tsx) is drawn as text
plus one inline diamond — the official SVG is a 45 KB bitmap in a wrapper,
which would cost more to load than the rest of the page.
