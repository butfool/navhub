# NavHub

A lightweight self-hosted navigation dashboard for organizing frequently used web services by category.

Built with Go + React/Vite, single binary, SQLite persistence, Docker deployed.

## Features

- Category management with custom names, icons, colors, and order
- Service cards with URL, description, icon, and color
- Drag-and-drop sorting for categories and services
- Dark, light, and system-aware themes
- REST API for category and service CRUD
- SQLite persistence via `modernc.org/sqlite` (pure Go, no CGO)
- Docker image ~17MB (distroless/static)

## Tech Stack

- Go 1.24 (embed static assets)
- React 19 + Vite 6
- SQLite via `modernc.org/sqlite`
- Tailwind CSS v3
- Radix UI primitives
- dnd-kit
- Docker / GitHub Container Registry

## Security Notice

NavHub is intended for trusted self-hosted environments.

By default, the dashboard and CRUD API do not include authentication or authorization. If you expose NavHub outside a trusted network, protect it with an authentication layer such as a reverse proxy, Basic Auth, Cloudflare Access, OAuth proxy, or another access-control solution.

Do not directly expose write APIs to the public internet unless you add authentication.

## Requirements

- Go 1.24 (local dev)
- Node.js 22 (frontend dev)
- Docker (deployment)

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` in Docker, `3000` locally | HTTP port |
| `DATABASE_URL` | `file:/app/data/db.sqlite` (Docker only) | SQLite path |

## Local Development

Frontend dev (proxies `/api` to Go backend):

```bash
cd web
npm install
npm run dev
```

Backend dev (from project root):

```bash
go run ./cmd/server
```

Open http://localhost:3000.

## Production Build

From project root:

```bash
npm --prefix web run build   # builds into cmd/server/web/dist
go build -o navhub ./cmd/server
./navhub
```

## Docker Deployment

```bash
mkdir -p ~/navhub && cd ~/navhub
curl -O https://raw.githubusercontent.com/butfool/navhub/master/docker-compose.yml
docker compose up -d
```

Open http://localhost:57529.

Upgrade:

```bash
docker compose pull && docker compose up -d
```

SQLite data is persisted at `./data/db.sqlite`.

Backup:

```bash
cp ./data/db.sqlite ./data/db.sqlite.backup
```

## Project Structure

```text
cmd/server/main.go              # Go HTTP server, embedded static assets
cmd/server/web/dist/            # Embedded Vite production output
migrations/                     # SQL migrations
web/src/App.tsx                 # Main React app
web/src/hooks/use-theme.ts      # Theme state and system preference
web/src/hooks/use-nav-data.ts   # Category/service CRUD
web/src/lib/api-client.ts      # Browser-side fetch wrapper
web/src/types.ts                # Shared TypeScript types
web/src/components/nav/         # Dashboard category components
web/src/components/dialogs/     # Service/category dialogs, icon picker
web/src/components/ui/          # shadcn-style primitives
```

## API Routes

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories?id=<id>`
- `DELETE /api/categories?id=<id>`

### Services

- `GET /api/services`
- `POST /api/services`
- `PUT /api/services?id=<id>`
- `DELETE /api/services?id=<id>`

The API validates required fields and rejects dangerous URL schemes (`javascript:`, `data:`, `vbscript:`).

## License

Apache 2.0. See [LICENSE](./LICENSE).