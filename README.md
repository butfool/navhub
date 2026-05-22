# NavHub

A lightweight self-hosted navigation dashboard for organizing frequently used web services by category.

NavHub is built with Next.js App Router, Prisma, SQLite, and Docker. It is designed for personal dashboards, homelabs, and private team portals.

## Features

- Category management with custom names, icons, colors, and order
- Service cards with URL, description, icon, and color
- Drag-and-drop sorting for categories and services
- Dark, light, and system-aware themes
- REST API for category and service CRUD
- SQLite persistence via Prisma and better-sqlite3
- Docker image with automatic database migrations on startup

## Screenshots

Screenshots are not included yet. If you are publishing this project publicly, add a screenshot or GIF here so users can understand the UI before installing it.

## Tech Stack

- Next.js 16 App Router
- React 19
- Prisma 7
- SQLite via better-sqlite3
- Tailwind CSS v4
- Radix UI primitives
- dnd-kit
- Docker / GitHub Container Registry

## Security Notice

NavHub is intended for trusted self-hosted environments.

By default, the dashboard and CRUD API do not include authentication or authorization. If you expose NavHub outside a trusted network, protect it with an authentication layer such as a reverse proxy, Basic Auth, Cloudflare Access, OAuth proxy, or another access-control solution.

Do not directly expose write APIs to the public internet unless you add authentication.

Relevant endpoints:

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories`
- `DELETE /api/categories`
- `GET /api/services`
- `POST /api/services`
- `PUT /api/services`
- `DELETE /api/services`

## Requirements

- Node.js 22 or newer
- npm
- SQLite support through `better-sqlite3`

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite database path used by Prisma |
| `PORT` | `57529` locally, `3000` in Docker | HTTP port |

Example local `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

## Local Development

```bash
npm install
cp .env.example .env # optional, or create .env manually
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open http://localhost:57529.

If you do not use `.env.example`, create `.env` manually:

```bash
DATABASE_URL="file:./dev.db"
```

Common commands:

```bash
npm run dev             # Start dev server on port 57529
npm run lint            # Run ESLint
npm run build           # Build standalone production output
npx prisma generate     # Regenerate Prisma client
npx prisma migrate dev  # Create/apply development migrations
```

## Docker Deployment

Create a deployment directory and place `docker-compose.yml` there:

```bash
mkdir -p ~/navhub
cd ~/navhub
curl -O https://raw.githubusercontent.com/butfool/navhub/master/docker-compose.yml
printf 'PORT=57529\n' > .env
docker compose up -d
```

The container stores SQLite data at:

```text
./data/db.sqlite
```

The Docker entrypoint runs Prisma migrations before starting the Next.js server.

Upgrade:

```bash
docker compose pull
docker compose up -d
```

Backup SQLite data:

```bash
cp ./data/db.sqlite ./data/db.sqlite.backup
```

For production, place NavHub behind an authentication layer before exposing it publicly.

## Project Structure

```text
src/app/page.tsx                  # Dashboard page composition
src/app/hooks/                    # Client hooks for theme and navigation data
src/app/lib/api-client.ts         # Browser-side API client
src/app/types.ts                  # Shared app types
src/app/components/nav/           # Dashboard-specific UI components
src/app/components/dialogs/       # Service/category dialogs and icon picker
src/app/components/ui/            # Radix/shadcn-style primitives
src/app/api/categories/route.ts   # Category REST API
src/app/api/services/route.ts     # Service REST API
src/app/api/utils.ts              # API validation and error helpers
src/lib/                          # Prisma client, color helpers, icon registry
prisma/schema.prisma              # Database schema
```

## REST API

The API returns JSON. Write endpoints validate required fields and reject dangerous URL schemes such as `javascript:`, `data:`, and `vbscript:`.

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories`
- `DELETE /api/categories?id=<id>`

### Services

- `GET /api/services`
- `POST /api/services`
- `PUT /api/services`
- `DELETE /api/services?id=<id>`

## License

MIT. See [LICENSE](./LICENSE).

---

## 中文说明

NavHub 是一个轻量级自托管导航面板，用于按分类整理常用 Web 服务。适合个人主页、Homelab、内网工具导航和小团队入口页。

### 功能特性

- 分类管理：名称、图标、颜色、排序
- 服务卡片：URL、描述、图标、颜色
- 分类和服务拖拽排序
- 暗色、亮色、跟随系统主题
- 分类和服务 REST API
- Prisma + SQLite 持久化
- Docker 部署，容器启动时自动执行数据库迁移

### 安全说明

NavHub 默认面向可信自托管环境设计。

当前页面和 CRUD API 默认不包含登录、鉴权或权限系统。如果要暴露到公网，请务必放在反向代理认证、Basic Auth、Cloudflare Access、OAuth Proxy 或其他访问控制方案之后。

不要在未加认证的情况下把写接口直接暴露到公网。

### 环境要求

- Node.js 22 或更新版本
- npm
- SQLite / better-sqlite3 运行环境

### 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | Prisma 使用的 SQLite 数据库路径 |
| `PORT` | 本地 `57529`，Docker 内 `3000` | HTTP 端口 |

### 本地开发

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

访问 http://localhost:57529。

如果没有 `.env`，请创建：

```bash
DATABASE_URL="file:./dev.db"
```

### Docker 部署

```bash
mkdir -p ~/navhub
cd ~/navhub
curl -O https://raw.githubusercontent.com/butfool/navhub/master/docker-compose.yml
printf 'PORT=57529\n' > .env
docker compose up -d
```

SQLite 数据保存在：

```text
./data/db.sqlite
```

升级：

```bash
docker compose pull
docker compose up -d
```

备份：

```bash
cp ./data/db.sqlite ./data/db.sqlite.backup
```

### 许可证

MIT，详见 [LICENSE](./LICENSE)。
