<#
.SYNOPSIS
  Applies pending database migrations as a one-off Cloud Run Job.

.DESCRIPTION
  Runs `prisma migrate deploy` once, in the same image the service runs, with
  the same Cloud SQL connection and the same DATABASE_URL secret.

  This is separate from the service on purpose. A migration should run once per
  deploy, not once per container instance — and running it during container
  startup is what stops a revision from listening on $PORT in time when the
  database is cold or unreachable, which Cloud Run reports as a port error.

  Run it after a deploy that changed prisma/schema.prisma. It is safe to run
  when nothing is pending: `migrate deploy` applies only what is missing.

.EXAMPLE
  .\scripts\migrate-job.ps1 -ProjectId my-project

.EXAMPLE
  # Pin a specific image rather than whatever the service runs now
  .\scripts\migrate-job.ps1 -ProjectId my-project -Image asia-southeast1-docker.pkg.dev/my-project/ml-autoquote/ml-autoquote:20261020-101500
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ProjectId,
  [string]$Region = "asia-southeast1",
  [string]$Service = "ml-autoquote",
  [string]$JobName = "ml-autoquote-migrate",
  [string]$SqlInstance = "ml-autoquote-db",
  [string]$Image = "",
  [string]$DatabaseSecret = "autoquote-database-url"
)

$ErrorActionPreference = "Stop"

function Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  throw "gcloud CLI not found. Install it from https://cloud.google.com/sdk"
}

gcloud config set project $ProjectId | Out-Null
$connectionName = "${ProjectId}:${Region}:${SqlInstance}"
$serviceAccount = "$Service@$ProjectId.iam.gserviceaccount.com"

# Default to exactly what the service is running, so the migration matches the
# code that will use it.
if (-not $Image) {
  Step "Finding the image the service is running"
  $Image = (gcloud run services describe $Service --region=$Region `
    --format="value(spec.template.spec.containers[0].image)" 2>$null)
  if (-not $Image) {
    throw "Couldn't read the service image. Deploy first, or pass -Image."
  }
}
Write-Host "  Image:     $Image"
Write-Host "  Cloud SQL: $connectionName"

# ── Create or update the job ────────────────────────────────────────────────
$exists = $false
& cmd /c "gcloud run jobs describe $JobName --region=$Region >nul 2>nul"
if ($LASTEXITCODE -eq 0) { $exists = $true }

$verb = if ($exists) { "update" } else { "create" }
Step "$(if ($exists) { 'Updating' } else { 'Creating' }) the migration job"

gcloud run jobs $verb $JobName `
  --image=$Image `
  --region=$Region `
  --service-account=$serviceAccount `
  --set-cloudsql-instances=$connectionName `
  --set-secrets="DATABASE_URL=${DatabaseSecret}:latest" `
  --command="node_modules/.bin/prisma" `
  --args="migrate,deploy" `
  --max-retries=1 `
  --task-timeout=10m `
  --memory=512Mi

if ($LASTEXITCODE -ne 0) { throw "Couldn't $verb the job." }

# ── Run it ──────────────────────────────────────────────────────────────────
Step "Applying migrations"
gcloud run jobs execute $JobName --region=$Region --wait

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Migration failed. Read the logs with:" -ForegroundColor Red
  Write-Host "  gcloud run jobs executions list --job=$JobName --region=$Region"
  throw "Migration job failed."
}

Write-Host ""
Write-Host "Migrations applied." -ForegroundColor Green
Write-Host "Confirm with: curl https://YOUR-SERVICE-URL/api/health/ready"
Write-Host ""
