# Contributing

Thanks for your interest in improving NavHub.

## Development Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open http://localhost:57529.

## Before Opening a Pull Request

Please run:

```bash
npm run lint
npm run build
```

If you change the Prisma schema, include the generated migration under `prisma/migrations/` and verify a fresh database can start successfully.

## Guidelines

- Keep changes focused and easy to review.
- Prefer small, reusable utilities over duplicating logic.
- Do not commit local databases, `.env` files, build output, or generated Prisma client files.
- Update README or related documentation when behavior changes.
- Treat the default deployment model as self-hosted and trusted unless authentication is explicitly added.
