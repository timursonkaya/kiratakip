'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Owner = { id: number; name: string };

type OwnerAssignment = {
  ownerId: number;
  share?: number;
  isPrimary: boolean;
};

type UnitFormProps = {
  unitId?: number;
  propertyId?: number;
  initial?: {
    unitNo?: string;
    floor?: number | null;
    type?: string;
    grossSqm?: number | null;
    netSqm?: number | null;
    status?: string;
    owners?: OwnerAssignment[];
  };
};

export default function UnitForm({ unitId, propertyId, initial }: UnitFormProps) {
  const router = useRouter();
  const isEdit = unitId != null;

  // Unit fields
  const [unitNo,    setUnitNo]    = useState(initial?.unitNo    ?? '');
  const [floor,     setFloor]     = useState(initial?.floor?.toString()    ?? '');
  const [type,      setType]      = useState(initial?.type      ?? 'residential');
  const [grossSqm,  setGrossSqm]  = useState(initial?.grossSqm?.toString() ?? '');
  const [netSqm,    setNetSqm]    = useState(initial?.netSqm?.toString()   ?? '');
  const [status,    setStatus]    = useState(initial?.status    ?? 'vacant');

  // Owner assignment
  const [allOwners, setAllOwners] = useState<Owner[]>([]);
  const [owners, setOwners] = useState<OwnerAssignment[]>(
    initial?.owners?.length
      ? initial.owners
      : [{ ownerId: 0, share: undefined, isPrimary: true }]
  );

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Load owner list
  useEffect(() => {
    fetch('/api/owners')
      .then(r => r.json())
      .then((list: Owner[]) => setAllOwners(list))
      .catch(() => setAllOwners([]));
  }, []);

  const addOwner = () =>
    setOwners(prev => [...prev, { ownerId: 0, share: undefined, isPrimary: false }]);

  const removeOwner = (idx: number) =>
    setOwners(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length && !next.some(o => o.isPrimary)) next[0].isPrimary = true;
      return next;
    });

  const setPrimary = (idx: number) =>
    setOwners(prev => prev.map((o, i) => ({ ...o, isPrimary: i === idx })));

  const updateOwner = (idx: number, patch: Partial<OwnerAssignment>) =>
    setOwners(prev => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!owners.length || owners.some(o => !o.ownerId)) {
      setError('Her satır için bir sahip seçmelisiniz');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        unitNo,
        type,
        status,
        floor:    floor    === '' ? null : Number(floor),
        grossSqm: grossSqm === '' ? null : Number(grossSqm),
        netSqm:   netSqm   === '' ? null : Number(netSqm),
        owners: owners.map(o => ({
          ownerId:   Number(o.ownerId),
          share:     o.share ?? null,
          isPrimary: !!o.isPrimary,
        })),
      };
      if (!isEdit && propertyId != null) payload.propertyId = propertyId;

      const res = await fetch(
        isEdit ? `/api/units/${unitId}` : '/api/units',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Kaydetme başarısız');
      }
      router.push('/units');
      router.refresh();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Daire No *</label>
          <input className="input" value={unitNo}
                 onChange={e => setUnitNo(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Kat</label>
          <input className="input" type="number" value={floor}
                 onChange={e => setFloor(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Tür</label>
          <select className="input" value={type}
                  onChange={e => setType(e.target.value)}>
            <option value="residential">Konut</option>
            <option value="commercial">Ticari</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Durum</label>
          <select className="input" value={status}
                  onChange={e => setStatus(e.target.value)}>
            <option value="vacant">Boş</option>
            <option value="occupied">Dolu</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Brüt m²</label>
          <input className="input" type="number" step="0.01" value={grossSqm}
                 onChange={e => setGrossSqm(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm mb-1">Net m²</label>
          <input className="input" type="number" step="0.01" value={netSqm}
                 onChange={e => setNetSqm(e.target.value)} />
        </div>
      </div>

      {/* --- Owners --- */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Sahipler *</label>
          <button type="button" className="text-sm text-blue-600" onClick={addOwner}>
            + Sahip Ekle
          </button>
        </div>

        <div className="space-y-2">
          {owners.map((o, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={o.ownerId || ''}
                onChange={e => updateOwner(idx, { ownerId: Number(e.target.value) })}
                required
              >
                <option value="">Sahip seçin…</option>
                {allOwners.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <input
                className="input w-24"
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Pay"
                value={o.share ?? ''}
                onChange={e =>
                  updateOwner(idx, {
                    share: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />

              <label className="flex items-center gap-1 text-sm">
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
                  className="text-sm text-red-600"
                  onClick={() => removeOwner(idx)}
                >
                  Sil
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-1">
          Pay isteğe bağlıdır (0–1 arası). Birincil sahip sözleşmelerde muhatap alınır.
        </p>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          İptal
        </button>
      </div>
    </form>
  );
}