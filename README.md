# NavHub

Personal navigation dashboard for organizing web services by category. Built with Next.js 16, Prisma + SQLite, and shadcn/ui-style components.

---

## English

### Overview

NavHub is a self-hosted personal dashboard that helps you organize and access your frequently-used web services in one place. Categorize services, assign icons and colors, and launch them with a single click.

### Features

- **Category Management** — Group services into categories with custom names, icons, and colors
- **Service Cards** — Add any web service with name, URL, description, icon, and color
- **Dark/Light Theme** — System-aware theme with manual toggle, synchronized via CSS variables
- **REST API** — Full CRUD for categories and services via `/api/categories` and `/api/services`
- **SQLite Persistence** — Lightweight file-based database via Prisma + better-sqlite3
- **Docker Deploy** — Standalone Docker image with GitHub Actions CI/CD

### Quick Start

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:57529](http://localhost:57529).

### Project Structure

```
src/app/page.tsx              # Main dashboard (client component)
src/app/components/           # UI components
  CategorySection.tsx         # Category container with service cards
  ServiceModal.tsx            # Add/edit service form
  CategoryModal.tsx           # Add/edit category form
  IconColorPicker.tsx         # Icon and color selector
src/app/api/
  services/route.ts           # REST API for Service CRUD
  categories/route.ts        # REST API for Category CRUD
prisma/schema.prisma          # Database schema (Category, Service)
src/lib/                      # Utilities: prisma client, color helpers, icons
```

### Commands

```bash
npm run dev      # Dev server on port 57529
npm run build    # Production standalone build
npm run lint     # ESLint check
npx prisma generate   # Regenerate Prisma client
npx prisma migrate dev  # Run migrations
```

### Deployment

```bash
# Server setup
mkdir -p ~/navhub && cd ~/navhub
# Place docker-compose.yml and set PORT=57529 in .env
docker compose up -d

# Update
docker compose pull && docker compose up -d
```

The SQLite database is persisted at `./data/db.sqlite` via Docker volume.

---

## 中文

### 简介

NavHub 是一个自托管的个人导航面板，用于整理和访问常用的网络服务。支持按分类管理、一键启动服务、自定义图标颜色，以及亮/暗主题。

### 功能特性

- **分类管理** — 将服务归类到不同分类，支持自定义名称、图标和颜色
- **服务卡片** — 添加任意网络服务，包括名称、地址、描述、图标和颜色
- **亮/暗主题** — 支持跟随系统偏好或手动切换，通过 CSS 变量实现
- **REST API** — 通过 `/api/categories` 和 `/api/services` 提供完整的增删改查接口
- **SQLite 持久化** — 使用 Prisma + better-sqlite3，轻量级文件数据库
- **Docker 部署** — 独立 Docker 镜像，配合 GitHub Actions CI/CD 自动构建

### 快速开始

```bash
npm install
npx prisma generate
npm run dev
```

访问 [http://localhost:57529](http://localhost:57529)。

### 项目结构

```
src/app/page.tsx              # 主面板页面（客户端组件）
src/app/components/           # UI 组件
  CategorySection.tsx         # 分类容器及服务卡片
  ServiceModal.tsx            # 添加/编辑服务表单
  CategoryModal.tsx           # 添加/编辑分类表单
  IconColorPicker.tsx         # 图标和颜色选择器
src/app/api/
  services/route.ts           # 服务的 REST API
  categories/route.ts         # 分类的 REST API（含嵌套服务）
prisma/schema.prisma          # 数据库模型（Category, Service）
src/lib/                      # 工具函数：Prisma 客户端、颜色处理、图标库
```

### 命令

```bash
npm run dev      # 开发服务器，端口 57529
npm run build    # 生产环境独立构建
npm run lint     # ESLint 检查
npx prisma generate   # 重新生成 Prisma 客户端
npx prisma migrate dev  # 运行数据库迁移
```

### 部署

```bash
# 服务器部署
mkdir -p ~/navhub && cd ~/navhub
# 放入 docker-compose.yml 并在 .env 中设置 PORT=57529
docker compose up -d

# 更新
docker compose pull && docker compose up -d
```

SQLite 数据库通过 Docker volume 挂载到 `./data/db.sqlite`。