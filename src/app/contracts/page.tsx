export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { ContractModal } from './ContractModal';
import { ContractsTable } from './ContractsTable';
import { OwnerSelect } from '@/components/OwnerSelect';

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const { ownerId } = await searchParams;
  const ownerIdFilter = ownerId ? Number(ownerId) : undefined;

  const [contracts, vacantUnits, allUnits, tenants, owners] = await Promise.all([
    db.contract.findMany({
      where: ownerIdFilter
        ? { unit: { owners: { some: { ownerId: ownerIdFilter } } } }
        : {},
      include: {
        unit:   { select: { unitNo: true, property: { select: { title: true } } } },
        tenant: { select: { name: true, phone: true } },
      },
      orderBy: { startDate: 'desc' },
    }),
    db.unit.findMany({
      where: { status: 'vacant' },
      select: { id: true, unitNo: true, property: { select: { title: true } } },
      orderBy: { unitNo: 'asc' },
    }),
    db.unit.findMany({
      select: { id: true, unitNo: true, property: { select: { title: true } } },
      orderBy: { unitNo: 'asc' },
    }),
    db.tenant.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.owner.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const serialized = contracts.map(c => ({
    ...c,
    startDate:       c.startDate.toISOString(),
    endDate:         c.endDate?.toISOString() ?? null,
    rentAmount:      Number(c.rentAmount),
    currentRent:     c.currentRent !== null ? Number(c.currentRent) : null,
    depositAmount:   Number(c.depositAmount),
    terminationDate: c.terminationDate?.toISOString() ?? null,
    depositDate:     c.depositDate?.toISOString() ?? null,
    createdAt:       c.createdAt.toISOString(),
    bankName:        c.bankName ?? null,
    iban:            c.iban ?? null,
    accountHolder:   c.accountHolder ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Sözleşmeler"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <OwnerSelect owners={owners} currentOwnerId={ownerIdFilter} />
            <ContractModal units={vacantUnits} tenants={tenants} />
          </div>
        }
      />
      <ContractsTable
        contracts={serialized}
        allUnits={allUnits}
        tenants={tenants}
      />
    </div>
  );
}
