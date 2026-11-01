import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const owners = await db.owner.findMany({
      where: { isArchived: false },
      include: {
        units: {
          include: {
            unit: { include: { property: { select: { id: true, title: true } } } },
          },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(owners);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const body = await req.json();
    const { name, phone, email, nationalId, address, notes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Ad zorunludur' }, { status: 400 });
    }

    const owner = await db.owner.create({
      data: {
        name: name.trim(),
        phone:      phone      || null,
        email:      email      || null,
        nationalId: nationalId || null,
        address:    address    || null,
        notes:      notes      || null,
      },
    });
    return NextResponse.json(owner, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}