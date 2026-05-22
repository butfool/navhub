import { Prisma } from '@/generated/prisma/client';

export type ApiError = {
  message: string;
  status: number;
};

export const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;

export function readString(value: unknown, field: string): string | ApiError {
  if (typeof value !== 'string' || !value.trim()) {
    return { message: `${field} is required`, status: 400 };
  }
  return value.trim();
}

export function readOptionalString(value: unknown, field: string): string | null | ApiError {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    return { message: `${field} must be a string`, status: 400 };
  }
  return value.trim() || null;
}

export function readOptionalOrder(value: unknown): number | undefined | ApiError {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return { message: 'order must be a non-negative integer', status: 400 };
  }
  return value;
}

export function readSafeUrl(value: unknown): string | ApiError {
  const url = readString(value, 'url');
  if (isApiError(url)) return url;
  if (DANGEROUS_URL_RE.test(url)) {
    return { message: 'Invalid URL scheme', status: 400 };
  }
  return url;
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'message' in value && 'status' in value;
}

export function prismaErrorToApiError(error: unknown): ApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { message: 'Record already exists', status: 409 };
    }
    if (error.code === 'P2003' || error.code === 'P2025') {
      return { message: 'Related record not found', status: 404 };
    }
  }

  return { message: 'Internal server error', status: 500 };
}
