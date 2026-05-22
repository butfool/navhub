import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isApiError, prismaErrorToApiError, readOptionalOrder, readOptionalString, readString } from '../utils';

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    include: { services: { orderBy: [{ order: 'asc' }, { name: 'asc' }] } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = readString(body.name, 'name');
    const icon = readOptionalString(body.icon, 'icon');
    const color = readOptionalString(body.color, 'color');

    if (isApiError(name)) return NextResponse.json({ error: name.message }, { status: name.status });
    if (isApiError(icon)) return NextResponse.json({ error: icon.message }, { status: icon.status });
    if (isApiError(color)) return NextResponse.json({ error: color.message }, { status: color.status });

    const maxOrder = await prisma.category.aggregate({
      _max: { order: true },
    });
    const order = (maxOrder._max.order ?? -1) + 1;

    const category = await prisma.category.create({
      data: { name, ...(icon && { icon }), ...(color && { color }), order },
      include: { services: true },
    });
    return NextResponse.json(category);
  } catch (error) {
    const apiError = prismaErrorToApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = readString(body.id, 'id');
    if (isApiError(id)) return NextResponse.json({ error: id.message }, { status: id.status });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = readString(body.name, 'name');
      if (isApiError(name)) return NextResponse.json({ error: name.message }, { status: name.status });
      data.name = name;
    }
    if (body.icon !== undefined) {
      const icon = readOptionalString(body.icon, 'icon');
      if (isApiError(icon)) return NextResponse.json({ error: icon.message }, { status: icon.status });
      if (icon) data.icon = icon;
    }
    if (body.color !== undefined) {
      const color = readOptionalString(body.color, 'color');
      if (isApiError(color)) return NextResponse.json({ error: color.message }, { status: color.status });
      if (color) data.color = color;
    }
    if (body.order !== undefined) {
      const order = readOptionalOrder(body.order);
      if (isApiError(order)) return NextResponse.json({ error: order.message }, { status: order.status });
      data.order = order;
    }

    const category = await prisma.category.update({
      where: { id },
      data,
      include: { services: true },
    });
    return NextResponse.json(category);
  } catch (error) {
    const apiError = prismaErrorToApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const apiError = prismaErrorToApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
