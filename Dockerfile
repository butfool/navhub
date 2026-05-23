# syntax=docker/dockerfile:1

# Stage 1: Base
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 2: Install dependencies (build tools needed for better-sqlite3 compilation)
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Stage 3: Build
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# env("DATABASE_URL") requires the var to exist; dummy value for prisma generate
ENV DATABASE_URL=file:./dev.db
RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Strip devDependencies, keeping compiled native modules and prisma CLI
RUN npm prune --omit=dev

# Stage 4: Production runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:./data/db.sqlite"

# Standalone output (traced node_modules + server.js)
COPY --from=builder /app/.next/standalone ./
# Full production node_modules (prisma CLI, effect, compiled better-sqlite3, etc.)
COPY --from=builder /app/node_modules ./node_modules
# Static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma runtime for migrate deploy
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
# Generated Prisma client at the location Prisma CLI expects
COPY --from=builder /app/src/generated/prisma ./node_modules/.prisma/client

# Startup
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e
npx prisma migrate deploy
exec node server.js
EOF
RUN chmod +x /app/start.sh

USER node
EXPOSE 3000
CMD ["/app/start.sh"]
