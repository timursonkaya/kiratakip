'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Property = {
  id: number;
  title: string;
  address: string | null;
  city: string | null;
  district: string | null;
  type: string;
};

export default function EditPropertyForm({ property }: { property: Property }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: property.title ?? '',
    address: property.address ?? '',
    city: property.city ?? '',
    district: property.district ?? '',
    type: property.type ?? 'apartment',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Kaydetme başarısız');
      }
      router.push('/properties');
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

      <div>
        <label className="block text-sm mb-1">Başlık *</label>
        <input
          className="input"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Adres</label>
        <input
          className="input"
          value={form.address}
          onChange={e => update('address', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Şehir</label>
          <input
            className="input"
            value={form.city}
            onChange={e => update('city', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">İlçe</label>
          <input
            className="input"
            value={form.district}
            onChange={e => update('district', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Tür</label>
        <select
          className="input"
          value={form.type}
          onChange={e => update('type', e.target.value)}
        >
          <option value="apartment">Apartman</option>
          <option value="building">Bina</option>
          <option value="house">Müstakil</option>
          <option value="commercial">Ticari</option>
        </select>
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