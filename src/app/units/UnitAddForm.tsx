'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Btn } from '@/components/ui/base';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, Select, FormAlert } from '@/components/ui/form';
import { toast } from '@/components/ui/Toast';

type Property = { id: number; title: string };
type Owner    = { id: number; name: string };
type OwnerAssignment = { ownerId: number; share?: number; isPrimary: boolean };

interface Props {
  properties: Property[];
  defaultPropertyId?: number;
}

export default function UnitAddForm({ properties, defaultPropertyId }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const router                = useRouter();

  const [allOwners, setAllOwners] = useState<Owner[]>([]);
  const [owners, setOwners] = useState<OwnerAssignment[]>([
    { ownerId: 0, share: undefined, isPrimary: true },
  ]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/owners')
      .then(r => r.json())
      .then((list: Owner[]) => setAllOwners(list))
      .catch(() => setAllOwners([]));
  }, [open]);

  function resetOwners() {
    setOwners([{ ownerId: 0, share: undefined, isPrimary: true }]);
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!owners.length || owners.some(o => !o.ownerId)) {
      setError('Her satır için bir sahip seçmelisiniz');
      return;
    }

    setLoading(true);
    const form = e.currentTarget;

    const readValue = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';

    const propertyId = readValue('propertyId');
    const unitNo     = readValue('unitNo');
    const floor      = readValue('floor');
    const type       = readValue('type');
    const netSqm     = readValue('netSqm');
    const grossSqm   = readValue('grossSqm');

    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: Number(propertyId),
          unitNo,
          type,
          floor:    floor    === '' ? null : Number(floor),
          netSqm:   netSqm   === '' ? null : Number(netSqm),
          grossSqm: grossSqm === '' ? null : Number(grossSqm),
          owners: owners.map(o => ({
            ownerId:   Number(o.ownerId),
            share:     o.share ?? null,
            isPrimary: !!o.isPrimary,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Bir hata oluştu');
      toast.success('Daire başarıyla oluşturuldu');
      setOpen(false);
      form.reset();
      resetOwners();
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setError('');
  }

  return (
    <>
      <Btn onClick={() => setOpen(true)}>
        <Plus size={14} /> Yeni Daire
      </Btn>

      <Modal open={open} onClose={handleClose} title="Yeni Daire">
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <Field label="Bina" required>
              <Select name="propertyId" required defaultValue={defaultPropertyId ? String(defaultPropertyId) : ''}>
                <option value="">Seçin...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </Select>
            </Field>

            <Field label="Daire No" required>
              <input name="unitNo" required placeholder="D-3" />
            </Field>

            <Field label="Kat">
              <input name="floor" type="number" />
            </Field>

            <Field label="Tür">
              <Select name="type" defaultValue="residential">
                <option value="residential">Konut</option>
                <option value="commercial">Ticari</option>
                <option value="parking">Otopark</option>
                <option value="storage">Depo</option>
              </Select>
            </Field>

            <Field label="Net m²">
              <input name="netSqm" type="number" step="0.01" />
            </Field>

            <Field label="Brüt m²">
              <input name="grossSqm" type="number" step="0.01" />
            </Field>

            {/* --- Owners --- */}
            <Field label="Sahipler" required>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {owners.map((o, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Select
                      value={o.ownerId || ''}
                      onChange={e => updateOwner(idx, { ownerId: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    >
                      <option value="">Sahip seçin...</option>
                      {allOwners.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </Select>

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
                      style={{ width: 72 }}
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
                        style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--danger, #c00)' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addOwnerRow}
                  style={{
                    alignSelf: 'flex-start',
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
            </Field>

            {error && <FormAlert>{error}</FormAlert>}
          </ModalBody>
          <ModalFooter>
            <Btn variant="ghost" onClick={handleClose} disabled={loading}>İptal</Btn>
            <Btn type="submit" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Btn>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}