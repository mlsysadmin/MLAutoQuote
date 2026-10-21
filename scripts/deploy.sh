#!/usr/bin/env bash
#
# One-command setup and deploy of M Lhuillier AutoQuote to Google Cloud Run.
#
# The bash twin of deploy.ps1, for Linux, macOS, WSL and Cloud Shell. Doing it
# in Cloud Shell needs nothing installed at all — open
# https://console.cloud.google.com, click the terminal icon, upload this
# package, and run it.
#
# Idempotent: every step checks what already exists, so this is both the first
# deploy and every deploy after.
#
#   ./scripts/deploy.sh --project YOUR_PROJECT_ID
#   ./scripts/deploy.sh --project YOUR_PROJECT_ID --skip-infra
#   ./scripts/deploy.sh --project YOUR_PROJECT_ID --site-url https://autoquote.example.com

set -euo pipefail

PROJECT_ID=""
REGION="asia-southeast1"
SERVICE="ml-autoquote"
SQL_INSTANCE="ml-autoquote-db"
DATABASE="ml_autoquote"
DB_USER="autoquote"
BUCKET=""
REPO="ml-autoquote"
SQL_TIER="db-g1-small"
SITE_URL=""
SKIP_INFRA="false"

usage() {
  sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --project)     PROJECT_ID="$2"; shift 2 ;;
    --region)      REGION="$2"; shift 2 ;;
    --service)     SERVICE="$2"; shift 2 ;;
    --sql-instance) SQL_INSTANCE="$2"; shift 2 ;;
    --bucket)      BUCKET="$2"; shift 2 ;;
    --sql-tier)    SQL_TIER="$2"; shift 2 ;;
    --site-url)    SITE_URL="$2"; shift 2 ;;
    --skip-infra)  SKIP_INFRA="true"; shift ;;
    -h|--help)     usage ;;
    *) echo "Unknown option: $1" >&2; usage ;;
  esac
done

[ -n "$PROJECT_ID" ] || { echo "ERROR: --project is required." >&2; usage; }
[ -n "$BUCKET" ] || BUCKET="${PROJECT_ID}-autoquote-photos"

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
note() { printf '    %s\n' "$1"; }

# `gcloud describe` writes to stderr and exits non-zero when a thing is absent.
exists() { "$@" >/dev/null 2>&1; }

# SESSION_SECRET signs staff session cookies, so it is generated and never
# fixed. The database password is set by DB_PASSWORD instead; see the note there.
random_secret() { openssl rand -base64 48 | tr -d '\n'; }

