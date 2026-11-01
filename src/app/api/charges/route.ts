import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const sp = req.nextUrl.searchParams;
    const contractId = sp.get('contractId');
    const unitId     = sp.get('unitId');
    const ownerId    = sp.get('ownerId');
    const status     = sp.get('status');
    const from       = sp.get('from');
    const to         = sp.get('to');

    const charges = await db.rentCharge.findMany({
      where: {
        ...(status     ? { status } : {}),
        ...(contractId ? { contractId: Number(contractId) } : {}),
        ...(unitId     ? { unitId:     Number(unitId) }     : {}),
        ...(ownerId
          ? { unit: { owners: { some: { ownerId: Number(ownerId) } } } }
          : {}),
        ...(from || to ? {
          periodStart: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        } : {}),
      },
      include: {
        tenant: { select: { name: true } },
        unit: {
          select: {
            unitNo: true,
            property: { select: { title: true } },
            owners: {
              include: { owner: { select: { id: true, name: true } } },
              orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            },
          },
        },
        contract: { select: { currency: true } },
      },
      orderBy: { dueDate: 'desc' },
    });

    return NextResponse.json(charges);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/charges?action=generate
// body: { date: ISO string }  — reference date; charges are generated for that month
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const action = req.nextUrl.searchParams.get('action');
    if (action !== 'generate') {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const refDate = body.date ? new Date(body.date) : new Date();
    if (Number.isNaN(refDate.getTime())) {
      return NextResponse.json({ error: 'Geçersiz tarih' }, { status: 400 });
    }

    // Period = calendar month of refDate
    const periodStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const periodEnd   = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);

    // Active contracts that cover the period
    const contracts = await db.contract.findMany({
      where: {
        status: 'active',
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      include: { tenant: { select: { name: true } } },
    });

    let created = 0;
    let skipped = 0;
    const ids: number[] = [];

    for (const c of contracts) {
      // Idempotency: skip if a charge already exists for this contract + period
      const existing = await db.rentCharge.findFirst({
        where: { contractId: c.id, periodStart },
        select: { id: true },
      });
      if (existing) { skipped++; continue; }

      const paymentDay = Math.min(c.paymentDay || 1, periodEnd.getDate());
      const dueDate = new Date(refDate.getFullYear(), refDate.getMonth(), paymentDay);

      const charge = await db.rentCharge.create({
        data: {
          contractId:   c.id,
          unitId:       c.unitId,
          tenantId:     c.tenantId,
          dueDate,
          chargeAmount: c.currentRent ?? c.rentAmount,
          paidAmount:   0,
          periodStart,
          periodEnd,
          status:       'pending',
          // currency is stored on the contract; RentCharge tracks chargeAmountTry + exchangeRate
          // Leave them null for TRY contracts — the UI falls back to chargeAmount.
          chargeAmountTry: c.currency === 'TRY' ? (c.currentRent ?? c.rentAmount) : null,
          exchangeRate:    c.currency === 'TRY' ? 1 : null,
        },
      });
      created++;
      ids.push(charge.id);
    }

    return NextResponse.json({
      ok: true,
      created,
      skipped,
      ids,
      periodStart,
      periodEnd,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}