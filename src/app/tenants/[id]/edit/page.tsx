export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import EditTenantForm from './EditTenantForm';

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;   // Next.js 15+. For 14: `{ id: string }`
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const tenantId = Number(id);
  if (!Number.isInteger(tenantId)) notFound();

  const db = getUserDb(session.id);
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
        Kiracı Düzenle
      </h1>
      <EditTenantForm
        tenant={{
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          email: tenant.email,
          nationalId: tenant.nationalId,
          address: tenant.address,
          notes: tenant.notes,
        }}
      />
    </div>
  );
}