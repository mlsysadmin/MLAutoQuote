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
  [string]$Bucket = "",
  [string]$Repo = "ml-autoquote",
  [string]$SqlTier = "db-g1-small",
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
  Write-Host "  Roles granted."

  # ── Cloud SQL (MySQL) ──────────────────────────────────────────────────────
  Step "Cloud SQL for MySQL"
  if (Exists "gcloud sql instances describe $SqlInstance") {
    Write-Host "  Instance already exists."
    $dbPassword = $null
  } else {
    Write-Host "  Creating instance — this takes 5-10 minutes."
    gcloud sql instances create $SqlInstance `
      --database-version=MYSQL_8_0 `
      --tier=$SqlTier `
      --region=$Region `
      --storage-auto-increase `
      --backup-start-time=18:00 `
      --availability-type=ZONAL
    $dbPassword = NewSecretValue 24
  }

  if (-not (Exists "gcloud sql databases describe $Database --instance=$SqlInstance")) {
    gcloud sql databases create $Database --instance=$SqlInstance `
      --charset=utf8mb4 --collation=utf8mb4_unicode_ci
  }

  $existingUsers = (gcloud sql users list --instance=$SqlInstance --format="value(name)") -split "`n"
  if ($existingUsers -notcontains $DbUser) {
    if (-not $dbPassword) { $dbPassword = NewSecretValue 24 }
    gcloud sql users create $DbUser --instance=$SqlInstance --password="$dbPassword"
    Write-Host "  Database user created." -ForegroundColor Green
  } else {
    Write-Host "  Database user already exists."
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

  if (-not (Exists "gcloud secrets describe autoquote-database-url")) {
    if (-not $dbPassword) {
      $dbPassword = Read-Host "  Enter the password for MySQL user '$DbUser'"
    }
    $encoded = [System.Uri]::EscapeDataString($dbPassword)
    $url = "mysql://${DbUser}:${encoded}@localhost/${Database}?socket=/cloudsql/${connectionName}"
    $url | gcloud secrets create autoquote-database-url --data-file=-
    Write-Host "  DATABASE_URL created."
  } else {
    Write-Host "  DATABASE_URL already exists."
  }
}

# ── Build & deploy ───────────────────────────────────────────────────────────

Step "Building the container image"
$image = "$Region-docker.pkg.dev/$ProjectId/$Repo/${Service}:$(Get-Date -Format yyyyMMdd-HHmmss)"
gcloud builds submit --tag $image --timeout=1800s

Step "Deploying to Cloud Run"
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
  --set-env-vars="NODE_ENV=production,STORAGE_DRIVER=gcs,GCS_BUCKET=$Bucket,GCS_SIGNER_EMAIL=$serviceAccount,COMPARABLES_PROVIDERS=manual\,seed,VALUATION_BUY_MARGIN=0.82,OFFER_VALIDITY_DAYS=7"

$url = (gcloud run services describe $Service --region=$Region --format="value(status.url)")

Step "Pointing the app at its own public URL"
gcloud run services update $Service --region=$Region `
  --update-env-vars="NEXT_PUBLIC_APP_URL=$url" | Out-Null

Write-Host ""
Write-Host "Deployed." -ForegroundColor Green
Write-Host "  Customer site: $url"
Write-Host "  Staff portal:  $url/staff/login"
Write-Host ""
Write-Host "First time? Create your staff accounts with:" -ForegroundColor Yellow
Write-Host "  .\scripts\create-user.ps1 -ProjectId $ProjectId -Email you@mlhuillier.com -Name 'Your Name' -Role ADMIN"
Write-Host ""
