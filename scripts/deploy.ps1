<#
.SYNOPSIS
  One-command setup and deploy of M Lhuillier AutoQuote to Google Cloud Run.

.DESCRIPTION
  Idempotent: every step checks whether the resource already exists, so you can
  run this for the first deploy and for every deploy after that. It creates the
  Cloud SQL (MySQL) instance, the photo bucket, the service account, the
  secrets and the Artifact Registry repository, then builds and deploys.

.EXAMPLE
  .\scripts\deploy.ps1 -ProjectId my-gcp-project

.EXAMPLE
  # Later deploys, once everything exists:
  .\scripts\deploy.ps1 -ProjectId my-gcp-project -SkipInfra
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [string]$Region = "asia-southeast1",
  [string]$Service = "ml-autoquote",
  [string]$SqlInstance = "ml-autoquote-db",
  [string]$Database = "ml_autoquote",
  [string]$DbUser = "autoquote",
  # The house development password, used here too so every environment matches.
  # What actually keeps this instance closed is that it has no public IP and
  # Cloud Run reaches it over the Cloud SQL socket, which requires the
  # roles/cloudsql.client IAM grant. If anyone ever gives the instance a public
  # IP or an authorised network, set a real password here first.
  [string]$DbPassword = "1234567890",
  [string]$Bucket = "",
  [string]$Repo = "ml-autoquote",
  [string]$SqlTier = "db-g1-small",
  # Your public origin, e.g. https://autoquote.mlhuillier.com. Set this once you
  # have a custom domain so canonical URLs and the sitemap point at it.
  [string]$SiteUrl = "",
  [switch]$SkipInfra
)

$ErrorActionPreference = "Stop"

if (-not $Bucket) { $Bucket = "$ProjectId-autoquote-photos" }

function Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Exists($command) {
  # gcloud describe writes to stderr and exits non-zero when absent.
  & cmd /c "$command >nul 2>nul"
  return ($LASTEXITCODE -eq 0)
}

function NewSecretValue([int]$Bytes = 48) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer)
}

# ── Preflight ────────────────────────────────────────────────────────────────

Step "Checking prerequisites"
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI not found. Install it from https://cloud.google.com/sdk and run 'gcloud auth login'."
}

gcloud config set project $ProjectId | Out-Null
$connectionName = "${ProjectId}:${Region}:${SqlInstance}"
Write-Host "  Project:    $ProjectId"
Write-Host "  Region:     $Region"
Write-Host "  Service:    $Service"
Write-Host "  Cloud SQL:  $connectionName"
Write-Host "  Bucket:     gs://$Bucket"

$serviceAccount = "$Service@$ProjectId.iam.gserviceaccount.com"

