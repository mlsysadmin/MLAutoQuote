<#
.SYNOPSIS
  Diagnoses a deployed service that serves pages but cannot save anything, and
  repairs it.

.DESCRIPTION
  The symptom is a customer filling in the whole form and being told "We
  couldn't reach our servers". The usual cause is a revision deployed without
  its secrets: Cloud Run happily starts a container with no DATABASE_URL, the
  public pages render perfectly, and every write fails.

  That is what happened on 22 October 2026 — a revision was live with no
  DATABASE_URL at all. `deploy.ps1` attaches it; deploying the image any other
  way (the Cloud Console, a bare `gcloud run deploy`) does not.

  This script is narrower than a redeploy. It does not build an image or touch
  the running revision's code — it checks what the service is missing and
  supplies only that:

    * the DATABASE_URL and SESSION_SECRET secrets (created if absent)
    * the Cloud SQL instance attachment
    * the database user's password, re-applied so it matches the stored URL
    * pending migrations
    * APP_URL, so offer links point at the service's own address

  Safe to run repeatedly. It changes nothing that is already correct, and it
  finishes by asking the service whether it is actually well.

.EXAMPLE
  powershell -File scripts/repair-production.ps1 -ProjectId my-project-id
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
  # Matches deploy.ps1. What keeps the instance closed is that it has no public
  # IP and Cloud Run reaches it over the Cloud SQL socket.
  [string]$DbPassword = "1234567890",

  # Check and report, change nothing.
  [switch]$WhatIfOnly
)

$ErrorActionPreference = "Stop"

function Step($text) {
  Write-Host ""
  Write-Host "== $text" -ForegroundColor Cyan
}
function Ok($text)   { Write-Host "   $text" -ForegroundColor Green }
function Warn($text) { Write-Host "   $text" -ForegroundColor Yellow }
function Info($text) { Write-Host "   $text" }

function Exists($command) {
  try {
    Invoke-Expression "$command 2>`$null" | Out-Null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host "gcloud is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install the Google Cloud SDK, then run this again." -ForegroundColor Red
  exit 1
}

gcloud config set project $ProjectId | Out-Null
$connectionName = "${ProjectId}:${Region}:${SqlInstance}"
$serviceAccount = "$Service@$ProjectId.iam.gserviceaccount.com"

Write-Host "Repairing $Service in $Region" -ForegroundColor White
Info "Project:   $ProjectId"
Info "Cloud SQL: $connectionName"

# ── What is wrong? ───────────────────────────────────────────────────────────

Step "Looking at the running service"

if (-not (Exists "gcloud run services describe $Service --region=$Region")) {
  Write-Host "   No service called '$Service' in $Region." -ForegroundColor Red
  Write-Host "   Nothing to repair — run scripts/deploy.ps1 to create it." -ForegroundColor Red
  exit 1
}

$url = (gcloud run services describe $Service --region=$Region --format="value(status.url)")
Info "URL: $url"

# The secrets the revision actually has mounted, and the SQL instances attached.
$secretsRaw = (gcloud run services describe $Service --region=$Region `
  --format="value(spec.template.spec.containers[0].env)") 2>$null
$sqlAttached = (gcloud run services describe $Service --region=$Region `
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])") 2>$null

$hasDatabaseUrl = $secretsRaw -match "DATABASE_URL"
$hasSessionSecret = $secretsRaw -match "SESSION_SECRET"
$hasSql = $sqlAttached -match [regex]::Escape($connectionName)

if ($hasDatabaseUrl) { Ok "DATABASE_URL is set on the revision." }
else { Warn "DATABASE_URL is NOT set — this is why submissions fail." }

if ($hasSessionSecret) { Ok "SESSION_SECRET is set." }
else { Warn "SESSION_SECRET is NOT set — staff cannot sign in." }

if ($hasSql) { Ok "Cloud SQL instance is attached." }
else { Warn "Cloud SQL instance is NOT attached." }

# Ask the app itself. It knows more than the metadata does.
Step "Asking the service whether it is ready"
try {
  $ready = Invoke-RestMethod -Uri "$url/api/health/ready" -TimeoutSec 30 -ErrorAction Stop
  Ok "status=$($ready.status) database=$($ready.database) migrations=$($ready.migrations)"
} catch {
  # A 503 is an answer, not a failure — read the body.
  $body = $null
  try { $body = $_.ErrorDetails.Message } catch {}
  if ($body) { Warn "not ready: $body" } else { Warn "no answer from $url/api/health/ready" }
}

