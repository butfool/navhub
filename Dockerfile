# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Copy full node_modules from builder (includes prisma CLI, better-sqlite3, etc.)
# Next.js standalone output only includes production deps, but prisma CLI is in devDependencies
COPY --from=builder /app/node_modules ./node_modules

# Startup script: run migrations then start server
COPY <<'EOF' /app/start.sh
#!/bin/sh
set -e
npx prisma migrate deploy
exec node server.js
EOF
RUN chmod +x /app/start.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:./data/db.sqlite"

CMD ["/app/start.sh"]
