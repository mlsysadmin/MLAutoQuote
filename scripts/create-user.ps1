<#
.SYNOPSIS
  Creates a staff account on the deployed database.

.DESCRIPTION
  Opens a Cloud SQL Auth Proxy tunnel, runs scripts/create-user.mjs through it,
  then closes the tunnel. Needs the cloud-sql-proxy binary on PATH — download it
  from https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases

  If DATABASE_URL is already set in your shell (a local database, say), the
  tunnel is skipped and the script runs straight against it.

.EXAMPLE
  .\scripts\create-user.ps1 -ProjectId my-project -Email you@mlhuillier.com -Name "Your Name" -Role ADMIN
#>

[CmdletBinding()]
param(
  [string]$ProjectId,
  [Parameter(Mandatory = $true)][string]$Email,
  [Parameter(Mandatory = $true)][string]$Name,
  [ValidateSet("ADMIN", "APPRAISER", "VIEWER")][string]$Role = "APPRAISER",
  [string]$Branch,
  [string]$Password,
  [string]$Region = "asia-southeast1",
  [string]$SqlInstance = "ml-autoquote-db",
  [int]$LocalPort = 3307
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$arguments = @("scripts/create-user.mjs", "--email", $Email, "--name", $Name, "--role", $Role)
if ($Branch) { $arguments += @("--branch", $Branch) }
if ($Password) { $arguments += @("--password", $Password) }

# ── Already pointed at a database? Just run. ────────────────────────────────
if ($env:DATABASE_URL) {
  Write-Host "Using DATABASE_URL from your environment." -ForegroundColor Cyan
  Push-Location $repoRoot
  try { & node @arguments } finally { Pop-Location }
  return
}

if (-not $ProjectId) {
  throw "Either set DATABASE_URL, or pass -ProjectId to tunnel to Cloud SQL."
}
if (-not (Get-Command cloud-sql-proxy -ErrorAction SilentlyContinue)) {
  throw "cloud-sql-proxy not found on PATH. Download it from https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases"
}

$connectionName = "${ProjectId}:${Region}:${SqlInstance}"

Write-Host "Reading the connection string from Secret Manager..." -ForegroundColor Cyan
$secret = gcloud secrets versions access latest --secret=autoquote-database-url --project=$ProjectId

# The deployed URL connects over a unix socket; swap that for the local tunnel.
if ($secret -notmatch "^mysql://([^:]+):([^@]+)@[^/]*/([^?]+)") {
  throw "Couldn't parse the stored DATABASE_URL."
}
$dbUser = $Matches[1]
$dbPass = $Matches[2]
$dbName = $Matches[3]

Write-Host "Opening a tunnel to $connectionName on port $LocalPort..." -ForegroundColor Cyan
$proxy = Start-Process -FilePath "cloud-sql-proxy" `
  -ArgumentList @("--port", $LocalPort, $connectionName) `
  -PassThru -WindowStyle Hidden

try {
  # Give the proxy a moment to bind before Prisma connects.
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 400
    $ready = (Test-NetConnection -ComputerName 127.0.0.1 -Port $LocalPort -InformationLevel Quiet -WarningAction SilentlyContinue)
  } while (-not $ready -and (Get-Date) -lt $deadline)

  if (-not $ready) { throw "The Cloud SQL proxy didn't come up in time." }

  $env:DATABASE_URL = "mysql://${dbUser}:${dbPass}@127.0.0.1:${LocalPort}/${dbName}"
  Push-Location $repoRoot
  try { & node @arguments } finally { Pop-Location }
}
finally {
  if ($proxy -and -not $proxy.HasExited) {
    Stop-Process -Id $proxy.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
}
