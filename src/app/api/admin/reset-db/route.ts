import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    // Sıralı silme — foreign key kısıtları nedeniyle alt tablolar önce.
    // unit_owners, unit ve owner'a bağlı olduğu için ikisinden de önce silinmeli.
    await db.$transaction([
      db.payment.deleteMany(),
      db.rentCharge.deleteMany(),
      db.contractIncrease.deleteMany(),
      db.depositTransaction.deleteMany(),
      db.contract.deleteMany(),
      db.expense.deleteMany(),
      db.unitOwner.deleteMany(),   // ← NEW: breaks unit↔owner references
      db.unit.deleteMany(),
      db.property.deleteMany(),
      db.tenant.deleteMany(),
      db.owner.deleteMany(),
      db.exchangeRate.deleteMany(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}