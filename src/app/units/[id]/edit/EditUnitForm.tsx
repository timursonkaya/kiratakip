'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

type OwnerAssignment = { ownerId: number; share?: number; isPrimary: boolean };

type UnitForm = {
  id: number;
  propertyId: number;
  unitNo: string;
  floor: number | null;
  type: string;
  grossSqm: number | null;
  netSqm: number | null;
  status: string;
  owners: OwnerAssignment[];
};

type PropertyOption = { id: number; title: string };
type OwnerOption    = { id: number; name: string };

const TYPE_OPTIONS = [
  { value: 'residential', label: 'Konut' },
  { value: 'commercial',  label: 'Ticari' },
  { value: 'office',      label: 'Ofis' },
  { value: 'other',       label: 'Diğer' },
];

const STATUS_OPTIONS = [
  { value: 'vacant',      label: 'Boş' },
  { value: 'occupied',    label: 'Dolu' },
  { value: 'maintenance', label: 'Bakımda' },
];

export default function EditUnitForm({
  unit,
  properties,
  allOwners,
}: {
  unit: UnitForm;
  properties: PropertyOption[];
  allOwners: OwnerOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    propertyId: String(unit.propertyId),
    unitNo: unit.unitNo,
    floor: unit.floor?.toString() ?? '',
    type: unit.type,
    grossSqm: unit.grossSqm?.toString() ?? '',
    netSqm: unit.netSqm?.toString() ?? '',
    status: unit.status,
  });

  // Pre-populate owners; fall back to one empty row if the unit had none
  const [owners, setOwners] = useState<OwnerAssignment[]>(
    unit.owners.length > 0
      ? unit.owners
      : [{ ownerId: 0, share: undefined, isPrimary: true }]
  );

  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addOwnerRow() {
    setOwners(prev => [...prev, { ownerId: 0, share: undefined, isPrimary: false }]);
  }

  function removeOwnerRow(idx: number) {
    setOwners(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length && !next.some(o => o.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  }

  function setPrimary(idx: number) {
    setOwners(prev => prev.map((o, i) => ({ ...o, isPrimary: i === idx })));
  }

  function updateOwner(idx: number, patch: Partial<OwnerAssignment>) {
    setOwners(prev => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!owners.length || owners.some(o => !o.ownerId)) {
      setError('Her satır için bir sahip seçmelisiniz');
      return;
    }

    setSaving(true);

    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: Number(form.propertyId),
        unitNo: form.unitNo,
        floor:    form.floor    === '' ? null : Number(form.floor),
        type:     form.type,
        grossSqm: form.grossSqm === '' ? null : Number(form.grossSqm),
        netSqm:   form.netSqm   === '' ? null : Number(form.netSqm),
        status:   form.status,
        owners: owners.map(o => ({
          ownerId:   Number(o.ownerId),
          share:     o.share ?? null,
          isPrimary: !!o.isPrimary,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Güncelleme başarısız');
      setSaving(false);
      return;
    }

    router.push('/units');
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border, #d4d4d4)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
  };
  const smallInputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border, #d4d4d4)',
    fontSize: '0.875rem',
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>Bina *</label>
      <select
        value={form.propertyId}
        onChange={e => update('propertyId', e.target.value)}
        required
        style={inputStyle}
      >
        {properties.map(p => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>

      <label style={labelStyle}>Daire No *</label>
      <input
        type="text"
        value={form.unitNo}
        onChange={e => update('unitNo', e.target.value)}
        required
        style={inputStyle}
      />

      <label style={labelStyle}>Kat</label>
      <input
        type="number"
        value={form.floor}
        onChange={e => update('floor', e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Tür</label>
      <select
        value={form.type}
        onChange={e => update('type', e.target.value)}
        style={inputStyle}
      >
        {TYPE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <label style={labelStyle}>Brüt m²</label>
      <input
        type="number"
        step="0.01"
        value={form.grossSqm}
        onChange={e => update('grossSqm', e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Net m²</label>
      <input
        type="number"
        step="0.01"
        value={form.netSqm}
        onChange={e => update('netSqm', e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Durum</label>
      <select
        value={form.status}
        onChange={e => update('status', e.target.value)}
        style={inputStyle}
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* --- Owners --- */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Sahipler *</label>
          <button
            type="button"
            onClick={addOwnerRow}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--primary)',
              background: 'none',
              border: 0,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            + Sahip Ekle
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {owners.map((o, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={o.ownerId || ''}
                onChange={e => updateOwner(idx, { ownerId: Number(e.target.value) })}
                required
                style={{ ...smallInputStyle, flex: 1 }}
              >
                <option value="">Sahip seçin…</option>
                {allOwners.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                placeholder="Pay"
                value={o.share ?? ''}
                onChange={e => updateOwner(idx, {
                  share: e.target.value === '' ? undefined : Number(e.target.value),
                })}
                style={{ ...smallInputStyle, width: 80 }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                <input
                  type="radio"
                  name="primary-owner"
                  checked={o.isPrimary}
                  onChange={() => setPrimary(idx)}
                />
                Birincil
              </label>

              {owners.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeOwnerRow(idx)}
                  aria-label="Sil"
                  style={{
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    color: 'var(--danger, #c00)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--subtle, #888)', marginTop: 4 }}>
          Pay isteğe bağlı (0–1). Birincil sahip sözleşmelerde muhatap alınır.
        </p>
      </div>

      {error && (
        <p style={{ color: 'crimson', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 600 }}
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <Link
          href="/units"
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: 8,
            border: '1px solid var(--border, #d4d4d4)',
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          İptal
        </Link>
      </div>
    </form>
  );
}