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
    const contract = await db.contract.findUnique({
      where: { id: Number(id) },
      include: {
        unit: {
          include: {
            property: { select: { id: true, title: true } },
			owners: {
				include: { owner: { select: { id: true, name: true, phone: true } } },
				orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
			},
          },
        },
        tenant: true,
        increases:           { orderBy: { effectiveDate: 'asc' } },
        depositTransactions: { orderBy: { date: 'asc' } },
        rentCharges: {
          orderBy: { periodStart: 'desc' },
          take: 12,
          include: { payments: true },
        },
      },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    return NextResponse.json(contract);
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
    const contractId = Number(id);
    const body = await req.json();
    const { endDate, paymentDay, startDate, rentAmount, tenantId, unitId,
            depositAmount, bankName, iban, accountHolder } = body;

    if (paymentDay !== undefined && (Number(paymentDay) < 1 || Number(paymentDay) > 28)) {
      return NextResponse.json({ error: 'paymentDay 1-28 arası olmalı' }, { status: 400 });
    }
    if (rentAmount !== undefined && Number(rentAmount) <= 0) {
      return NextResponse.json({ error: 'Kira bedeli sıfırdan büyük olmalı' }, { status: 400 });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return NextResponse.json({ error: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 });
    }

    // If unit is changing, check for conflicts and update unit statuses
    if (unitId !== undefined) {
      const current = await db.contract.findUnique({ where: { id: contractId }, select: { unitId: true } });
      if (current && current.unitId !== Number(unitId)) {
        // Prevent moving to a unit that already has an active contract
        const conflict = await db.contract.findFirst({
          where: { unitId: Number(unitId), status: 'active', id: { not: contractId } },
        });
        if (conflict) {
          return NextResponse.json(
            { error: `Hedef dairede zaten aktif sözleşme var (id: ${conflict.id})` },
            { status: 409 },
          );
        }
        await db.$transaction([
          db.unit.update({ where: { id: current.unitId }, data: { status: 'vacant' } }),
          db.unit.update({ where: { id: Number(unitId) }, data: { status: 'occupied' } }),
        ]);
      }
    }

    const contract = await db.contract.update({
      where: { id: contractId },
      data: {
        ...(startDate     !== undefined && { startDate:     new Date(startDate) }),
        ...(endDate       !== undefined && { endDate:       endDate ? new Date(endDate) : null }),
        ...(paymentDay    !== undefined && { paymentDay:    Number(paymentDay) }),
        ...(rentAmount    !== undefined && { rentAmount:    Number(rentAmount) }),
        ...(tenantId      !== undefined && { tenantId:      Number(tenantId) }),
        ...(unitId        !== undefined && { unitId:        Number(unitId) }),
        ...(depositAmount !== undefined && { depositAmount: Number(depositAmount) }),
        ...(bankName      !== undefined && { bankName:      bankName || null }),
        ...(iban          !== undefined && { iban:          iban || null }),
        ...(accountHolder !== undefined && { accountHolder: accountHolder || null }),
      },
    });
    return NextResponse.json(contract);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);
    const { id } = await params;
    const force = new URL(req.url).searchParams.get('force') === 'true';
    const contractId = Number(id);

    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: { _count: { select: { rentCharges: true } } },
    });
    if (!contract) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    if (contract.status === 'active') {
      return NextResponse.json(
        { error: 'Aktif sözleşmeler silinemez. Önce sözleşmeyi sonlandırın.' },
        { status: 409 },
      );
    }
    // Hard block: never delete contracts that have collected payments
    const withPayments = await db.rentCharge.count({
      where: { contractId, payments: { some: {} } },
    });
    if (withPayments > 0) {
      return NextResponse.json(
        {
          error: `Bu sözleşmede ${withPayments} ödeme kaydı bulunuyor. Mali geçmişi korumak için ödeme kaydı olan sözleşmeler silinemez. Sözleşmeyi "Sonlandırıldı" olarak bırakın.`,
          code:  'HAS_PAYMENTS',
        },
        { status: 409 },
      );
    }

    // Warn if unpaid charges exist (allow with force — no payments, safe to delete)
    if (contract._count.rentCharges > 0 && !force) {
      return NextResponse.json(
        {
          error: `Bu sözleşmeye ait ${contract._count.rentCharges} alacak kaydı var. Silmek için alacaklar da silinecek.`,
          code:  'HAS_CHARGES',
          count: contract._count.rentCharges,
        },
        { status: 409 },
      );
    }

    // Safe cascade: charges have no payments, delete charges → increases/deposits → contract
    await db.$transaction([
      db.rentCharge.deleteMany({ where: { contractId } }),
      db.contractIncrease.deleteMany({ where: { contractId } }),
      db.depositTransaction.deleteMany({ where: { contractId } }),
      db.contract.delete({ where: { id: contractId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
