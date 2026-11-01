import { getTodayRates, SUPPORTED } from '@/lib/tcmb';

export async function RateBand() {
  const rates = await getTodayRates();
  if (!rates) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      {SUPPORTED.filter(c => rates[c]).map(code => (
        <div key={code} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          fontSize: '0.8125rem',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.75rem' }}>
            {code}
          </span>
          <span style={{
            fontWeight: 700, color: 'var(--text)',
            fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem',
          }}>
            ₺{rates[code].buying.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
          </span>
        </div>
      ))}
      <span style={{
        marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--subtle)',
        whiteSpace: 'nowrap',
      }}>
        TCMB
      </span>
    </div>
  );
}
