# syntax=docker/dockerfile:1
#
# M Lhuillier AutoQuote — production image for Google Cloud Run.

FROM node:22-slim AS base
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

# COPY exact file names (avoid trailing asterisks to prevent pattern matching issues)
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Clean installation without audit or fund notices
RUN npm ci --no-audit --no-fund

# Generate Prisma Client early so module types exist inside node_modules
RUN npx prisma generate

# ---- Build ----
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_APP_URL="https://ml-autoquote-376318511165.asia-southeast1.run.app"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Copy dependencies (including pre-generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerate Prisma Client & build Next.js standalone output
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema, CLI, and generated client engine
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Tesseract WebAssembly engine
COPY --from=builder /app/node_modules/tesseract.js-core ./node_modules/tesseract.js-core

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]