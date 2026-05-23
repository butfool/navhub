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
RUN npx prisma generate && \
    ln -sfn /app/src/generated/prisma /app/node_modules/.prisma && \
    ln -sfn /app/src/generated/prisma /app/node_modules/.prisma/client
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
# Copy Prisma generated client (symlinked from custom output location)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3

# Copy dotenv for prisma config
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

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
