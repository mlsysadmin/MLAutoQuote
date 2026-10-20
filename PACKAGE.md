# M Lhuillier AutoQuote — Cloud Run deployment package

Everything needed to build and deploy the platform to Google Cloud Run.
Nothing in here is secret: no `.env`, no keys, no database contents.

**Packaged:** 20 October 2026

---

## What was verified before packaging

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | clean |
| ESLint | clean |
| Valuation tests (`npm test`) | 23 passed |
| Production build | compiled successfully, 33 routes |
| Standalone server boot | ready, serving on first request |
| `GET /api/health` against MySQL 8.4 | `{"status":"ok"}` in 64 ms |
| Landing page | HTTP 200 in 22 ms, 46 KB |
| `/staff` without a session | 307 → `/staff/login` |
| `robots.txt` | staff, track, sell and api all disallowed |

The standalone bundle is ~220 MB before compression, most of it the Prisma
query engine and the Cloud Storage client.

---

## Before you start

1. A **Google Cloud project** with billing enabled.
2. The **gcloud CLI** — <https://cloud.google.com/sdk> — then:
   ```bash
   gcloud auth login
   ```

You do **not** need Docker. Cloud Build builds the image for you.

---

## The one-command deploy

From the unzipped folder, in PowerShell:

```powershell
.\scripts\deploy.ps1 -ProjectId YOUR_PROJECT_ID
```

Idempotent — run it for the first deploy and every deploy after. It enables the
APIs, creates the Artifact Registry repo, the service account and its four IAM
roles, the Cloud SQL MySQL instance, the photo bucket with CORS, the secrets,
then builds and deploys and points `NEXT_PUBLIC_APP_URL` at the result.

The Cloud SQL instance alone takes 5–10 minutes the first time.

Later deploys skip the infrastructure:

```powershell
.\scripts\deploy.ps1 -ProjectId YOUR_PROJECT_ID -SkipInfra
```

---

## The same thing by hand

Replace `PROJECT`, and keep the region consistent.

```bash
# 1 — project and APIs
gcloud config set project PROJECT
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com iamcredentials.googleapis.com

# 2 — Cloud SQL (MySQL 8), 5-10 minutes
gcloud sql instances create ml-autoquote-db \
  --database-version=MYSQL_8_0 --tier=db-g1-small \
  --region=asia-southeast1 --storage-auto-increase --backup-start-time=18:00
gcloud sql databases create ml_autoquote --instance=ml-autoquote-db \
  --charset=utf8mb4 --collation=utf8mb4_unicode_ci
gcloud sql users create autoquote --instance=ml-autoquote-db --password='STRONG_PASSWORD'

# 3 — photo bucket (private; browsers reach objects only via signed URLs)
gcloud storage buckets create gs://PROJECT-autoquote-photos \
  --location=asia-southeast1 --uniform-bucket-level-access --public-access-prevention

# 4 — CORS, so the browser can PUT photos straight to the bucket
cat > cors.json <<'JSON'
[{"origin":["*"],"method":["PUT","GET","HEAD"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
JSON
gcloud storage buckets update gs://PROJECT-autoquote-photos --cors-file=cors.json

# 5 — Artifact Registry
gcloud artifacts repositories create ml-autoquote \
  --repository-format=docker --location=asia-southeast1

# 6 — runtime service account and its roles
gcloud iam service-accounts create ml-autoquote --display-name="AutoQuote runtime"
for ROLE in roles/cloudsql.client roles/secretmanager.secretAccessor \
            roles/storage.objectAdmin roles/iam.serviceAccountTokenCreator; do
  gcloud projects add-iam-policy-binding PROJECT \
    --member="serviceAccount:ml-autoquote@PROJECT.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None
done

# 7 — secrets
openssl rand -base64 48 | gcloud secrets create autoquote-session-secret --data-file=-
printf 'mysql://autoquote:STRONG_PASSWORD@localhost/ml_autoquote?socket=/cloudsql/PROJECT:asia-southeast1:ml-autoquote-db' \
  | gcloud secrets create autoquote-database-url --data-file=-

# 8 — build and deploy
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-southeast1,_SERVICE=ml-autoquote,_INSTANCE=PROJECT:asia-southeast1:ml-autoquote-db
```

If the password contains `@`, `/`, `:` or `#`, percent-encode it inside
`DATABASE_URL`.

Then point the app at its own URL:

