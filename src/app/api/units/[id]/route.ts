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
    const unit = await db.unit.findUnique({
      where: { id: Number(id) },
      include: {
        property: { select: { id: true, title: true } },
        owners: {
          include: { owner: true },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
        contracts: {
          orderBy: { startDate: 'desc' },
          include: { tenant: { select: { id: true, name: true, phone: true } } },
        },
      },
    });
    if (!unit) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(unit);
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
    const { unitNo, floor, type, grossSqm, netSqm, status, owners } = await req.json();

    if (owners !== undefined) {
      if (!Array.isArray(owners)) {
        return NextResponse.json({ error: 'Geçersiz sahip listesi' }, { status: 400 });
      }
      const primaryCount = owners.filter((o: any) => o.isPrimary).length;
      if (primaryCount > 1) {
        return NextResponse.json(
          { error: 'Yalnızca bir birincil sahip seçilebilir' },
          { status: 400 }
        );
      }
      if (owners.length > 0 && primaryCount === 0) owners[0].isPrimary = true;
    }

    const unit = await db.unit.update({
      where: { id: Number(id) },
      data: {
        unitNo, type, status,
        floor:    floor    != null ? Number(floor)    : undefined,
        grossSqm: grossSqm != null ? Number(grossSqm) : undefined,
        netSqm:   netSqm   != null ? Number(netSqm)   : undefined,
        ...(owners !== undefined
          ? {
              owners: {
                deleteMany: {},
                create: owners.map((o: any) => ({
                  ownerId: Number(o.ownerId),
                  share: o.share != null ? Number(o.share) : null,
                  isPrimary: !!o.isPrimary,
                })),
              },
            }
          : {}),
      },
      include: {
        owners: {
          include: { owner: true },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
      },
    });
    return NextResponse.json(unit);
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
    const unit = await db.unit.findUnique({ where: { id: Number(id) } });
    if (!unit) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    await db.unit.update({ where: { id: Number(id) }, data: { isArchived: true } });
    return NextResponse.json({ ok: true, message: 'Daire arşivlendi' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}