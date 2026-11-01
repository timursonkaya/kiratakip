import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import EditPropertyForm from './EditPropertyForm';

type Params = { params: Promise<{ id: string }> };

export default async function EditPropertyPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect('/login');

  const db = getUserDb(session.id);
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) notFound();

  const property = await db.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Mülkü Düzenle</h1>
        <p className="text-sm text-gray-500 mt-1">{property.title}</p>
      </div>
      <EditPropertyForm property={property} />
    </div>
  );
}