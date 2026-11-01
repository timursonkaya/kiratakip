export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader, DataTable, Td, TRow, Badge, Money, EmptyState } from '@/components/ui';
import UnitAddForm from './UnitAddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { DoorOpen } from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  residential: 'Konut', commercial: 'Ticari',
  parking: 'Otopark', storage: 'Depo',
};

const COLS = [
  { label: 'Daire No'  },
  { label: 'Bina'      },
  { label: 'Kat'       },
  { label: 'Tür'       },
  { label: 'Durum'     },
  { label: 'Kiracı'    },
  { label: 'Kira', right: true },
  { label: '', w: 120  },
];

export default async function UnitsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const [units, properties] = await Promise.all([
    db.unit.findMany({
      include: {
        property: { select: { title: true } },
        contracts: {
          where: { status: 'active' },
          select: { tenant: { select: { name: true } }, rentAmount: true, currency: true },
          take: 1,
        },
      },
      orderBy: [{ propertyId: 'asc' }, { unitNo: 'asc' }],
    }),
    db.property.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Daireler"
        action={<UnitAddForm properties={properties} />}
      />
      <Card>
        {units.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="Henüz daire yok"
            desc={properties.length === 0
              ? 'Daire ekleyebilmek için önce bir bina kaydı oluşturmanız gerekiyor.'
              : 'Sağ üstteki "Yeni Daire" butonuyla ilk daireyi ekleyin.'}
            action={properties.length === 0
              ? <Link href="/properties" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Binalara Git →</Link>
              : undefined}
          />
        ) : (
          <DataTable cols={COLS}>
            {units.map(u => {
              const contract = u.contracts[0];
              return (
                <TRow key={u.id}>
                  <Td><span style={{ fontWeight: 600 }}>{u.unitNo}</span></Td>
                  <Td muted>{u.property.title}</Td>
                  <Td muted>{u.floor != null ? `${u.floor}. Kat` : '—'}</Td>
                  <Td muted>{TYPE_LABEL[u.type] ?? u.type}</Td>
                  <Td><Badge status={u.status} /></Td>
                  <Td>{contract?.tenant.name ?? <span style={{ color: 'var(--subtle)' }}>—</span>}</Td>
                  <Td right>
                    {contract
                      ? <Money amount={contract.rentAmount} />
                      : <span style={{ color: 'var(--subtle)' }}>—</span>}
                  </Td>
                  <Td action>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Link
                        href={`/units/${u.id}/edit`}
                        style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                      >
                        Düzenle
                      </Link>
                      <DeleteButton
                        endpoint={`/api/units/${u.id}`}
                        label={`${u.property.title} — ${u.unitNo}`}
                        errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }}
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