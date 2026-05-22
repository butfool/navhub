import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function resolveDbPath(url: string | undefined): string {
  if (!url) return './dev.db';
  if (url.startsWith('file:')) return url.slice(5);
  return url;
}

const dbUrl = resolveDbPath(process.env.DATABASE_URL);

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
