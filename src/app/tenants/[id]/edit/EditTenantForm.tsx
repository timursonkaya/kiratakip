'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TenantForm = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  notes: string | null;
};

export default function EditTenantForm({ tenant }: { tenant: TenantForm }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: tenant.name,
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    nationalId: tenant.nationalId ?? '',
    address: tenant.address ?? '',
    notes: tenant.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        nationalId: form.nationalId || null,
        address: form.address || null,
        notes: form.notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Güncelleme başarısız');
      setSaving(false);
      return;
    }

    router.push('/tenants');
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

  return (
    <form onSubmit={handleSubmit}>
      <label style={labelStyle}>Ad Soyad *</label>
      <input
        type="text"
        value={form.name}
        onChange={e => update('name', e.target.value)}
        required
        style={inputStyle}
      />

      <label style={labelStyle}>Telefon</label>
      <input
        type="text"
        value={form.phone}
        onChange={e => update('phone', e.target.value)}
        placeholder="05xx xxx xx xx"
        style={inputStyle}
      />

      <label style={labelStyle}>E-posta</label>
      <input
        type="email"
        value={form.email}
        onChange={e => update('email', e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>TC Kimlik</label>
      <input
        type="text"
        value={form.nationalId}
        onChange={e => update('nationalId', e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Adres</label>
      <textarea
        value={form.address}
        onChange={e => update('address', e.target.value)}
        rows={3}
        style={inputStyle}
      />

      <label style={labelStyle}>Notlar</label>
      <textarea
        value={form.notes}
        onChange={e => update('notes', e.target.value)}
        rows={3}
        style={inputStyle}
      />

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
          href="/tenants"
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