export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import EditUnitForm from './EditUnitForm';

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const unitId = Number(id);
  if (!Number.isInteger(unitId)) notFound();

  const db = getUserDb(session.id);

  const [unit, properties, allOwners] = await Promise.all([
    db.unit.findUnique({
      where: { id: unitId },
      include: {
        owners: {
          include: { owner: true },
          orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
        },
      },
    }),
    db.property.findMany({
      where: { isArchived: false },
      orderBy: { title: 'asc' },
      select: { id: true, title: true },
    }),
    db.owner.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  if (!unit) notFound();

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
        Daire Düzenle
      </h1>
      <EditUnitForm
        unit={{
          id: unit.id,
          propertyId: unit.propertyId,
          unitNo: unit.unitNo,
          floor: unit.floor,
          type: unit.type,
          grossSqm: unit.grossSqm,
          netSqm: unit.netSqm,
          status: unit.status,
          owners: unit.owners.map(o => ({
            ownerId: o.ownerId,
            share: o.share ?? undefined,
            isPrimary: o.isPrimary,
          })),
        }}
        properties={properties}
        allOwners={allOwners}
      />
    </div>
  );
}