import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DANGEROUS_URL_RE = /^(javascript|data|vbscript):/i;

function isSafeUrl(url: unknown): url is string {
  return typeof url === 'string' && !DANGEROUS_URL_RE.test(url.trim());
}

export async function GET() {
  const services = await prisma.service.findMany({
    include: { category: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, categoryId, url, description, icon, color } = body;

  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
  }

  const maxOrder = await prisma.service.aggregate({
    where: { categoryId },
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const service = await prisma.service.create({
    data: {
      name,
      categoryId,
      url,
      description: description || null,
      icon,
      color,
      order,
    },
    include: { category: true },
  });
  return NextResponse.json(service);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, name, categoryId, url, description, icon, color, order } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (categoryId !== undefined) data.categoryId = categoryId;
  if (url !== undefined) {
    if (!isSafeUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL scheme' }, { status: 400 });
    }
    data.url = url;
  }
  if (description !== undefined) data.description = description || null;
  if (icon !== undefined) data.icon = icon;
  if (color !== undefined) data.color = color;
  if (order !== undefined) data.order = order;

  const service = await prisma.service.update({
    where: { id },
    data,
    include: { category: true },
  });
  return NextResponse.json(service);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
