#!/usr/bin/env bash
#
# Applies pending database migrations as a one-off Cloud Run Job.
#
# The bash twin of migrate-job.ps1. Runs `prisma migrate deploy` once, in the
# same image the service runs, with the same Cloud SQL connection and secret.
#
# Separate from the service on purpose: a migration should run once per deploy,
# not once per container instance — and running it during container startup is
# what stops a revision from listening on $PORT in time when the database is
# cold, which Cloud Run reports as a port error.
#
# Safe to re-run; only pending migrations are applied.
#
#   ./scripts/migrate-job.sh --project YOUR_PROJECT_ID

set -euo pipefail

PROJECT_ID=""
REGION="asia-southeast1"
SERVICE="ml-autoquote"
JOB_NAME="ml-autoquote-migrate"
SQL_INSTANCE="ml-autoquote-db"
IMAGE=""
DATABASE_SECRET="autoquote-database-url"

while [ $# -gt 0 ]; do
  case "$1" in
    --project)      PROJECT_ID="$2"; shift 2 ;;
    --region)       REGION="$2"; shift 2 ;;
    --service)      SERVICE="$2"; shift 2 ;;
    --job-name)     JOB_NAME="$2"; shift 2 ;;
    --sql-instance) SQL_INSTANCE="$2"; shift 2 ;;
    --image)        IMAGE="$2"; shift 2 ;;
    --secret)       DATABASE_SECRET="$2"; shift 2 ;;
    -h|--help)      sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[ -n "$PROJECT_ID" ] || { echo "ERROR: --project is required." >&2; exit 1; }

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
exists() { "$@" >/dev/null 2>&1; }

command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud not found." >&2; exit 1;
}

gcloud config set project "$PROJECT_ID" >/dev/null
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
SERVICE_ACCOUNT="${SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"

# Default to exactly what the service runs, so the migration matches the code
# that will use it.
if [ -z "$IMAGE" ]; then
  step "Finding the image the service is running"
  IMAGE=$(gcloud run services describe "$SERVICE" --region="$REGION" \
    --format='value(spec.template.spec.containers[0].image)' 2>/dev/null || true)
  [ -n "$IMAGE" ] || {
    echo "ERROR: couldn't read the service image. Deploy first, or pass --image." >&2
    exit 1
  }
fi
printf '    Image:     %s\n' "$IMAGE"
printf '    Cloud SQL: %s\n' "$CONNECTION_NAME"

if exists gcloud run jobs describe "$JOB_NAME" --region="$REGION"; then
  VERB="update"; step "Updating the migration job"
else
  VERB="create"; step "Creating the migration job"
fi

gcloud run jobs "$VERB" "$JOB_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --service-account="$SERVICE_ACCOUNT" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=${DATABASE_SECRET}:latest" \
  --command="node_modules/.bin/prisma" \
  --args="migrate,deploy" \
  --max-retries=1 \
  --task-timeout=10m \
  --memory=512Mi

step "Applying migrations"
if ! gcloud run jobs execute "$JOB_NAME" --region="$REGION" --wait; then
  printf '\n\033[31mMigration failed. Read the logs with:\033[0m\n'
  printf '  gcloud run jobs executions list --job=%s --region=%s\n' "$JOB_NAME" "$REGION"
  exit 1
fi

printf '\n\033[32mMigrations applied.\033[0m\n'
printf 'Confirm with: curl https://YOUR-SERVICE-URL/api/health/ready\n\n'
