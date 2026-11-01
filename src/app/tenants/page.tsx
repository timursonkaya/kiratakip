export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { Card, PageHeader, DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import AddForm from '@/components/AddForm';
import { DeleteButton } from '@/components/DeleteButton';
import { UserCheck } from 'lucide-react';
import { date, initial } from '@/lib/format';
import Link from 'next/link';

const COLS = [
  { label: 'Ad Soyad'   },
  { label: 'Telefon'    },
  { label: 'E-posta'    },
  { label: 'Sözleşme', center: true },
  { label: 'Kayıt'      },
  { label: '', w: 120   },
];

export default async function TenantsPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);

  const tenants = await db.tenant.findMany({
    include: { _count: { select: { contracts: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="Kiracılar"
        action={
          <AddForm endpoint="/api/tenants" title="Yeni Kiracı" fields={[
            { name: 'name',       label: 'Ad Soyad',  required: true },
            { name: 'phone',      label: 'Telefon',   placeholder: '05xx xxx xx xx' },
            { name: 'email',      label: 'E-posta',   type: 'email' },
            { name: 'nationalId', label: 'TC Kimlik' },
            { name: 'address',    label: 'Adres' },
          ]} />
        }
      />
      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Henüz kiracı yok"
            desc='Kiracı kaydı oluşturun, ardından sözleşme ile daireye bağlayın.'
            action={
              <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
                Sağ üstteki "Yeni Kiracı" butonuna tıklayın
              </span>
            }
          />
        ) : (
          <DataTable cols={COLS}>
            {tenants.map(t => (
              <TRow key={t.id}>
                <Td>
                  <Link href={`/tenants/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--primary-bg)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8125rem', fontWeight: 700,
                      }}>
                        {initial(t.name)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                    </div>
                  </Link>
                </Td>
                <Td muted>{t.phone ?? '—'}</Td>
                <Td muted>{t.email ?? '—'}</Td>
                <Td center>
                  <Badge variant={t._count.contracts > 0 ? 'info' : 'neutral'}>
                    {t._count.contracts}
                  </Badge>
                </Td>
                <Td muted>{date(t.createdAt)}</Td>
                <Td action>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link
                      href={`/tenants/${t.id}/edit`}
                      style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
                    >
                      Düzenle
                    </Link>
                    <DeleteButton
                      endpoint={`/api/tenants/${t.id}`}
                      label={t.name}
                      errorAction={{ label: 'Sözleşmelere Git', href: '/contracts' }}
                    />
                  </div>
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>
    </div>
  );
}