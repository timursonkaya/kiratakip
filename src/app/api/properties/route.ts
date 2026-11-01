import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const properties = await db.property.findMany({
      where: { isArchived: false },
      include: {
        units: {
          where: { isArchived: false },
          include: {
            owners: {
              include: { owner: true },
              orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            },
          },
        },
      },
      orderBy: { title: 'asc' },
    });
    return NextResponse.json(properties);
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
    const { title, address, city, district, type } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Başlık zorunludur' }, { status: 400 });
    }

    // NOTE: ownerId is no longer accepted here — ownership is per unit
    const property = await db.property.create({
      data: {
        title: title.trim(),
        address: address || null,
        city: city || null,
        district: district || null,
        type: type || 'apartment',
      },
    });
    return NextResponse.json(property, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}