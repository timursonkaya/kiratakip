export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import AddForm from '@/components/AddForm';
import OwnersTable from './OwnersTable';

export default async function OwnersPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const owners = await db.owner.findMany({
    include: { _count: { select: { units: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Mülk Sahipleri"
        action={
          <AddForm
            endpoint="/api/owners"
            title="Yeni Mülk Sahibi"
            fields={[
              { name: 'name',       label: 'Ad Soyad',  required: true },
              { name: 'phone',      label: 'Telefon',   placeholder: '05xx xxx xx xx' },
              { name: 'email',      label: 'E-posta',   type: 'email' },
              { name: 'nationalId', label: 'TC Kimlik' },
              { name: 'address',    label: 'Adres' },
            ]}
          />
        }
      />
      <Card>
        <OwnersTable owners={owners} />
      </Card>
    </div>
  );
}
