import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isApiError, prismaErrorToApiError, readOptionalOrder, readOptionalString, readSafeUrl, readString } from '../utils';

export async function GET() {
  const services = await prisma.service.findMany({
    include: { category: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = readString(body.name, 'name');
    const categoryId = readString(body.categoryId, 'categoryId');
    const url = readSafeUrl(body.url);
    const description = readOptionalString(body.description, 'description');
    const icon = readOptionalString(body.icon, 'icon');
    const color = readOptionalString(body.color, 'color');

    if (isApiError(name)) return NextResponse.json({ error: name.message }, { status: name.status });
    if (isApiError(categoryId)) return NextResponse.json({ error: categoryId.message }, { status: categoryId.status });
    if (isApiError(url)) return NextResponse.json({ error: url.message }, { status: url.status });
    if (isApiError(description)) return NextResponse.json({ error: description.message }, { status: description.status });
    if (isApiError(icon)) return NextResponse.json({ error: icon.message }, { status: icon.status });
    if (isApiError(color)) return NextResponse.json({ error: color.message }, { status: color.status });

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
        description,
        ...(icon && { icon }),
        ...(color && { color }),
        order,
      },
      include: { category: true },
    });
    return NextResponse.json(service);
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
    if (body.categoryId !== undefined) {
      const categoryId = readString(body.categoryId, 'categoryId');
      if (isApiError(categoryId)) return NextResponse.json({ error: categoryId.message }, { status: categoryId.status });
      data.categoryId = categoryId;
    }
    if (body.url !== undefined) {
      const url = readSafeUrl(body.url);
      if (isApiError(url)) return NextResponse.json({ error: url.message }, { status: url.status });
      data.url = url;
    }
    if (body.description !== undefined) {
      const description = readOptionalString(body.description, 'description');
      if (isApiError(description)) return NextResponse.json({ error: description.message }, { status: description.status });
      data.description = description;
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

    const service = await prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });
    return NextResponse.json(service);
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

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const apiError = prismaErrorToApiError(error);
    return NextResponse.json({ error: apiError.message }, { status: apiError.status });
  }
}
