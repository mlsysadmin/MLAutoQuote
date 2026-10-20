#!/usr/bin/env bash
#
# Creates a staff account on the deployed database.
#
# The bash twin of create-user.ps1. Opens a Cloud SQL Auth Proxy tunnel, runs
# scripts/create-user.mjs through it, then closes the tunnel.
#
# Needs the cloud-sql-proxy binary on PATH:
#   https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases
# It is already present in Cloud Shell.
#
# If DATABASE_URL is already set in your shell, the tunnel is skipped and the
# script runs straight against it.
#
#   ./scripts/create-user.sh --project my-project \
#     --email you@mlhuillier.com --name "Your Name" --role ADMIN

set -euo pipefail

PROJECT_ID=""
EMAIL=""
NAME=""
ROLE="APPRAISER"
BRANCH=""
PASSWORD=""
REGION="asia-southeast1"
SQL_INSTANCE="ml-autoquote-db"
LOCAL_PORT="3307"

while [ $# -gt 0 ]; do
  case "$1" in
    --project)      PROJECT_ID="$2"; shift 2 ;;
    --email)        EMAIL="$2"; shift 2 ;;
    --name)         NAME="$2"; shift 2 ;;
    --role)         ROLE="$2"; shift 2 ;;
    --branch)       BRANCH="$2"; shift 2 ;;
    --password)     PASSWORD="$2"; shift 2 ;;
    --region)       REGION="$2"; shift 2 ;;
    --sql-instance) SQL_INSTANCE="$2"; shift 2 ;;
    --port)         LOCAL_PORT="$2"; shift 2 ;;
    -h|--help)      sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[ -n "$EMAIL" ] || { echo "ERROR: --email is required." >&2; exit 1; }
[ -n "$NAME" ] || { echo "ERROR: --name is required." >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ARGS=(scripts/create-user.mjs --email "$EMAIL" --name "$NAME" --role "$ROLE")
[ -n "$BRANCH" ] && ARGS+=(--branch "$BRANCH")
[ -n "$PASSWORD" ] && ARGS+=(--password "$PASSWORD")

# ── Already pointed at a database? Just run. ────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  printf '\033[36mUsing DATABASE_URL from your environment.\033[0m\n'
  cd "$REPO_ROOT" && exec node "${ARGS[@]}"
fi

[ -n "$PROJECT_ID" ] || {
  echo "ERROR: either set DATABASE_URL, or pass --project to tunnel to Cloud SQL." >&2
  exit 1
}
command -v cloud-sql-proxy >/dev/null 2>&1 || {
  echo "ERROR: cloud-sql-proxy not found on PATH." >&2
  echo "       https://github.com/GoogleCloudPlatform/cloud-sql-proxy/releases" >&2
  exit 1
}

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

printf '\033[36mReading the connection string from Secret Manager...\033[0m\n'
SECRET=$(gcloud secrets versions access latest \
  --secret=autoquote-database-url --project="$PROJECT_ID")

# The deployed URL connects over a unix socket; swap that for the local tunnel.
if [[ ! "$SECRET" =~ ^mysql://([^:]+):([^@]+)@[^/]*/([^?]+) ]]; then
  echo "ERROR: couldn't parse the stored DATABASE_URL." >&2
  exit 1
fi
DB_USER="${BASH_REMATCH[1]}"
DB_PASS="${BASH_REMATCH[2]}"
DB_NAME="${BASH_REMATCH[3]}"

printf '\033[36mOpening a tunnel to %s on port %s...\033[0m\n' "$CONNECTION_NAME" "$LOCAL_PORT"
cloud-sql-proxy --port "$LOCAL_PORT" "$CONNECTION_NAME" &
PROXY_PID=$!
cleanup() { kill "$PROXY_PID" 2>/dev/null || true; }
trap cleanup EXIT

# Give the proxy a moment to bind before Prisma connects.
for _ in $(seq 1 40); do
  if (exec 3<>"/dev/tcp/127.0.0.1/${LOCAL_PORT}") 2>/dev/null; then
    exec 3>&- 3<&-
    break
  fi
  sleep 0.5
done

export DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@127.0.0.1:${LOCAL_PORT}/${DB_NAME}"
cd "$REPO_ROOT"
node "${ARGS[@]}"
