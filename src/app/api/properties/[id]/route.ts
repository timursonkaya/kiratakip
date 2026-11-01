import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const property = await db.property.findUnique({
      where: { id: Number(id) },
      include: {
        units: {
          where: { isArchived: false },
          orderBy: { unitNo: 'asc' },
          include: {
            owners: {
              include: { owner: { select: { id: true, name: true, phone: true } } },
              orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            },
          },
        },
      },
    });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(property);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    // ownerId intentionally NOT destructured — ownership is per unit now
    const { title, address, city, district, type } = await req.json();

    const property = await db.property.update({
      where: { id: Number(id) },
      data: { title, address, city, district, type },
    });
    return NextResponse.json(property);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const property = await db.property.findUnique({ where: { id: Number(id) } });
    if (!property) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    await db.property.update({ where: { id: Number(id) }, data: { isArchived: true } });
    return NextResponse.json({ ok: true, message: 'Bina arşivlendi' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}