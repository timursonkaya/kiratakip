export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader, DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import AddForm from '@/components/AddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { Building2 } from 'lucide-react';
import { date } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  apartment: 'Apartman', villa: 'Villa', commercial: 'Ticari', mixed: 'Karma',
};

const COLS = [
  { label: 'Bina'       },
  { label: 'Sahip'      },
  { label: 'Konum'      },
  { label: 'Tür'        },
  { label: 'Daire', center: true },
  { label: 'Kayıt'      },
  { label: '', w: 120  },
];

export default async function PropertiesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const properties = await db.property.findMany({
    include: {
      _count: { select: { units: true } },
      units: {
        where: { isArchived: false },
        select: {
          owners: {
            select: {
              isPrimary: true,
              owner: { select: { id: true, name: true } },
            },
            orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Binalar"
        action={
          <AddForm endpoint="/api/properties" title="Yeni Bina" fields={[
            { name: 'title',    label: 'Bina Adı',    required: true },
            { name: 'city',     label: 'Şehir',       placeholder: 'İstanbul' },
            { name: 'district', label: 'İlçe',        placeholder: 'Kadıköy' },
            { name: 'address',  label: 'Adres' },
            { name: 'type',     label: 'Tür', options: [
              { value: 'apartment',  label: 'Apartman' },
              { value: 'villa',      label: 'Villa'    },
              { value: 'commercial', label: 'Ticari'   },
              { value: 'mixed',      label: 'Karma'    },
            ]},
          ]} />
        }
      />
      <Card>
        {properties.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Henüz bina yok"
            desc='Sağ üstteki "Yeni Bina" butonuyla ilk binanızı ekleyin. Daire eklerken sahiplerini atayabilirsiniz.'
          />
        ) : (
          <DataTable cols={COLS}>
            {properties.map(p => {
              // Deduplicate owner names across all units of this property
              const ownerNames = Array.from(
                new Set(
                  p.units.flatMap(u => u.owners.map(o => o.owner.name))
                )
              );
              const hasUnits = p._count.units > 0;
              return (
                <TRow key={p.id}>
                  <Td><span style={{ fontWeight: 600 }}>{p.title}</span></Td>
                  <Td muted>
                    {ownerNames.length > 0 ? ownerNames.join(', ') : '—'}
                  </Td>
                  <Td muted>{[p.district, p.city].filter(Boolean).join(', ') || '—'}</Td>
                  <Td muted>{TYPE_LABEL[p.type] ?? p.type}</Td>
                  <Td center>
                    <Badge variant={hasUnits ? 'info' : 'neutral'}>
                      {p._count.units}
                    </Badge>
                  </Td>
                  <Td muted>{date(p.createdAt)}</Td>
                  <Td action>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link
                        href={`/properties/${p.id}/edit`}
                        style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                      >
                        Düzenle
                      </Link>
                      <DeleteButton
                        endpoint={`/api/properties/${p.id}`}
                        label={p.title}
                        errorAction={{ label: 'Dairelere Git', href: '/units' }}
                      />
                    </div>
                  </Td>
                </TRow>
              );
            })}
          </DataTable>
        )}
      </Card>
    </div>
  );
}