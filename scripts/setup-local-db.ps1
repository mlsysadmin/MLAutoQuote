<#
.SYNOPSIS
  Creates the local development database and user on your own MySQL instance.

.DESCRIPTION
  Run this once against the MySQL you already have installed. It creates the
  `ml_autoquote` database and an `autoquote` user, writes the connection string
  into .env, then applies the migration and seeds staff accounts and demo data.

  Needs a MySQL account that can CREATE DATABASE — normally root.

.EXAMPLE
  .\scripts\setup-local-db.ps1

.EXAMPLE
  .\scripts\setup-local-db.ps1 -Port 3306 -RootUser root
#>

[CmdletBinding()]
param(
  [string]$MysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
  [string]$DbHost = "127.0.0.1",
  [int]$Port = 3306,
  [string]$RootUser = "root",
  [string]$Database = "ml_autoquote",
  [string]$AppUser = "autoquote",
  [string]$AppPassword = "LocalDev_2026!",
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $MysqlExe)) {
  throw "mysql.exe not found at $MysqlExe. Pass -MysqlExe with the right path."
}

$listening = Test-NetConnection -ComputerName $DbHost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $listening) {
  Write-Host "Nothing is listening on ${DbHost}:${Port}." -ForegroundColor Yellow
  Write-Host "Start MySQL first — either its Windows service, or:" -ForegroundColor Yellow
  Write-Host '  & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"'
  throw "MySQL is not reachable."
}

$rootPassword = Read-Host "Password for MySQL user '$RootUser'" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword))

# `prisma migrate dev` creates a throwaway shadow database to diff against, so
# the dev user needs CREATE at the server level. Production uses
# `migrate deploy`, which needs none of this.
# `'user'@'%'` would put the sequence @' in the here-string, which PowerShell
# reads as the start of a single-quoted here-string. Holding the host part in a
# variable keeps that sequence out of the literal text.
$anyHost = "'%'"

$sql = @"
CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$AppUser'@$anyHost IDENTIFIED BY '$AppPassword';
GRANT ALL PRIVILEGES ON ``$Database``.* TO '$AppUser'@$anyHost;
GRANT CREATE, DROP, ALTER, REFERENCES ON *.* TO '$AppUser'@$anyHost;
FLUSH PRIVILEGES;
"@

Write-Host "Creating database and user..." -ForegroundColor Cyan
$sql | & $MysqlExe "--password=$plain" -h $DbHost -P $Port -u $RootUser
if ($LASTEXITCODE -ne 0) { throw "Couldn't create the database. Check the password." }

# Prisma needs the password percent-encoded inside the URL.
$encoded = [System.Uri]::EscapeDataString($AppPassword)
$url = "mysql://${AppUser}:${encoded}@${DbHost}:${Port}/${Database}"

$envPath = Join-Path $repoRoot ".env"
if (Test-Path $envPath) {
  $lines = Get-Content $envPath
  if ($lines -match '^DATABASE_URL=') {
    $lines = $lines -replace '^DATABASE_URL=.*', "DATABASE_URL=`"$url`""
  } else {
    $lines += "DATABASE_URL=`"$url`""
  }
  Set-Content -Path $envPath -Value $lines -Encoding utf8
} else {
  Copy-Item (Join-Path $repoRoot ".env.example") $envPath
  (Get-Content $envPath) -replace '^DATABASE_URL=.*', "DATABASE_URL=`"$url`"" |
    Set-Content -Path $envPath -Encoding utf8
}
Write-Host "  .env updated." -ForegroundColor Green

Push-Location $repoRoot
try {
  Write-Host "Applying migrations..." -ForegroundColor Cyan
  & npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Migration failed." }

  if (-not $SkipSeed) {
    Write-Host "Seeding staff accounts and demo data..." -ForegroundColor Cyan
    & npm run seed
  }
}
finally { Pop-Location }

Write-Host ""
Write-Host "Ready. Start the app with: npm run dev" -ForegroundColor Green
Write-Host "  Staff portal: http://localhost:3000/staff/login"
Write-Host "  Sign in as appraiser@mlhuillier.com / ChangeMe123!"
Write-Host ""
