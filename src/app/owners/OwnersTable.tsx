'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { DataTable, Td, TRow, Badge, EmptyState } from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';
import { date } from '@/lib/format';

type Owner = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  _count: { units: number };
};

const COLS = [
  { label: 'Ad Soyad'  },
  { label: 'Telefon'   },
  { label: 'E-posta'   },
  { label: 'Daire',    center: true },
  { label: 'Kayıt'     },
  { label: '', w: 120  },
];

export default function OwnersTable({ owners }: { owners: Owner[] }) {
  if (owners.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Henüz mülk sahibi yok"
        desc="Mülk sahibi kaydı oluşturarak daire yönetimine başlayın. Sahipleri daire eklerken atayabilirsiniz."
        action={
          <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
            Sağ üstteki "Yeni Mülk Sahibi" butonuna tıklayın
          </span>
        }
      />
    );
  }

  return (
    <DataTable cols={COLS}>
      {owners.map(o => (
        <TRow key={o.id}>
          <Td>
            <span style={{ fontWeight: 600 }}>{o.name}</span>
          </Td>
          <Td muted>{o.phone ?? '—'}</Td>
          <Td muted>{o.email ?? '—'}</Td>
          <Td center>
            <Badge variant={o._count.units > 0 ? 'info' : 'neutral'}>
              {o._count.units}
            </Badge>
          </Td>
          <Td muted>{date(o.createdAt)}</Td>
          <Td action>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Link
                href={`/owners/${o.id}/edit`}
                style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}
              >
                Düzenle
              </Link>
              <DeleteButton
                endpoint={`/api/owners/${o.id}`}
                label={o.name}
                errorAction={{ label: 'Dairelere Git', href: '/units' }}
              />
            </div>
          </Td>
        </TRow>
      ))}
    </DataTable>
  );
}