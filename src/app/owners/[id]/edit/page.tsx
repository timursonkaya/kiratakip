export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import EditOwnerForm from './EditOwnerForm';

export default async function EditOwnerPage({
  params,
}: {
  params: Promise<{ id: string }>;   // Next.js 15+. For 14: `{ id: string }`
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  const ownerId = Number(id);
  if (!Number.isInteger(ownerId)) notFound();

  const db = getUserDb(session.id);
  const owner = await db.owner.findUnique({ where: { id: ownerId } });
  if (!owner) notFound();

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
        Mülk Sahibi Düzenle
      </h1>
      <EditOwnerForm
        owner={{
          id: owner.id,
          name: owner.name,
          phone: owner.phone,
          email: owner.email,
          nationalId: owner.nationalId,
          address: owner.address,
          notes: owner.notes,
        }}
      />
    </div>
  );
}