import { Card } from '@/components/ui';

type Props = { gelir: number; gider: number };

function fmtTRY(n: number) {
  return `₺${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Item({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{
        fontSize: '0.6875rem', fontWeight: 600,
        color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 4,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '1.125rem', fontWeight: 700,
        color, letterSpacing: '-0.02em',
        fontFamily: 'ui-monospace, monospace',
        margin: 0,
      }}>
        {value}
      </p>
    </div>
  );
}

export function BudgetSummary({ gelir, gider }: Props) {
  const net = gelir - gider;
  return (
    <Card style={{ padding: '16px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <Item label="Gelir"  value={fmtTRY(gelir)} color="var(--green)" />
        <Item label="Gider"  value={fmtTRY(gider)} color="var(--red)"   />
        <Item
          label="Net"
          value={(net < 0 ? '−' : '') + fmtTRY(net)}
          color={net >= 0 ? 'var(--green)' : 'var(--red)'}
        />
      </div>
    </Card>
  );
}