if (-not $SkipInfra) {

  # ── APIs ───────────────────────────────────────────────────────────────────
  Step "Enabling APIs (this can take a couple of minutes the first time)"
  gcloud services enable `
    run.googleapis.com `
    sqladmin.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    secretmanager.googleapis.com `
    storage.googleapis.com `
    iamcredentials.googleapis.com

  # ── Artifact Registry ──────────────────────────────────────────────────────
  Step "Artifact Registry repository"
  if (Exists "gcloud artifacts repositories describe $Repo --location=$Region") {
    Write-Host "  Already exists."
  } else {
    gcloud artifacts repositories create $Repo `
      --repository-format=docker `
      --location=$Region `
      --description="M Lhuillier AutoQuote container images"
  }

  # ── Service account ────────────────────────────────────────────────────────
  Step "Service account"
  if (Exists "gcloud iam service-accounts describe $serviceAccount") {
    Write-Host "  Already exists."
  } else {
    gcloud iam service-accounts create $Service `
      --display-name="M Lhuillier AutoQuote runtime"
  }

  foreach ($role in @(
      "roles/cloudsql.client",
      "roles/secretmanager.secretAccessor",
      "roles/storage.objectAdmin",
      "roles/iam.serviceAccountTokenCreator"
    )) {
    gcloud projects add-iam-policy-binding $ProjectId `
      --member="serviceAccount:$serviceAccount" `
      --role=$role `
      --condition=None | Out-Null
  }
  Write-Host "  Runtime roles granted."

  # Cloud Build needs its own permissions if anyone deploys through
  # cloudbuild.yaml rather than this script. Granting them here means the
  # documented manual path works too, instead of failing on a permissions
  # error that reads as if the service account were missing.
  $projectNumber = (gcloud projects describe $ProjectId --format="value(projectNumber)")
  $cloudBuildSa = "$projectNumber@cloudbuild.gserviceaccount.com"

  foreach ($role in @("roles/run.admin", "roles/iam.serviceAccountUser")) {
    gcloud projects add-iam-policy-binding $ProjectId `
      --member="serviceAccount:$cloudBuildSa" `
      --role=$role `
      --condition=None | Out-Null
  }
  # And let Cloud Build act as the runtime account when it deploys.
  gcloud iam service-accounts add-iam-policy-binding $serviceAccount `
    --member="serviceAccount:$cloudBuildSa" `
    --role="roles/iam.serviceAccountUser" | Out-Null

  Write-Host "  Cloud Build roles granted."

  # ── Cloud SQL (MySQL) ──────────────────────────────────────────────────────
  Step "Cloud SQL for MySQL"
  if (Exists "gcloud sql instances describe $SqlInstance") {
    Write-Host "  Instance already exists."
  } else {
    Write-Host "  Creating instance — this takes 5-10 minutes."
    gcloud sql instances create $SqlInstance `
      --database-version=MYSQL_8_0 `
      --tier=$SqlTier `
      --region=$Region `
      --storage-auto-increase `
      --backup-start-time=18:00 `
      --availability-type=ZONAL
  }

  if (-not (Exists "gcloud sql databases describe $Database --instance=$SqlInstance")) {
    gcloud sql databases create $Database --instance=$SqlInstance `
      --charset=utf8mb4 --collation=utf8mb4_unicode_ci
  }

  $existingUsers = (gcloud sql users list --instance=$SqlInstance --format="value(name)") -split "`n"
  if ($existingUsers -notcontains $DbUser) {
    gcloud sql users create $DbUser --instance=$SqlInstance --password="$DbPassword"
    Write-Host "  Database user created." -ForegroundColor Green
  } else {
    # Re-set it, so a re-run always leaves the stored DATABASE_URL and the
    # actual account in agreement.
    gcloud sql users set-password $DbUser --instance=$SqlInstance --password="$DbPassword"
    Write-Host "  Database user already exists — password re-applied."
  }

  # ── Photo bucket ───────────────────────────────────────────────────────────
  Step "Cloud Storage bucket for photos"
  if (Exists "gcloud storage buckets describe gs://$Bucket") {
    Write-Host "  Already exists."
  } else {
    gcloud storage buckets create "gs://$Bucket" `
      --location=$Region `
      --uniform-bucket-level-access `
      --public-access-prevention
  }

  # Browsers PUT photos straight to the bucket, so it needs CORS. Objects stay
  # private: customers' CR and OR scans are only ever reached through a
  # short-lived signed URL.
  $corsFile = Join-Path $env:TEMP "autoquote-cors.json"
  $corsRules = @(
    @{
      origin         = @("*")
      method         = @("PUT", "GET", "HEAD")
      responseHeader = @("Content-Type")
      maxAgeSeconds  = 3600
    }
  )
  ConvertTo-Json -InputObject $corsRules -Depth 4 | Set-Content -Path $corsFile -Encoding utf8
  gcloud storage buckets update "gs://$Bucket" --cors-file=$corsFile
  Remove-Item $corsFile -ErrorAction SilentlyContinue

  # ── Secrets ────────────────────────────────────────────────────────────────
  Step "Secrets"
  if (-not (Exists "gcloud secrets describe autoquote-session-secret")) {
    NewSecretValue | gcloud secrets create autoquote-session-secret --data-file=-
    Write-Host "  SESSION_SECRET created."
  } else {
    Write-Host "  SESSION_SECRET already exists."
  }

  # Prisma needs the password percent-encoded inside the URL.
  $encoded = [System.Uri]::EscapeDataString($DbPassword)
  $url = "mysql://${DbUser}:${encoded}@localhost/${Database}?socket=/cloudsql/${connectionName}"

  if (-not (Exists "gcloud secrets describe autoquote-database-url")) {
    $url | gcloud secrets create autoquote-database-url --data-file=-
    Write-Host "  DATABASE_URL created."
  } else {
    # The account's password is re-applied on every run, so the stored URL has
    # to be re-applied with it or the service is left holding a stale one.
    $url | gcloud secrets versions add autoquote-database-url --data-file=-
    Write-Host "  DATABASE_URL updated to match the database user."
  }
}

# ── Build & deploy ───────────────────────────────────────────────────────────

Step "Building the container image"
$image = "$Region-docker.pkg.dev/$ProjectId/$Repo/${Service}:$(Get-Date -Format yyyyMMdd-HHmmss)"

# Canonical and Open Graph URLs on the statically rendered pages are fixed at
# build time, so the origin has to be known now. Use the custom domain if given,
# otherwise whatever URL the service already has; on the very first deploy there
# is none, and the script rebuilds once at the end.
$siteUrl = $SiteUrl
if (-not $siteUrl) {
  $siteUrl = (gcloud run services describe $Service --region=$Region --format="value(status.url)" 2>$null)
}
if ($siteUrl) {
  Write-Host "  Baking public origin: $siteUrl"
  gcloud builds submit --timeout=1800s `
    --config=cloudbuild-image.yaml `
    --substitutions="_IMAGE=$image,_SITE_URL=$siteUrl"
} else {
  Write-Host "  No service URL yet — building without a baked origin." -ForegroundColor Yellow
  gcloud builds submit --tag $image --timeout=1800s
}

Step "Deploying to Cloud Run"
# COMPARABLES_PROVIDERS is deliberately not passed: its value contains a comma,
# which is gcloud's own separator for --set-env-vars, and "manual,seed" is
# already the default in src/lib/env.ts. Change it from the console if needed.
gcloud run deploy $Service `
  --image=$image `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --port=8080 `
  --service-account=$serviceAccount `
  --add-cloudsql-instances=$connectionName `
  --min-instances=1 `
  --max-instances=20 `
  --concurrency=80 `
  --cpu=1 `
  --memory=1Gi `
  --cpu-boost `
  --timeout=60 `
  --set-secrets="DATABASE_URL=autoquote-database-url:latest,SESSION_SECRET=autoquote-session-secret:latest" `
  --set-env-vars="NODE_ENV=production,SKIP_MIGRATIONS=true,STORAGE_DRIVER=gcs,GCS_BUCKET=$Bucket,GCS_SIGNER_EMAIL=$serviceAccount,VALUATION_BUY_MARGIN=0.82,OFFER_VALIDITY_DAYS=7"

$url = (gcloud run services describe $Service --region=$Region --format="value(status.url)")
if ($SiteUrl) { $url = $SiteUrl }

Step "Pointing the app at its own public URL"
# APP_URL is read at runtime, so robots.txt and the sitemap are correct straight
# away even if the image was built before the URL existed.
gcloud run services update $Service --region=$Region `
  --update-env-vars="APP_URL=$url,NEXT_PUBLIC_APP_URL=$url" | Out-Null

# ── Schema ──────────────────────────────────────────────────────────────────
# The service boots with SKIP_MIGRATIONS=true so a cold or unreachable database
# can never stop a revision from listening on $PORT. The schema is applied here
# instead, as a one-off job — once per deploy rather than once per instance.
Step "Applying database migrations"
& (Join-Path $PSScriptRoot "migrate-job.ps1") `
  -ProjectId $ProjectId -Region $Region -Service $Service -SqlInstance $SqlInstance

if (-not $siteUrl) {
  Write-Host ""
  Write-Host "First deploy done. Canonical URLs were baked before the service" -ForegroundColor Yellow
  Write-Host "had an address, so run the deploy once more to correct them:" -ForegroundColor Yellow
  Write-Host "  .\scripts\deploy.ps1 -ProjectId $ProjectId -SkipInfra"
}

Write-Host ""
Write-Host "Deployed." -ForegroundColor Green
Write-Host "  Customer site: $url"
Write-Host "  Staff portal:  $url/staff/login"
Write-Host ""
Write-Host "First time? Create your staff accounts with:" -ForegroundColor Yellow
Write-Host "  .\scripts\create-user.ps1 -ProjectId $ProjectId -Email you@mlhuillier.com -Name 'Your Name' -Role ADMIN"
Write-Host ""
