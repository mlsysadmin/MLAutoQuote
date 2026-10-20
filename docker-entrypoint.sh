#!/bin/sh
set -e

# Applies any pending schema changes before the first request is served.
# `migrate deploy` only runs migrations that haven't been applied yet, so it is
# safe on every container start — including when Cloud Run scales out and
# several containers start at once.
if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "SKIP_MIGRATIONS=true — not applying migrations."
else
  echo "Applying database migrations..."
  node_modules/.bin/prisma migrate deploy
fi

exec "$@"
