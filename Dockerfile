# syntax=docker/dockerfile:1

# Stage 1: Frontend build
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Go build
FROM golang:1.24-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy frontend dist to cmd/server/web/dist (go:embed in cmd/server/main.go embeds this path)
COPY --from=frontend /app/cmd/server/web/dist ./cmd/server/web/dist
# Build with CGO_ENABLED=0 for pure static binary
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o navhub ./cmd/server

# Stage 3: Runner
FROM gcr.io/distroless/static:nonroot
COPY --from=backend /app/navhub /navhub
# Copy migrations
COPY --from=backend /app/migrations ./migrations

USER nonroot
EXPOSE 3000
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/db.sqlite
WORKDIR /app
VOLUME ["/app/data"]
ENTRYPOINT ["/navhub"]