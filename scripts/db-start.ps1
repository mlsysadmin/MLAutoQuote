<#
.SYNOPSIS
  Starts the local AutoQuote database, creating it on first run.

.DESCRIPTION
  Runs a MySQL instance dedicated to this project, with its own data directory
  under %LOCALAPPDATA%\MLAutoQuote and its own port, so it never collides with
  the MySQL instance you already have on 3306 and never needs that instance's
  root password.

  Idempotent and safe to run any time: if the server is already up it says so
  and exits. The data directory persists across reboots — run this once after
  each restart, or use -Install to have Windows do it for you.

  It only needs the mysqld.exe that ships with your MySQL install; it does not
  touch your existing data, users or configuration.

.EXAMPLE
  .\scripts\db-start.ps1

.EXAMPLE
  # Start it, then apply the schema and load demo data.
  .\scripts\db-start.ps1 -Seed
#>

[CmdletBinding()]
param(
  [string]$MysqlHome = "C:\Program Files\MySQL\MySQL Server 8.4",
  [int]$Port = 3310,
  [string]$DataDir = (Join-Path $env:LOCALAPPDATA "MLAutoQuote\mysql-data"),
  [string]$Database = "ml_autoquote",
  [string]$AppUser = "autoquote",
  [string]$AppPassword = "1234567890",
  # Apply migrations and load the demo data once the server is up.
  [switch]$Seed,
  # Register a scheduled task so the database starts at logon.
  [switch]$Install
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$mysqld = Join-Path $MysqlHome "bin\mysqld.exe"
$mysql = Join-Path $MysqlHome "bin\mysql.exe"

foreach ($exe in @($mysqld, $mysql)) {
  if (-not (Test-Path $exe)) {
    throw "Not found: $exe`nPass -MysqlHome with the path to your MySQL install."
  }
}

function Test-Port([int]$p) {
  Test-NetConnection -ComputerName 127.0.0.1 -Port $p `
    -InformationLevel Quiet -WarningAction SilentlyContinue
}

# ── Already up? ──────────────────────────────────────────────────────────────
if (Test-Port $Port) {
  Write-Host "Database already running on port $Port." -ForegroundColor Green
}
else {
  # ── First run: lay down a data directory of our own ──
  $fresh = $false
  if (-not (Test-Path (Join-Path $DataDir "mysql"))) {
    Write-Host "Creating the data directory (first run)..." -ForegroundColor Cyan
    if (Test-Path $DataDir) { Remove-Item $DataDir -Recurse -Force }
    New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

    # --initialize-insecure leaves root with no password. That is fine here:
    # the server binds to 127.0.0.1 only and holds nothing but local demo data.
    & $mysqld --initialize-insecure --basedir="$MysqlHome" --datadir="$DataDir"
    if ($LASTEXITCODE -ne 0) { throw "Could not initialise the data directory." }
    $fresh = $true
  }

  Write-Host "Starting MySQL on port $Port..." -ForegroundColor Cyan
  $proc = Start-Process -FilePath $mysqld -ArgumentList @(
    "--basedir=`"$MysqlHome`"",
    "--datadir=`"$DataDir`"",
    "--port=$Port",
    "--bind-address=127.0.0.1",
    "--mysqlx=0",
    "--named-pipe=0",
    "--shared-memory=0",
    "--skip-log-bin"
  ) -PassThru -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Milliseconds 700
    $up = Test-Port $Port
  } while (-not $up -and (Get-Date) -lt $deadline)

  if (-not $up) { throw "MySQL did not come up within 60 seconds." }
  Write-Host "  Running (pid $($proc.Id))." -ForegroundColor Green

  if ($fresh) {
    Write-Host "Creating the database and application user..." -ForegroundColor Cyan

    # Built as an array rather than a here-string: a here-string's terminator
    # has to sit at column 0, which it cannot do inside an indented block.
    # `prisma migrate dev` also needs server-level CREATE for its shadow
    # database; `migrate deploy` in production needs none of that.
    $account = "'$AppUser'@'%'"
    $sql = @(
      "CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
      "CREATE USER IF NOT EXISTS $account IDENTIFIED BY '$AppPassword';"
      "GRANT ALL PRIVILEGES ON ``$Database``.* TO $account;"
      "GRANT CREATE, DROP, ALTER, REFERENCES ON *.* TO $account;"
      "FLUSH PRIVILEGES;"
    ) -join "`n"

    $sql | & $mysql -h 127.0.0.1 -P $Port -u root
    if ($LASTEXITCODE -ne 0) { throw "Could not create the database." }
    Write-Host "  Done." -ForegroundColor Green
  }
}

$url = "mysql://${AppUser}:${AppPassword}@127.0.0.1:${Port}/${Database}"

# ── Keep .env pointed at it ──────────────────────────────────────────────────
$envPath = Join-Path $repoRoot ".env"
if (Test-Path $envPath) {
  $lines = Get-Content $envPath
  if (($lines -join "`n") -notmatch [regex]::Escape($url)) {
    ($lines -replace '^DATABASE_URL=.*', "DATABASE_URL=`"$url`"") |
      Set-Content -Path $envPath -Encoding utf8
    Write-Host "  .env updated to point at port $Port." -ForegroundColor Green
  }
}

# ── Optional: schema and demo data ───────────────────────────────────────────
if ($Seed) {
  Push-Location $repoRoot
  try {
    $env:DATABASE_URL = $url
    Write-Host "Applying migrations..." -ForegroundColor Cyan
    & npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Migration failed." }
    Write-Host "Loading demo data..." -ForegroundColor Cyan
    & npm run seed
  }
  finally { Pop-Location }
}

# ── Optional: start it at logon ──────────────────────────────────────────────
if ($Install) {
  $taskName = "MLAutoQuote MySQL"

  # The script's own path has to reach the task wrapped in double quotes, in
  # case it ever sits under a folder with a space. Composing that quote from
  # its character code keeps this line free of nested escaping.
  $q = [char]34
  $argument = "-NoProfile -WindowStyle Hidden -File $q$PSCommandPath$q -Port $Port"

  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Settings $settings -Force | Out-Null
  Write-Host "Registered the scheduled task '$taskName' — it will start at logon." -ForegroundColor Green
}

Write-Host ""
Write-Host "Database ready at 127.0.0.1:$Port/$Database" -ForegroundColor Green
Write-Host "  Start the app with: npm run dev"
Write-Host ""