```bash
URL=$(gcloud run services describe ml-autoquote --region=asia-southeast1 --format='value(status.url)')
gcloud run services update ml-autoquote --region=asia-southeast1 \
  --update-env-vars="NEXT_PUBLIC_APP_URL=$URL"
echo "$URL"
```

Database migrations run automatically on container start, so the schema is
created on that first deploy. Both migrations ship in `prisma/migrations/`.

---

## After the first deploy

**Create a staff account** — nobody can sign in until you do. Needs the
[Cloud SQL Auth Proxy](https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases)
on your PATH:

```powershell
.\scripts\create-user.ps1 -ProjectId YOUR_PROJECT_ID `
  -Email you@mlhuillier.com -Name "Your Name" -Role ADMIN
```

It prints a generated password once. Repeat with `-Role APPRAISER` per appraiser.

**Turn on SMS** — offers are useless if nobody hears about them:

```bash
gcloud run services update ml-autoquote --region=asia-southeast1 \
  --update-env-vars="SMS_WEBHOOK_URL=https://your-gateway/send"
```

Until then messages go to Cloud Logging, so you can run the whole flow and read
what *would* have been sent.

**Check it's alive:**

```bash
curl https://YOUR-SERVICE-URL/api/health
```

---

## Runtime configuration

| Variable | Secret | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `mysql://user:pass@localhost/db?socket=/cloudsql/CONN` |
| `SESSION_SECRET` | yes | 32+ random chars; rotating it signs everyone out |
| `NEXT_PUBLIC_APP_URL` | | public URL, used to build customer offer links |
| `STORAGE_DRIVER` | | `gcs` in production |
| `GCS_BUCKET` | | photo bucket name |
| `GCS_SIGNER_EMAIL` | | runtime service account, for signing upload URLs |
| `COMPARABLES_PROVIDERS` | | `manual,seed`; add `partner` with a licensed feed |
| `COMPARABLES_API_URL` / `_KEY` | key | licensed market-data feed |
| `COMPARABLES_INGEST_TOKEN` | yes | enables `POST /api/ingest/comparables` |
| `VALUATION_BUY_MARGIN` | | share of market mid to start from (`0.82`) |
| `OFFER_VALIDITY_DAYS` | | `7` |
| `SMS_WEBHOOK_URL` / `_TOKEN` | token | SMS gateway |
| `EMAIL_WEBHOOK_URL` / `_TOKEN` | token | email gateway |

Service settings the deploy script applies: `--min-instances=1`, `--cpu-boost`,
`--concurrency=80`, `--max-instances=20`, `1 CPU / 1 GiB`, 60 s timeout.
Dropping `--min-instances` to 0 saves roughly US$15/month and puts a 2–4 second
cold start in front of whichever customer arrives first.

---

## What is in the archive

```
Dockerfile                 multi-stage build, standalone output
docker-entrypoint.sh       applies pending migrations, then starts the server
cloudbuild.yaml            Cloud Build pipeline with layer caching
.dockerignore
prisma/schema.prisma       data model
prisma/migrations/         0_init, add_customer_kyc
prisma/seed.ts             staff accounts + 20 demo customers
prisma/seed-data.ts        the demo customers
prisma/backfill-photos.ts  fills vehicle photos the seed missed
src/                       application source
public/                    static assets and the brand slot
scripts/deploy.ps1         one-command setup and deploy
scripts/create-user.ps1    create a staff account on the live database
scripts/setup-local-db.ps1 local development database
scripts/create-user.mjs
README.md                  how the platform works
DEPLOYMENT.md              the long-form deployment guide
PACKAGE.md                 this file
.env.example               every setting, documented
```

**Not included, by design:** `.env`, `node_modules/`, `.next/`, `.uploads/`,
any database contents, and any credential. Nothing here needs protecting beyond
normal source control.

---

## Seeding demo data in the cloud (optional)

Only for a demo or staging service — it writes 20 fictional customers.

```powershell
# with the Cloud SQL proxy running on 3307
$env:DATABASE_URL = "mysql://autoquote:PASSWORD@127.0.0.1:3307/ml_autoquote"
npm install
npm run seed
```

Leave it out of production: `SEED_DEMO=false npm run seed` creates the staff
accounts only.

> The seeded staff password is `1234567890`. Change it before the service is
> reachable from the internet — `scripts/create-user.ps1` generates a strong one.
