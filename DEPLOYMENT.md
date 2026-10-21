# Going live on Google Cloud Run

This app is packaged as a Docker container and runs on Cloud Run with a Cloud
SQL (MySQL) database and a Cloud Storage bucket for photos.

You don't need to know how to code to follow this, but you do need a Google
account with billing enabled, and about 30–45 minutes the first time. Some
steps create real cloud resources that cost money — see
[What it costs](#what-it-costs) at the bottom.

---

## What you'll need

1. **A Google Cloud project** at [console.cloud.google.com](https://console.cloud.google.com), with billing enabled.
2. **The `gcloud` CLI** — [cloud.google.com/sdk](https://cloud.google.com/sdk).
   Install it, then run:
   ```powershell
   gcloud auth login
   ```

That's it. You do **not** need Docker installed — Cloud Build builds the image
for you.

---

## The one-command way

From the project folder, in PowerShell:

```powershell
.\scripts\deploy.ps1 -ProjectId your-gcp-project-id
```

The script is idempotent — it checks what already exists before creating
anything, so you run the same command for the first deploy and every deploy
after. It will:

1. Enable the APIs (Run, Cloud SQL, Artifact Registry, Cloud Build, Secret
   Manager, Storage, IAM Credentials).
2. Create the Artifact Registry repository for container images.
3. Create the `ml-autoquote` service account and grant it exactly four roles:
   Cloud SQL Client, Secret Accessor, Storage Object Admin, Service Account
   Token Creator (the last one is what lets it sign photo upload URLs).
4. Create the **Cloud SQL MySQL 8.0** instance, the database and an application
   user. *This step alone takes 5–10 minutes.* The user gets the house password
   `1234567890`; pass `-DbPassword` to set your own. What keeps the instance
   closed is that it has no public IP and Cloud Run reaches it over the Cloud
   SQL socket, which needs the `roles/cloudsql.client` grant — so if you ever
   give it a public IP or an authorised network, set a real password first.
5. Create the **photo bucket** with uniform access and public access
   prevention, and set the CORS rules the browser needs to upload directly.
6. Generate `SESSION_SECRET` and `DATABASE_URL` and store them in **Secret
   Manager** — they are never written to disk or passed on a command line.
7. Build the image with Cloud Build and **deploy to Cloud Run**.
8. Set `NEXT_PUBLIC_APP_URL` to the service's own URL, so customer offer links
   point at the right place.

When it finishes it prints your two URLs:

```
Customer site: https://ml-autoquote-xxxxx-as.a.run.app
Staff portal:  https://ml-autoquote-xxxxx-as.a.run.app/staff/login
```

The service runs with `SKIP_MIGRATIONS=true` so the container never waits on
the database to start listening — a cold Cloud SQL instance would otherwise
stop the revision from going live, and Cloud Run would report it as a port
error. The schema is applied separately, as a one-off Cloud Run Job, which
`deploy.ps1` runs for you at the end.

### Later deploys

```powershell
.\scripts\deploy.ps1 -ProjectId your-gcp-project-id -SkipInfra
```

### Useful switches

| Switch         | Default            | Why you'd change it                        |
| -------------- | ------------------ | ------------------------------------------ |
| `-Region`      | `asia-southeast1`  | Singapore — lowest latency from the PH.    |
| `-SqlTier`     | `db-g1-small`      | `db-f1-micro` to save money while piloting; larger for real traffic. |
| `-Service`     | `ml-autoquote`     | If you want a staging service alongside.   |
| `-Bucket`      | `<project>-autoquote-photos` | An existing bucket.              |

---

## Create your first staff account

Nobody can sign in until you make an account. You need the **Cloud SQL Auth
Proxy** — download the Windows binary from
[the releases page](https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases)
and put it somewhere on your PATH. Then:

```powershell
.\scripts\create-user.ps1 -ProjectId your-gcp-project-id `
  -Email you@mlhuillier.com -Name "Your Name" -Role ADMIN
```

It opens a tunnel, creates the account and closes the tunnel again. Repeat for
each appraiser with `-Role APPRAISER`.

The account is created with the development password `1234567890` and the
script says so. **Set a real one before anyone outside the team signs in** — a
staff account can release offers and open customers' CR, OR and ID scans:

```powershell
.\scripts\create-user.ps1 -ProjectId your-gcp-project-id `
  -Email them@mlhuillier.com -Name "Their Name" -Role APPRAISER `
  -Password 'something only they know'
```

Roles:

| Role        | Can do                                                    |
| ----------- | --------------------------------------------------------- |
| `ADMIN`     | Everything an appraiser can, plus user management          |
| `APPRAISER` | Review submissions, adjust offers, release them            |
| `VIEWER`    | Read the queue — for branch staff and audit                |

---

## Turning on SMS

Offers are useless if the customer never hears about them. The app posts to a
webhook, so any gateway with an HTTP endpoint works:

```powershell
gcloud run services update ml-autoquote --region=asia-southeast1 `
  --update-env-vars="SMS_WEBHOOK_URL=https://your-gateway/send" `
  --update-secrets="SMS_WEBHOOK_TOKEN=autoquote-sms-token:latest"
```

It sends:

```json
{ "to": "09171234567", "message": "Hi Juan! Your M Lhuillier offer…" }
```

Until that's set, messages are written to Cloud Logging instead — so you can
run the whole flow and read what *would* have been sent. Email works the same
way with `EMAIL_WEBHOOK_URL`.

---

## Turning on the comparables ingest

If your team uses a tool to collect live marketplace prices, give it a token:

```powershell
# Create the secret once
$token = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
$token | gcloud secrets create autoquote-ingest-token --data-file=-

gcloud run services update ml-autoquote --region=asia-southeast1 `
  --update-secrets="COMPARABLES_INGEST_TOKEN=autoquote-ingest-token:latest"
```

See [README.md](README.md#where-the-comparables-come-from) for the request
shape.

---

## Environment reference

Set as Cloud Run environment variables, or from Secret Manager where marked.

| Variable                   | Secret? | Notes                                              |
| -------------------------- | ------- | -------------------------------------------------- |
| `DATABASE_URL`             | ✅      | `mysql://user:pass@localhost/db?socket=/cloudsql/CONN` |
| `SESSION_SECRET`           | ✅      | 32+ random characters. Rotating it signs everyone out. |
| `NEXT_PUBLIC_APP_URL`      |         | Public URL — used to build customer offer links.    |
| `STORAGE_DRIVER`           |         | `gcs` in production, `local` for development.       |
| `GCS_BUCKET`               |         | Photo bucket name.                                  |
| `GCS_SIGNER_EMAIL`         |         | The runtime service account, for signing URLs.      |
| `COMPARABLES_PROVIDERS`    |         | `manual,seed` by default. Add `partner` when you have a feed. |
| `COMPARABLES_API_URL/KEY`  | key ✅  | Licensed market data feed.                          |
| `COMPARABLES_INGEST_TOKEN` | ✅      | Enables `POST /api/ingest/comparables`.             |
| `VALUATION_BUY_MARGIN`     |         | Share of market mid to start from. Default `0.82`.  |
| `OFFER_VALIDITY_DAYS`      |         | Default `7`.                                        |
| `SMS_WEBHOOK_URL/TOKEN`    | token ✅| SMS gateway.                                        |
| `EMAIL_WEBHOOK_URL/TOKEN`  | token ✅| Email gateway.                                      |

---

## Doing it by hand

If you'd rather not run the script, these are the same steps.

```powershell
# 1. Project and APIs
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com sqladmin.googleapis.com `
  artifactregistry.googleapis.com cloudbuild.googleapis.com `
  secretmanager.googleapis.com storage.googleapis.com iamcredentials.googleapis.com

# 2. Cloud SQL (MySQL 8) — takes 5-10 minutes
gcloud sql instances create ml-autoquote-db `
  --database-version=MYSQL_8_0 --tier=db-g1-small `
  --region=asia-southeast1 --storage-auto-increase
gcloud sql databases create ml_autoquote --instance=ml-autoquote-db `
  --charset=utf8mb4 --collation=utf8mb4_unicode_ci
gcloud sql users create autoquote --instance=ml-autoquote-db --password=CHOOSE_A_STRONG_PASSWORD

# 3. Photo bucket
gcloud storage buckets create gs://YOUR_PROJECT_ID-autoquote-photos `
  --location=asia-southeast1 --uniform-bucket-level-access --public-access-prevention

# 4. Artifact Registry
gcloud artifacts repositories create ml-autoquote `
  --repository-format=docker --location=asia-southeast1

# 5. Service account
gcloud iam service-accounts create ml-autoquote --display-name="AutoQuote runtime"
# then grant: roles/cloudsql.client, roles/secretmanager.secretAccessor,
#             roles/storage.objectAdmin, roles/iam.serviceAccountTokenCreator

# 6. Secrets (see the table above for the DATABASE_URL format)

# 7. Build and deploy
gcloud builds submit --config cloudbuild.yaml `
  --substitutions=_REGION=asia-southeast1,_SERVICE=ml-autoquote,_INSTANCE=YOUR_PROJECT_ID:asia-southeast1:ml-autoquote-db
```

---

## Checking it's healthy

```powershell
curl https://YOUR-SERVICE-URL/api/health        # is the app up?
curl https://YOUR-SERVICE-URL/api/health/ready  # can it reach the database?
```

Two endpoints on purpose. `/api/health` answers only "is this process
serving" — it never touches the database, so point Cloud Run's **startup and
liveness probes** here. A cold Cloud SQL instance must not be able to stop a
healthy revision from going live.

`/api/health/ready` is the deep check: database reachable *and* schema applied.
Point **monitoring** here, never a startup probe.

```json
{"status":"ready","database":"reachable","migrations":"applied"}
```

`"migrations":"missing"` means the app is running but the schema was never
applied — run `.\scripts\migrate-job.ps1 -ProjectId YOUR_PROJECT_ID`.

Logs:

```powershell
gcloud run services logs tail ml-autoquote --region=asia-southeast1
```

---

## What it costs

Rough monthly figures for a pilot in `asia-southeast1`, in USD:

| Resource                        | Approx.      |
| ------------------------------- | ------------ |
| Cloud SQL `db-g1-small`         | $25–35       |
| Cloud Run, 1 min instance       | $12–18       |
| Cloud Storage, 50 GB of photos  | $1–2         |
| Cloud Build                     | Free tier is usually enough |

The big lever is `--min-instances`. Setting it to `0` removes the ~$15/month
floor but puts a 2–4 second cold start in front of whichever customer arrives
first. For a customer-facing form, keeping one instance warm is worth it.

To pause everything without deleting it:

```powershell
gcloud run services update ml-autoquote --region=asia-southeast1 --min-instances=0
gcloud sql instances patch ml-autoquote-db --activation-policy=NEVER
```

---

## Backups and recovery

Cloud SQL backups are on by default (the script sets a nightly window at
18:00 UTC). To restore:

```powershell
gcloud sql backups list --instance=ml-autoquote-db
gcloud sql backups restore BACKUP_ID --restore-instance=ml-autoquote-db
```

Photos are a separate concern — enable object versioning on the bucket if you
want protection against accidental deletion:

```powershell
gcloud storage buckets update gs://YOUR_PROJECT_ID-autoquote-photos --versioning
```
