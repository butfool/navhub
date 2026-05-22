# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NavHub is a Next.js 16.2.6 (App Router) navigation dashboard that organizes web services by category. It uses Prisma with SQLite (better-sqlite3 adapter) for data persistence. Deployed via Docker with GitHub Actions CI/CD to GHCR.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 57529
npm run build        # Production build (standalone output)
npm run lint          # ESLint check

# Prisma
npx prisma generate   # Regenerate Prisma client from schema
npx prisma migrate dev # Run migrations
```

## Architecture

### Data Flow
- `src/lib/prisma.ts` - Singleton Prisma client, reads DB path from DATABASE_URL env (default: `file:./dev.db`)
- `src/generated/prisma/` - Auto-generated Prisma client (do not edit manually, regenerate with `prisma generate`)
- `src/app/api/services/route.ts` - REST API for Service CRUD (GET, POST, PUT, DELETE)
- `src/app/api/categories/route.ts` - REST API for Category CRUD, includes nested services

### Database Schema (Prisma)
- Model `Category`: id, name (unique), icon, color, order, services[]
- Model `Service`: id, name, categoryId (FK → Category, onDelete: Cascade), url, description, icon, color, order
- Deleting a category cascades and removes all its services

### Key Files
- `src/app/page.tsx` - Dashboard page composition, delegates to hooks and components
- `src/app/hooks/use-theme.ts` - Theme state and system preference listening
- `src/app/hooks/use-nav-data.ts` - Category/service CRUD, reordering, and loading
- `src/app/lib/api-client.ts` - Browser-side fetch wrapper for categories and services APIs
- `src/app/types.ts` - Shared TypeScript types for Category and Service
- `src/app/components/nav/` - Dashboard-specific UI components (CategorySection)
- `src/app/components/dialogs/` - ServiceModal, CategoryModal, IconColorPicker
- `src/app/components/ui/` - shadcn/ui-style primitives (button, dialog, input, etc.)
- `src/app/api/categories/route.ts` - REST API for Category CRUD, includes nested services
- `src/app/api/services/route.ts` - REST API for Service CRUD
- `src/app/api/utils.ts` - Input validation helpers and Prisma error mapping
- `src/app/globals.css` - Global CSS with Tailwind v4 and CSS variables for theming
- `src/lib/utils.ts` - `cn()` utility for Tailwind class merging
- `src/lib/color.ts` - Color helpers (hexToRgba, rgbaToHex, rgbaToForeground, rgbaToGradient)
- `src/lib/icons/` - Icon system supporting two packs via key prefix: `lucide:name` (stroke icons), `simple:slug` (brand icons), or bare name (defaults to lucide)
- `prisma/schema.prisma` - Database schema, output set to `src/generated/prisma`

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)

### Styling
- Tailwind CSS v4 is used with CSS-first configuration (via `@theme` in globals.css)
- Theme variables (`--bg-primary`, `--accent-violet`, etc.) are defined in `:root` and `[data-theme="light"]`
- Custom CSS classes are defined directly in globals.css (not in tailwind.config)
- shadcn/ui-style components in `src/app/components/ui/` (button, dialog, input, label, popover, scroll-area, textarea)

## Deployment

Pushing to `master` triggers GitHub Actions to build and push a Docker image to `ghcr.io/butfool/navhub`.

### Server setup
```bash
mkdir -p ~/navhub && cd ~/navhub
# Place docker-compose.yml from the repo
echo "PORT=57529" > .env
docker compose up -d

# Update
docker compose pull && docker compose up -d
```

The SQLite database is persisted at `./data/db.sqlite` via Docker volume.

## Important Notes

**Next.js version**: This uses Next.js 16.2.6 with breaking changes from earlier versions. APIs, conventions, and file structure may differ from training data. Consult `node_modules/next/dist/docs/` for current documentation.

**No tests currently exist** in this codebase.

**CI**: PRs and pushes to `master` run lint and build via `.github/workflows/ci.yml`. The Docker workflow builds and pushes to GHCR on push to `master`.

**Database**: Uses SQLite. Path configured via `DATABASE_URL` env var (format: `file:./dev.db`). Docker default: `file:./data/db.sqlite`.

**Standalone output**: `next.config.ts` has `output: 'standalone'` for Docker deployment. The Dockerfile uses a multi-stage build; the runner stage only includes the standalone output + runtime deps.

**Animation**: Uses `motion` (v12, formerly framer-motion) for card, modal, and layout animations. CSS variables define motion tokens (`--ease-spring-soft`, `--dur-base`, etc.) used in `globals.css`.

**Theme system**: Theme is applied via a synchronous inline `<script>` in layout.tsx `<head>` to prevent FART (flash of incorrect theme). The `useTheme` hook in page.tsx handles runtime theme changes and system preference listening.

**Category-Service relation**: Service references Category via `categoryId` foreign key. The categories API includes nested services in responses, so the frontend fetches categories once and gets all data. Category renames no longer need cascade updates.
