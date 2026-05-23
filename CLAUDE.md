# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NavHub is a Go + React/Vite navigation dashboard that organizes web services by category. The Go backend serves both the JSON API and the embedded React SPA from a single binary. Uses SQLite for data persistence. Deployed via Docker with GitHub Actions CI/CD to GHCR.

## Commands

```bash
# Frontend (web/)
cd web && npm run dev          # Start Vite dev server
cd web && npm run build        # Production build

# Backend (Go)
go build -o navhub ./cmd/server # Build binary
go test ./...                   # Run tests
go vet ./...                    # Lint

# Docker
docker build -t navhub .
docker compose up -d
```

## Architecture

### Backend (Go)
- `cmd/server/main.go` - HTTP server with embedded static assets
- `internal/` - Store, handlers, models (not used yet, may be removed)
- `migrations/` - SQL migrations for SQLite schema

### Frontend (web/)
- `web/src/App.tsx` - Main React app
- `web/src/hooks/use-theme.ts` - Theme state and system preference listening
- `web/src/hooks/use-nav-data.ts` - Category/service CRUD, reordering, and loading
- `web/src/lib/api-client.ts` - Browser-side fetch wrapper for categories and services APIs
- `web/src/types.ts` - Shared TypeScript types for Category and Service
- `web/src/components/nav/CategorySection.tsx` - Dashboard category with services
- `web/src/components/dialogs/` - ServiceModal, CategoryModal, IconColorPicker
- `web/src/components/ui/` - shadcn/ui-style primitives (button, dialog, input, etc.)
- `web/src/lib/icons/` - Icon system (lucide + simple-icons)
- `web/src/lib/color.ts` - Color helpers (hexToRgba, rgbaToHex, etc.)
- `web/src/globals.css` - Global CSS with theme variables

### API Routes (Go)
- `GET /api/categories` - List all categories with nested services
- `POST /api/categories` - Create category
- `PUT /api/categories?id=...` - Update category (supports partial updates, reorder)
- `DELETE /api/categories?id=...` - Delete category (cascades to services)
- `GET /api/services` - List all services with their category
- `POST /api/services` - Create service
- `PUT /api/services?id=...` - Update service (supports partial updates)
- `DELETE /api/services?id=...` - Delete service

### Database Schema (SQLite)
- Table `Category`: id, name (unique), icon, color, "order", createdAt, updatedAt
- Table `Service`: id, name, categoryId (FK → Category, ON DELETE CASCADE), url, description, icon, color, "order", createdAt, updatedAt

### Path Alias
`@/*` maps to `./web/src/*` (configured in web/tsconfig.json)

## Deployment

Pushing to `master` triggers GitHub Actions to build and push a Docker image to `ghcr.io/butfool/navhub`.

### Server setup
```bash
mkdir -p ~/navhub && cd ~/navhub
# Place docker-compose.yml from the repo
docker compose up -d

# Update
docker compose pull && docker compose up -d
```

The SQLite database is persisted at `./data/db.sqlite` via Docker volume.

## Important Notes

**No tests currently exist** in this codebase.

**CI**: `.github/workflows/ci.yml` runs Go vet, Go build, frontend lint, and frontend build.

**Database**: Uses SQLite via `modernc.org/sqlite` (pure Go, no CGO). Path configured via `DATABASE_URL` env var (default: `file:/app/data/db.sqlite`).

**Docker image**: Multi-stage build produces a ~15MB distroless/static image containing only the Go binary. No Node.js, no Next.js runtime.

**Animation**: Uses `motion` (v12) for card, modal, and layout animations. CSS variables define motion tokens.

**Theme system**: Theme is applied via a synchronous inline `<script>` in `web/index.html` to prevent flash of incorrect theme. The `useTheme` hook handles runtime theme changes and system preference listening.

**Dev mode**: Run `go run ./cmd/server` for the backend on port 3000, and `cd web && npm run dev` for the frontend with Vite proxying `/api` requests to the Go backend.