if ($WhatIfOnly) {
  Write-Host ""
  Write-Host "-WhatIfOnly: stopping here without changing anything." -ForegroundColor Yellow
  exit 0
}

# ── Repair ───────────────────────────────────────────────────────────────────

Step "Database user and stored connection string"

if (-not (Exists "gcloud sql instances describe $SqlInstance")) {
  Write-Host "   Cloud SQL instance '$SqlInstance' does not exist." -ForegroundColor Red
  Write-Host "   Run scripts/deploy.ps1, which creates it." -ForegroundColor Red
  exit 1
}

# Re-apply the password so the account and the stored URL cannot disagree.
gcloud sql users set-password $DbUser --instance=$SqlInstance --password="$DbPassword" 2>$null | Out-Null
Ok "Password re-applied for '$DbUser'."

# Prisma needs the password percent-encoded inside the URL.
$encoded = [System.Uri]::EscapeDataString($DbPassword)
$dbUrl = "mysql://${DbUser}:${encoded}@localhost/${Database}?socket=/cloudsql/${connectionName}"

if (-not (Exists "gcloud secrets describe autoquote-database-url")) {
  $dbUrl | gcloud secrets create autoquote-database-url --data-file=- | Out-Null
  Ok "Secret autoquote-database-url created."
} else {
  $dbUrl | gcloud secrets versions add autoquote-database-url --data-file=- | Out-Null
  Ok "Secret autoquote-database-url updated to match the account."
}

if (-not (Exists "gcloud secrets describe autoquote-session-secret")) {
  # 48 random bytes, base64. Creating one signs out any existing staff session,
  # which is the right trade when the alternative is nobody being able to sign
  # in at all.
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes) | gcloud secrets create autoquote-session-secret --data-file=- | Out-Null
  Ok "Secret autoquote-session-secret created."
} else {
  Ok "Secret autoquote-session-secret already exists — left alone."
}

Step "Letting the runtime read the secrets"
foreach ($secret in @("autoquote-database-url", "autoquote-session-secret")) {
  gcloud secrets add-iam-policy-binding $secret `
    --member="serviceAccount:$serviceAccount" `
    --role="roles/secretmanager.secretAccessor" 2>$null | Out-Null
}
Ok "secretAccessor granted to $serviceAccount."

Step "Attaching them to the service"
gcloud run services update $Service --region=$Region `
  --add-cloudsql-instances=$connectionName `
  --update-secrets="DATABASE_URL=autoquote-database-url:latest,SESSION_SECRET=autoquote-session-secret:latest" `
  --update-env-vars="APP_URL=$url,NEXT_PUBLIC_APP_URL=$url" | Out-Null
Ok "Secrets, Cloud SQL and APP_URL applied. A new revision is rolling out."

Step "Applying database migrations"
& (Join-Path $PSScriptRoot "migrate-job.ps1") `
  -ProjectId $ProjectId -Region $Region -Service $Service -SqlInstance $SqlInstance

# ── Did it work? ─────────────────────────────────────────────────────────────

Step "Checking the service again"
# A new revision takes a moment to take traffic.
Start-Sleep -Seconds 15

$healthy = $false
for ($i = 1; $i -le 6; $i++) {
  try {
    $ready = Invoke-RestMethod -Uri "$url/api/health/ready" -TimeoutSec 30 -ErrorAction Stop
    if ($ready.status -eq "ready") { $healthy = $true; break }
    Info "attempt ${i}: $($ready.status)"
  } catch {
    Info "attempt ${i}: not ready yet"
  }
  Start-Sleep -Seconds 10
}

Write-Host ""
if ($healthy) {
  Write-Host "Fixed. $Service is ready and accepting submissions." -ForegroundColor Green
  Write-Host "  $url" -ForegroundColor Green
} else {
  Write-Host "Still not ready. Open this and read what it says:" -ForegroundColor Yellow
  Write-Host "  $url/api/health/ready" -ForegroundColor Yellow
  Write-Host "Then the logs:" -ForegroundColor Yellow
  Write-Host "  gcloud run services logs read $Service --region=$Region --limit=50" -ForegroundColor Yellow
  exit 1
}
