# M Lhuillier AutoQuote — Cloud Run deployment package

Everything needed to build and deploy the platform to Google Cloud Run.
Nothing in here is secret: no `.env`, no keys, no database contents.

**Packaged:** 20 October 2026

---

## The container never waits on the database

Cloud Run gives a new revision a limited window to start listening on `$PORT`.
Running `prisma migrate deploy` before the server means a cold Cloud SQL
instance, an unready connector or a bad password stops the revision from ever
starting — and Cloud Run reports that as a port error, not a database one.

So this image **starts the server first, always**:

- The service is deployed with `SKIP_MIGRATIONS=true`, and the entrypoint never
  touches the database before `exec`.
- `GET /api/health` is a pure liveness check — it does not query the database,
  so point Cloud Run's startup and liveness probes here.
- `GET /api/health/ready` is the deep check: database reachable, schema applied.
  Point monitoring here, never a startup probe.
- The schema is applied by a one-off **Cloud Run Job** (`scripts/migrate-job.ps1`),
  which runs once per deploy instead of once per container instance.

Verified with the database switched off entirely — the server was ready in 0 ms
and every public page still served:

| Route (database unreachable) | Result |
| --- | --- |
| `/`, `/value`, `/value/toyota/fortuner` | 200 |
| `/sell`, `/track`, `/staff/login` | 200 |
| `/robots.txt`, `/sitemap.xml` | 200 |
| `/api/health` | 200 `{"status":"ok"}` |
| `/api/health/ready` | 503 `{"database":"unreachable"}` |

## What was verified before packaging

| Check | Result |
| --- | --- |
| TypeScript (`tsc --noEmit`) | clean |
| ESLint | clean |
| Valuation tests (`npm test`) | 23 passed |
| Production build | compiled successfully, 279 pages |
| Boot with no database | ready in 0 ms, all public routes 200 |
| Entrypoint, all three modes | server starts before any migration attempt |
| Build from a clean extraction | `npm ci` → `prisma generate` → `next build` |
| Static page response time | 15–20 ms |

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

Two equivalent scripts — use whichever matches the machine.

**Linux, macOS, WSL, or Cloud Shell:**

```bash
./scripts/deploy.sh --project YOUR_PROJECT_ID
```

Cloud Shell is the path of least resistance: open
<https://console.cloud.google.com>, click the terminal icon, upload this
package, and run it. Nothing to install — `gcloud`, `openssl` and
`cloud-sql-proxy` are all already there.

**Windows PowerShell:**

```powershell
.\scripts\deploy.ps1 -ProjectId YOUR_PROJECT_ID
```

Idempotent — run it for the first deploy and every deploy after. It enables the
APIs, creates the Artifact Registry repo, the service account and its four IAM
roles, the Cloud SQL MySQL instance, the photo bucket with CORS, the secrets,
then builds and deploys and points `NEXT_PUBLIC_APP_URL` at the result.

The Cloud SQL instance alone takes 5–10 minutes the first time.

It also grants **Cloud Build** `run.admin` and `iam.serviceAccountUser`, so the
manual `cloudbuild.yaml` path below works too. Without those, a build that
deploys from Cloud Build fails with a permissions error that reads as though
the runtime service account were missing.

Later deploys skip the infrastructure:

```bash
./scripts/deploy.sh --project YOUR_PROJECT_ID --skip-infra
# or
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
gcloud sql users create autoquote --instance=ml-autoquote-db --password='1234567890'

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

# 8 — build and deploy (SKIP_MIGRATIONS=true is set by this config)
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-southeast1,_SERVICE=ml-autoquote,_INSTANCE=PROJECT:asia-southeast1:ml-autoquote-db

# 9 — apply the schema, once, as a job
gcloud run jobs create ml-autoquote-migrate \
  --image=$(gcloud run services describe ml-autoquote --region=asia-southeast1 --format='value(spec.template.spec.containers[0].image)') \
  --region=asia-southeast1 \
  --service-account=ml-autoquote@PROJECT.iam.gserviceaccount.com \
  --set-cloudsql-instances=PROJECT:asia-southeast1:ml-autoquote-db \
  --set-secrets=DATABASE_URL=autoquote-database-url:latest \
  --command=node_modules/.bin/prisma --args=migrate,deploy \
  --max-retries=1 --task-timeout=10m
gcloud run jobs execute ml-autoquote-migrate --region=asia-southeast1 --wait
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

**Apply the schema.** `deploy.ps1` does this for you at the end of every run,
but if you deployed by hand, or a migration failed, run it on its own:

```powershell
./scripts/migrate-job.sh --project YOUR_PROJECT_ID
```

```powershell
.\scripts\migrate-job.ps1 -ProjectId YOUR_PROJECT_ID
```

It creates a Cloud Run Job from the image the service is already running, with
the same Cloud SQL connection and secret, runs `prisma migrate deploy` once,
and waits. Safe to re-run — only pending migrations are applied.

Check it landed:

```bash
curl https://YOUR-SERVICE-URL/api/health/ready
# {"status":"ready","database":"reachable","migrations":"applied"}
```

If that returns `"migrations":"missing"`, the app is up but the schema was
never applied — run the job above.

**Create a staff account** — nobody can sign in until you do. Needs the
[Cloud SQL Auth Proxy](https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases)
on your PATH:

```powershell
./scripts/create-user.sh --project YOUR_PROJECT_ID \
  --email you@mlhuillier.com --name "Your Name" --role ADMIN
```

```powershell
.\scripts\create-user.ps1 -ProjectId YOUR_PROJECT_ID `
  -Email you@mlhuillier.com -Name "Your Name" -Role ADMIN
```

The account gets the development password `1234567890`; pass `-Password` (or
`--password`) to set a real one before the account leaves the team. Repeat with
`-Role APPRAISER` per appraiser.

**Turn on SMS** — offers are useless if nobody hears about them:

```bash
gcloud run services update ml-autoquote --region=asia-southeast1 \
  --update-env-vars="SMS_WEBHOOK_URL=https://your-gateway/send"
```

Until then messages go to Cloud Logging, so you can run the whole flow and read
what *would* have been sent.

**Check it's alive:**

```bash
curl https://YOUR-SERVICE-URL/api/health        # process up (no DB touched)
curl https://YOUR-SERVICE-URL/api/health/ready  # DB reachable, schema applied
```

Point Cloud Run's startup and liveness probes at `/api/health`, and monitoring
at `/api/health/ready`.

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
| `SKIP_MIGRATIONS` | | `true` on the service — never let startup touch the DB |
| `MIGRATE_ON_START` | | `true` runs migrations in the background after the server starts. Off by default; prefer the job. |
| `APP_URL` | | public origin, read at runtime by robots.txt and the sitemap |

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
scripts/deploy.sh          one-command setup and deploy (Linux/macOS/Cloud Shell)
scripts/deploy.ps1         the same, for Windows PowerShell
scripts/migrate-job.sh     apply migrations as a one-off Cloud Run Job
scripts/migrate-job.ps1    the same, for Windows PowerShell
scripts/create-user.sh     create a staff account on the live database
scripts/create-user.ps1    the same, for Windows PowerShell
scripts/setup-local-db.ps1 local development database
cloudbuild-image.yaml      image-only build, so the origin can be a build arg
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
