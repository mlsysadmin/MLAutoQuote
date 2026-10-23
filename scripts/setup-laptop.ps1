<#
.SYNOPSIS
  Sets this computer up to run MLAutoQuote exactly as the desktop does.

.DESCRIPTION
  Run this on the SECOND machine — the laptop — after copying the project
  folder across. It is the whole desktop environment in one command:

    * checks the prerequisites and says plainly what is missing
    * installs the npm dependencies
    * writes a .env if there isn't one, with the house development settings
    * starts the local MySQL on port 3310, creating it on first run
    * restores the database dump that shipped beside this script
    * applies any migrations the dump predates
    * generates the Prisma client
    * tells you the one command that starts the app

  Safe to run again. It skips what is already done, and it never overwrites
  an existing .env — your API keys stay yours.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts/setup-laptop.ps1
#>

[CmdletBinding()]
param(
  [string]$MysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4",
  [int]$Port = 3310,
  # The dump to restore. Defaults to the one packaged beside this script.
  [string]$Dump = "",
  # Set up the code and database but don't restore any data.
  [switch]$NoData
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "   $t" -ForegroundColor Green }
function Warn($t) { Write-Host "   $t" -ForegroundColor Yellow }
function Bad($t)  { Write-Host "   $t" -ForegroundColor Red }

Write-Host "MLAutoQuote — setting up this machine" -ForegroundColor White
Write-Host "   Folder: $repoRoot"

# ── Prerequisites ────────────────────────────────────────────────────────────

Step "Checking what's installed"
$missing = @()

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $v = (& node -v).TrimStart("v")
  $major = [int]($v.Split(".")[0])
  if ($major -lt 20) {
    Bad "Node $v is too old — this needs 20 or newer (24 recommended)."
    $missing += "Node 20+  https://nodejs.org/en/download"
  } else {
    Ok "Node $v"
  }
} else {
  Bad "Node is not installed."
  $missing += "Node 24  https://nodejs.org/en/download"
}

$mysqld = Join-Path $MysqlHome "bin\mysqld.exe"
if (Test-Path $mysqld) {
  Ok "MySQL at $MysqlHome"
} else {
  Bad "MySQL 8 not found at $MysqlHome"
  $missing += "MySQL 8.4 (Server only)  https://dev.mysql.com/downloads/installer/"
  Warn "If it is installed somewhere else, pass -MysqlHome 'C:\path\to\MySQL Server 8.4'"
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Install these first, then run this again:" -ForegroundColor Red
  foreach ($m in $missing) { Write-Host "  * $m" -ForegroundColor Red }
  Write-Host ""
  Write-Host "MySQL: choose 'Server only', and set the root password to 1234567890" -ForegroundColor Yellow
  Write-Host "to match the desktop. Nothing else in the installer needs changing." -ForegroundColor Yellow
  exit 1
}

# ── Dependencies ─────────────────────────────────────────────────────────────

Step "Installing npm packages (a few minutes the first time)"
if (Test-Path "node_modules\next") {
  Ok "Already installed — checking they match package.json."
}
& npm.cmd install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Bad "npm install failed."; exit 1 }
Ok "Dependencies ready."

# ── Environment ──────────────────────────────────────────────────────────────

Step "Local settings (.env)"
if (Test-Path ".env") {
  Ok ".env already exists — left exactly as it is."
} else {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress)
  if (-not $ip) { $ip = "localhost" }

  @(
    '# Written by scripts/setup-laptop.ps1. House development settings.',
    'NODE_ENV="development"',
    'DATABASE_URL="mysql://autoquote:1234567890@127.0.0.1:3310/ml_autoquote"',
    'SESSION_SECRET="dev-only-secret-change-me-in-production-0123456789"',
    'AUTH_ALLOW_BLANK_PASSWORD="true"',
    '',
    "APP_URL=`"http://${ip}:3400`"",
    "NEXT_PUBLIC_APP_URL=`"http://${ip}:3400`"",
    "DEV_ORIGINS=`"$ip`"",
    '',
    'STORAGE_DRIVER="local"',
    '',
    '# On by default: uses whichever reader has credentials, else on-device OCR.',
    'ID_EXTRACTION_PROVIDER=""',
    'GOOGLE_VISION_API_KEY=""',
    '',
    '# Paste the Resend key from the desktop .env to send real email.',
    'EMAIL_API_KEY=""',
    'EMAIL_API_URL=""',
    'EMAIL_FROM="M Lhuillier AutoQuote <onboarding@resend.dev>"',
    'EMAIL_WEBHOOK_URL=""',
    'SMTP_HOST=""',
    'SMTP_PORT="587"',
    'SMTP_USER=""',
    'SMTP_PASSWORD=""',
    'SMS_WEBHOOK_URL=""',
    ''
  ) -join "`n" | Set-Content -Path ".env" -Encoding utf8

  Ok ".env written for this machine (LAN address $ip)."
  Warn "Email is off until you copy EMAIL_API_KEY across from the desktop."
}