# Percent-encodes a password so it survives being put inside a URL.
urlencode() {
  local s="$1" out="" c
  for (( i=0; i<${#s}; i++ )); do
    c="${s:i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) out+=$(printf '%%%02X' "'$c") ;;
    esac
  done
  printf '%s' "$out"
}

# ── Preflight ───────────────────────────────────────────────────────────────

step "Checking prerequisites"
command -v gcloud >/dev/null 2>&1 || {
  echo "ERROR: gcloud not found. Install from https://cloud.google.com/sdk," >&2
  echo "       or run this in Cloud Shell, where it is already there." >&2
  exit 1
}
command -v openssl >/dev/null 2>&1 || {
  echo "ERROR: openssl not found; it is needed to generate secrets." >&2
  exit 1
}
gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . || {
  echo "ERROR: not signed in. Run: gcloud auth login" >&2
  exit 1
}

gcloud config set project "$PROJECT_ID" >/dev/null
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
SERVICE_ACCOUNT="${SERVICE}@${PROJECT_ID}.iam.gserviceaccount.com"

note "Project:   $PROJECT_ID"
note "Region:    $REGION"
note "Service:   $SERVICE"
note "Cloud SQL: $CONNECTION_NAME"
note "Bucket:    gs://$BUCKET"

# The house development password, used here too so every environment matches.
# What actually keeps this instance closed is that it has no public IP and Cloud
# Run reaches it over the Cloud SQL socket, which requires the
# roles/cloudsql.client IAM grant. If anyone ever gives the instance a public IP
# or an authorised network, set a real password here first.
DB_PASSWORD="${DB_PASSWORD:-1234567890}"

if [ "$SKIP_INFRA" != "true" ]; then

  step "Enabling APIs (a couple of minutes the first time)"
  gcloud services enable \
    run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
    cloudbuild.googleapis.com secretmanager.googleapis.com storage.googleapis.com \
    iamcredentials.googleapis.com vision.googleapis.com

  step "Artifact Registry repository"
  if exists gcloud artifacts repositories describe "$REPO" --location="$REGION"; then
    note "Already exists."
  else
    gcloud artifacts repositories create "$REPO" \
      --repository-format=docker --location="$REGION" \
      --description="M Lhuillier AutoQuote container images"
  fi

  step "Service account"
  if exists gcloud iam service-accounts describe "$SERVICE_ACCOUNT"; then
    note "Already exists."
  else
    gcloud iam service-accounts create "$SERVICE" \
      --display-name="M Lhuillier AutoQuote runtime"
  fi

  # serviceUsageConsumer lets the runtime call Cloud Vision to read uploaded
  # IDs: permission to use an enabled API in this project, and nothing else.
  for role in roles/cloudsql.client roles/secretmanager.secretAccessor \
              roles/storage.objectAdmin roles/iam.serviceAccountTokenCreator \
              roles/serviceusage.serviceUsageConsumer; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="$role" --condition=None >/dev/null
  done
  note "Runtime roles granted."

  # Cloud Build needs its own permissions if anyone deploys through
  # cloudbuild.yaml rather than this script.
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
  CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
  for role in roles/run.admin roles/iam.serviceAccountUser; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${CLOUD_BUILD_SA}" \
      --role="$role" --condition=None >/dev/null
  done
  gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" >/dev/null
  note "Cloud Build roles granted."

  step "Cloud SQL for MySQL"
  if exists gcloud sql instances describe "$SQL_INSTANCE"; then
    note "Instance already exists."
  else
    note "Creating the instance — this takes 5-10 minutes."
    gcloud sql instances create "$SQL_INSTANCE" \
      --database-version=MYSQL_8_0 --tier="$SQL_TIER" --region="$REGION" \
      --storage-auto-increase --backup-start-time=18:00 --availability-type=ZONAL
  fi

  if ! exists gcloud sql databases describe "$DATABASE" --instance="$SQL_INSTANCE"; then
    gcloud sql databases create "$DATABASE" --instance="$SQL_INSTANCE" \
      --charset=utf8mb4 --collation=utf8mb4_unicode_ci
  fi

  if ! gcloud sql users list --instance="$SQL_INSTANCE" --format='value(name)' \
       | grep -qx "$DB_USER"; then
    gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
    note "Database user created."
  else
    # Re-applied on every run, together with the DATABASE_URL secret below, so
    # the account and the connection string the service holds never drift apart.
    gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASSWORD"
    note "Database user already exists — password re-applied."
  fi

  step "Cloud Storage bucket for photos"
  if exists gcloud storage buckets describe "gs://${BUCKET}"; then
    note "Already exists."
  else
    gcloud storage buckets create "gs://${BUCKET}" --location="$REGION" \
      --uniform-bucket-level-access --public-access-prevention
  fi

  # Browsers PUT photos straight to the bucket, so it needs CORS. Objects stay
  # private; they are only ever read through a short-lived signed URL.
  CORS_FILE="$(mktemp)"
  cat > "$CORS_FILE" <<'JSON'
[{"origin":["*"],"method":["PUT","GET","HEAD"],"responseHeader":["Content-Type"],"maxAgeSeconds":3600}]
JSON
  gcloud storage buckets update "gs://${BUCKET}" --cors-file="$CORS_FILE"
  rm -f "$CORS_FILE"

  step "Secrets"
  if exists gcloud secrets describe autoquote-session-secret; then
    note "SESSION_SECRET already exists."
  else
    random_secret | gcloud secrets create autoquote-session-secret --data-file=-
    note "SESSION_SECRET created."
  fi

  # Prisma needs the password percent-encoded inside the URL.
  DB_URL="$(printf 'mysql://%s:%s@localhost/%s?socket=/cloudsql/%s' \
    "$DB_USER" "$(urlencode "$DB_PASSWORD")" "$DATABASE" "$CONNECTION_NAME")"

  if exists gcloud secrets describe autoquote-database-url; then
    # The account's password is re-applied above on every run, so the stored URL
    # has to be re-applied with it or the service is left holding a stale one.
    printf '%s' "$DB_URL" | gcloud secrets versions add autoquote-database-url --data-file=-
    note "DATABASE_URL updated to match the database user."
  else
    printf '%s' "$DB_URL" | gcloud secrets create autoquote-database-url --data-file=-
    note "DATABASE_URL created."
  fi
fi

# ── Build ───────────────────────────────────────────────────────────────────

step "Building the container image"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:$(date +%Y%m%d-%H%M%S)"

# Canonical and Open Graph URLs on the statically rendered pages are fixed at
# build time, so the origin has to be known now. Use the custom domain if given,
# otherwise whatever URL the service already has.
BUILD_SITE_URL="$SITE_URL"
if [ -z "$BUILD_SITE_URL" ]; then
  BUILD_SITE_URL=$(gcloud run services describe "$SERVICE" --region="$REGION" \
    --format='value(status.url)' 2>/dev/null || true)
fi

if [ -n "$BUILD_SITE_URL" ]; then
  note "Baking public origin: $BUILD_SITE_URL"
  gcloud builds submit --timeout=1800s --config=cloudbuild-image.yaml \
    --substitutions="_IMAGE=${IMAGE},_SITE_URL=${BUILD_SITE_URL}"
else
  note "No service URL yet — building without a baked origin."
  gcloud builds submit --tag "$IMAGE" --timeout=1800s
fi

# ── Deploy ──────────────────────────────────────────────────────────────────

step "Deploying to Cloud Run"
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --service-account="$SERVICE_ACCOUNT" \
  --add-cloudsql-instances="$CONNECTION_NAME" \
  --min-instances=1 --max-instances=20 --concurrency=80 \
  --cpu=1 --memory=1Gi --cpu-boost --timeout=60 \
  --set-secrets="DATABASE_URL=autoquote-database-url:latest,SESSION_SECRET=autoquote-session-secret:latest" \
  --set-env-vars="NODE_ENV=production,SKIP_MIGRATIONS=true,STORAGE_DRIVER=gcs,GCS_BUCKET=${BUCKET},GCS_SIGNER_EMAIL=${SERVICE_ACCOUNT},VALUATION_BUY_MARGIN=0.82,OFFER_VALIDITY_DAYS=7"

URL=$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')
[ -n "$SITE_URL" ] && URL="$SITE_URL"

step "Pointing the app at its own public URL"
# APP_URL is read at runtime, so robots.txt and the sitemap are right straight
# away even if the image was built before the URL existed.
gcloud run services update "$SERVICE" --region="$REGION" \
  --update-env-vars="APP_URL=${URL},NEXT_PUBLIC_APP_URL=${URL}" >/dev/null

# ── Schema ──────────────────────────────────────────────────────────────────

step "Applying database migrations"
"$(dirname "$0")/migrate-job.sh" \
  --project "$PROJECT_ID" --region "$REGION" \
  --service "$SERVICE" --sql-instance "$SQL_INSTANCE"

printf '\n\033[32mDeployed.\033[0m\n'
printf '  Customer site: %s\n' "$URL"
printf '  Staff portal:  %s/staff/login\n' "$URL"
printf '  Readiness:     %s/api/health/ready\n\n' "$URL"

if [ -z "$BUILD_SITE_URL" ]; then
  printf '\033[33mFirst deploy done. Canonical URLs were baked before the service\n'
  printf 'had an address, so run this once more to correct them:\033[0m\n'
  printf '  ./scripts/deploy.sh --project %s --skip-infra\n\n' "$PROJECT_ID"
fi

printf 'Create your first staff account with:\n'
printf '  ./scripts/create-user.sh --project %s --email you@mlhuillier.com --name "Your Name" --role ADMIN\n\n' "$PROJECT_ID"
