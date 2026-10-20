# syntax=docker/dockerfile:1
#
# M Lhuillier AutoQuote — production image for Google Cloud Run.
#
# Multi-stage so the final image carries the standalone Next server, the static
# assets and the Prisma engine, and nothing else. That keeps the pull small and
# the cold start short, which is what the customer actually feels.

FROM node:22-slim AS base
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---- Build ----
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Canonical URLs and Open Graph tags on statically rendered pages are resolved
# at build time, so the public origin has to be known here. Pass it with
# --build-arg NEXT_PUBLIC_APP_URL=https://your-domain. robots.txt and the
# sitemap read APP_URL at runtime instead, so those are always correct.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run always sends traffic to $PORT; 8080 is its default.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + the assets it serves.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema, migrations and CLI so `migrate deploy` can run at startup.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
