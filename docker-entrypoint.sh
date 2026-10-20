#!/bin/sh
#
# Container startup.
#
# Cloud Run gives a new revision a limited window to start listening on $PORT.
# Anything that runs before the server is a chance to miss that window: a Cloud
# SQL instance that is cold, a connector that isn't ready, a bad password — any
# of them would stop the revision from ever starting, and the deploy fails with
# an error about the port rather than about the database.
#
# So the server starts first, always. Migrations are opt-in, run in the
# background, and can never take the container down.
#
# Applying the schema is a separate concern, and `scripts/migrate-job.ps1` runs
# it as a one-off Cloud Run Job against the same image — which is the right
# place for it, because a migration should run once per deploy and not once per
# container instance.

set -e

run_migrations_in_background() {
  (
    echo "[migrate] applying pending migrations in the background…"
    if node_modules/.bin/prisma migrate deploy; then
      echo "[migrate] done."
    else
      # Deliberately swallowed: the server is already serving. A failure here
      # is loud in the logs and visible on /api/health/ready, but it must not
      # kill a revision that is otherwise healthy.
      echo "[migrate] FAILED — the app is running but the schema may be stale."
      echo "[migrate] Run scripts/migrate-job.ps1 to apply migrations properly."
    fi
  ) &
}

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "[startup] SKIP_MIGRATIONS=true — not touching the database."
elif [ "${MIGRATE_ON_START}" = "true" ]; then
  run_migrations_in_background
else
  echo "[startup] Migrations not run at startup (set MIGRATE_ON_START=true to"
  echo "[startup] change that, or run scripts/migrate-job.ps1 — recommended)."
fi

echo "[startup] starting server on port ${PORT:-8080}…"
exec "$@"
