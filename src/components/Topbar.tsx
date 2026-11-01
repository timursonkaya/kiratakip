'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Settings, LogOut, User, ChevronDown, Moon, Sun, Bell, AlertCircle, Clock, FileWarning, FilePlus, Banknote, CircleDollarSign, UserRound } from 'lucide-react';
import Link from 'next/link';
import { GlobalSearch } from './GlobalSearch';

const LABELS: Record<string, string> = {
  '/':           'Dashboard',
  '/owners':     'Mülk Sahipleri',
  '/properties': 'Binalar',
  '/units':      'Daireler',
  '/tenants':    'Kiracılar',
  '/contracts':  'Sözleşmeler',
  '/charges':    'Alacaklar',
  '/payments':   'Ödemeler',
  '/expenses':   'Giderler',
  '/reports':    'Raporlar',
  '/settings':   'Ayarlar',
};

function matchLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname];
  const key = Object.keys(LABELS).find(k => k !== '/' && pathname.startsWith(k));
  return key ? LABELS[key] : 'Sayfa';
}

// ── Dark mode toggle ────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : sysDark;
    setDark(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  return { dark, toggle };
}

// ── Notification bell ──────────────────────────────────
type Notification = {
  id: string;
  type: 'overdue' | 'upcoming' | 'expiring';
  title: string;
  body: string;
  date: string;
  href: string;
};

function NotificationBell() {
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled) return;
        setItems(d.notifications ?? []);
        setCount(d.count ?? 0);
      } catch { /* ignore */ }
    }
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (e.button !== 0) return;
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const TYPE_META = {
    overdue:  { icon: AlertCircle,  color: 'var(--red)',   bg: 'var(--red-bg)'   },
    upcoming: { icon: Clock,        color: 'var(--amber)', bg: 'var(--amber-bg)' },
    expiring: { icon: FileWarning,  color: 'var(--primary)', bg: 'var(--primary-bg)' },
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)',
          transition: 'background 0.1s, color 0.1s',
        }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'var(--surface2)'; el.style.color = 'var(--text)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'none'; el.style.color = 'var(--muted)'; }}
        title="Bildirimler"
      >
        <Bell size={17} strokeWidth={2} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--red)', color: '#fff',
            fontSize: '0.625rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1,
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>Bildirimler</span>
            {count > 0 && (
              <span style={{
                background: 'var(--red-bg)', color: 'var(--red)',
                fontSize: '0.75rem', fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {count}
              </span>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                Bildirim yok
              </div>
            ) : (
              items.map(n => {
                const meta = TYPE_META[n.type];
                const IconComp = meta.icon;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border)',
                      textDecoration: 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: meta.bg, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconComp size={14} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--subtle)', marginTop: 2 }}>
                        {new Date(n.date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── User dropdown ──────────────────────────────────────
type OtherUser = { id: number; username: string };

function UserDropdown() {
  const [open,     setOpen]     = useState(false);
  const [username, setUsername] = useState('admin');
  const [userId,   setUserId]   = useState<number | null>(null);
  const [others,   setOthers]   = useState<OtherUser[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const { dark, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.username) setUsername(d.username);
        if (d?.id) setUserId(d.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || userId === null) return;
    fetch('/api/users')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.users) setOthers((d.users as OtherUser[]).filter(u => u.id !== userId));
      })
      .catch(() => {});
  }, [open, userId]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (e.button !== 0) return;
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 6px', borderRadius: 8,
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700,
          userSelect: 'none', flexShrink: 0,
        }}>
          {username.charAt(0).toUpperCase()}
        </div>
        <ChevronDown
          size={12}
          strokeWidth={2}
          color="var(--subtle)"
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* Menu */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden', zIndex: 100,
        }}>
          {/* User info */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{username}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 1 }}>Yönetici</div>
          </div>

          {/* Menu items */}
          <div style={{ padding: 6 }}>
            <DropdownItem icon={User}     label="Profil"  onClick={() => { setOpen(false); router.push('/settings'); }} />
            <DropdownItem icon={Settings} label="Ayarlar" onClick={() => { setOpen(false); router.push('/settings'); }} />
            <DropdownItem
              icon={dark ? Sun : Moon}
              label={dark ? 'Açık Tema' : 'Koyu Tema'}
              onClick={toggleTheme}
            />

            {/* Other accounts */}
            {others.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ padding: '4px 10px 2px', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Diğer Hesaplar
                </div>
                {others.map(u => (
                  <DropdownItem
                    key={u.id}
                    icon={UserRound}
                    label={u.username}
                    onClick={async () => {
                      setOpen(false);
                      await fetch('/api/auth/logout', { method: 'POST' });
                      router.push(`/login?user=${encodeURIComponent(u.username)}`);
                    }}
                  />
                ))}
              </>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <DropdownItem
              icon={LogOut}
              label="Çıkış"
              danger
              onClick={async () => {
                setOpen(false);
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({ icon: Icon, label, danger, onClick }: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 8, width: '100%',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '0.875rem', fontWeight: 500,
        color: danger ? 'var(--red)' : 'var(--text)',
        transition: 'background 0.1s',
        textAlign: 'left',
      }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

const PRIMARY_ACTIONS = [
  { href: '/contracts', label: '+ Sözleşme', icon: FilePlus          },
  { href: '/payments',  label: '+ Ödeme',    icon: Banknote          },
  { href: '/charges',   label: '+ Alacak',   icon: CircleDollarSign  },
];

// ── Topbar ──────────────────────────────────────────────
export function Topbar() {
  const pathname = usePathname();
  const label    = matchLabel(pathname);
  const isRoot   = pathname === '/';

  if (pathname === '/login' || pathname === '/setup') return null;

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      height: 56, flexShrink: 0,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px 0 24px',
      gap: 12,
    }}>
      {/* Left: breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', flexShrink: 0 }}>
        {!isRoot && (
          <>
            <span style={{ color: 'var(--subtle)' }}>Kira Takip</span>
            <ChevronRight size={14} strokeWidth={2} color="var(--border-s)" />
          </>
        )}
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{label}</span>
      </div>

      {/* Right: primary actions + utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>

        {/* Primary workflow actions */}
        {PRIMARY_ACTIONS.map(({ href, label: lbl, icon: Icon }) => (
          <Link key={href} href={href} className="tb-action">
            <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
            {lbl}
          </Link>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Utilities */}
        <GlobalSearch />
        <NotificationBell />
        <UserDropdown />
      </div>
    </header>
  );
}
