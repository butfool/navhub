import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { services: { orderBy: [{ order: 'asc' }, { name: 'asc' }] } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, icon, color } = body;

  const maxOrder = await prisma.category.aggregate({
    _max: { order: true },
  });
  const order = (maxOrder._max.order ?? -1) + 1;

  const category = await prisma.category.create({
    data: { name, icon, color, order },
    include: { services: true },
  });
  return NextResponse.json(category);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, name, icon, color, order } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (icon !== undefined) data.icon = icon;
  if (color !== undefined) data.color = color;
  if (order !== undefined) data.order = order;

  const category = await prisma.category.update({
    where: { id },
    data,
    include: { services: true },
  });
  return NextResponse.json(category);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
