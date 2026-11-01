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
    const tenant = await db.tenant.findUnique({
      where: { id: Number(id) },
      include: {
        contracts: {
          orderBy: { startDate: 'desc' },
          include: {
            unit: { select: { id: true, unitNo: true, property: { select: { id: true, title: true } } } },
          },
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(tenant);
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
    const { name, phone, email, nationalId, address, notes } = await req.json();
    const tenant = await db.tenant.update({
      where: { id: Number(id) },
      data: { name, phone, email, nationalId, address, notes },
    });
    return NextResponse.json(tenant);
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
    const tenant = await db.tenant.findUnique({ where: { id: Number(id) } });
    if (!tenant) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    const activeContracts = await db.contract.count({
      where: { tenantId: Number(id), status: 'active' },
    });
    if (activeContracts > 0) {
      return NextResponse.json(
        { error: 'Aktif sözleşmesi olan kiracı arşivlenemez. Önce sözleşmeyi sonlandırın.' },
        { status: 409 },
      );
    }

    await db.tenant.update({ where: { id: Number(id) }, data: { isArchived: true } });
    return NextResponse.json({ ok: true, message: 'Kiracı arşivlendi' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