# ── Database ─────────────────────────────────────────────────────────────────

Step "Starting the local database"
& (Join-Path $PSScriptRoot "db-start.ps1") -MysqlHome $MysqlHome -Port $Port
if ($LASTEXITCODE -ne 0) { Bad "The database would not start."; exit 1 }

if (-not $NoData) {
  Step "Restoring the data from the desktop"

  if (-not $Dump) {
    $candidates = @(
      (Join-Path $repoRoot "dist\laptop\ml_autoquote.sql"),
      (Join-Path $repoRoot "ml_autoquote.sql"),
      (Join-Path $PSScriptRoot "ml_autoquote.sql")
    )
    $Dump = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  }

  if (-not $Dump -or -not (Test-Path $Dump)) {
    Warn "No dump found, so the database is empty but ready."
    Warn "Copy ml_autoquote.sql next to this script and run again to load it,"
    Warn "or run: npm run setup   (schema + demo data)"
  } else {
    $mysql = Join-Path $MysqlHome "bin\mysql.exe"
    Write-Host "   Loading $(Split-Path -Leaf $Dump)…"
    & $mysql --host=127.0.0.1 --port=$Port --user=root --force -e "SOURCE $($Dump -replace '\\','/');"
    if ($LASTEXITCODE -ne 0) { Bad "The restore reported errors — check the output above." }
    else { Ok "Data restored." }
  }
}

Step "Restoring the uploaded photographs"
# The dump carries the photo rows; the image files are separate. Without this
# every existing submission shows broken thumbnails, which reads as data loss
# even though the records are intact.
$photoSource = Join-Path $repoRoot "uploads-restore"
$photoTarget = Join-Path $repoRoot ".uploads"
if (Test-Path $photoSource) {
  New-Item -ItemType Directory -Force -Path $photoTarget | Out-Null
  Copy-Item -Path (Join-Path $photoSource "*") -Destination $photoTarget -Recurse -Force
  $n = (Get-ChildItem -Path $photoTarget -Recurse -File | Measure-Object).Count
  Ok "$n photo files in place."
} else {
  Warn "No uploads-restore folder, so older submissions will show broken"
  Warn "thumbnails. The records themselves are fine."
}

Step "Applying migrations and generating the Prisma client"
& npx.cmd prisma migrate deploy
& npx.cmd prisma generate
Ok "Schema and client up to date."

# ── Done ─────────────────────────────────────────────────────────────────────

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ""
Write-Host "Ready. Start the app with:" -ForegroundColor Green
Write-Host "   npm.cmd run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open:" -ForegroundColor Green
Write-Host "   http://localhost:3400            the customer site"
if ($ip) { Write-Host "   http://${ip}:3400                from other machines on this network" }
Write-Host "   http://localhost:3400/staff      the appraiser portal"
Write-Host ""
Write-Host "   appraiser@mlhuillier.com / 1234567890"
Write-Host "   admin@mlhuillier.com     / 1234567890   (for Settings)"
Write-Host ""
Write-Host "After a reboot, MySQL does not restart itself. Run:" -ForegroundColor Yellow
Write-Host "   powershell -File scripts\db-start.ps1" -ForegroundColor Yellow
Write-Host "or run this setup once with -Install to register it at logon." -ForegroundColor Yellow
