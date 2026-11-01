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
    const owner = await db.owner.findUnique({
      where: { id: Number(id) },
      include: {
        units: {
          include: {
            unit: { include: { property: { select: { id: true, title: true } } } },
          },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
      },
    });
    if (!owner) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(owner);
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
    const body = await req.json();
    const { name, phone, email, nationalId, address, notes } = body;

    const owner = await db.owner.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(nationalId !== undefined && { nationalId: nationalId || null }),
        ...(address !== undefined && { address: address || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
    return NextResponse.json(owner);
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
    await db.owner.update({
      where: { id: Number(id) },
      data: { isArchived: true },
    });
    return NextResponse.json({ ok: true, message: 'Sahip arşivlendi' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}