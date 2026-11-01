import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { unitWithOwners } from '@/lib/prisma-includes';

// GET /api/units?propertyId=1
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const propertyId = req.nextUrl.searchParams.get('propertyId');

    const units = await db.unit.findMany({
      where: {
        isArchived: false,
        ...(propertyId ? { propertyId: Number(propertyId) } : {}),
      },
      include: {
        ...unitWithOwners,
        property: true,
      },
      orderBy: { unitNo: 'asc' },
    });

    return NextResponse.json(units);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/units
// body: { propertyId, unitNo, floor?, type?, grossSqm?, netSqm?, status?,
//         owners: [{ ownerId, share?, isPrimary? }] }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const body = await req.json();
    const { owners = [], ...unitData } = body;

    if (!Array.isArray(owners) || owners.length === 0) {
      return NextResponse.json(
        { error: 'En az bir sahip seçilmelidir' },
        { status: 400 }
      );
    }

    const primaryCount = owners.filter((o: any) => o.isPrimary).length;
    if (primaryCount > 1) {
      return NextResponse.json(
        { error: 'Yalnızca bir birincil sahip seçilebilir' },
        { status: 400 }
      );
    }
    if (primaryCount === 0) owners[0].isPrimary = true;

    const unit = await db.unit.create({
      data: {
        ...unitData,
        owners: {
          create: owners.map((o: any) => ({
            ownerId: Number(o.ownerId),
            share: o.share != null ? Number(o.share) : null,
            isPrimary: !!o.isPrimary,
          })),
        },
      },
      include: unitWithOwners,
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}