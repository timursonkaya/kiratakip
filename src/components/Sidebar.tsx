'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Building2, DoorOpen,
  UserCheck, FileText, Receipt, Settings,
  PanelLeftClose, PanelLeftOpen,
  TrendingDown, BarChart3, CreditCard,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Genel',
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Portföy',
    items: [
      { href: '/owners',     label: 'Sahipler', icon: Users     },
      { href: '/properties', label: 'Binalar',  icon: Building2 },
      { href: '/units',      label: 'Daireler', icon: DoorOpen  },
    ],
  },
  {
    label: 'Kiralama',
    items: [
      { href: '/tenants',   label: 'Kiracılar',   icon: UserCheck },
      { href: '/contracts', label: 'Sözleşmeler', icon: FileText  },
      { href: '/charges',   label: 'Alacaklar',   icon: Receipt   },
    ],
  },
  {
    label: 'Finans',
    items: [
      { href: '/payments',  label: 'Ödemeler', icon: CreditCard   },
      { href: '/expenses',  label: 'Giderler', icon: TrendingDown },
      { href: '/reports',   label: 'Raporlar', icon: BarChart3    },
    ],
  },
];

export function Sidebar() {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (pathname === '/login' || pathname === '/setup') return;
    try {
      const saved = localStorage.getItem('sidebar-collapsed') === '1';
      setCollapsed(saved);
      document.documentElement.classList.toggle('sidebar-collapsed', saved);
    } catch { /* ignore */ }
  }, [pathname]);

  if (pathname === '/login' || pathname === '/setup') return null;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.classList.toggle('sidebar-collapsed', next);
    try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
  }

  return (
    /* Outer: transparent wrapper — app background shows through, creates float */
    <aside className="sb-outer">

      {/* The floating panel itself */}
      <div className="sb-panel">

        {/* ── Brand header ─────────────────────── */}
        <div className={`sb-header${collapsed ? ' collapsed' : ''}`}>
          <div className="sb-brand-mark">
            <Building2 size={13} color="#fff" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <>
              <div className="sb-brand-text">
                <span className="sb-brand-name">Kira Takip</span>
                <span className="sb-brand-sub">Mülk Yönetimi</span>
              </div>
              <button onClick={toggle} className="sb-toggle" title="Daralt">
                <PanelLeftClose size={13} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>

        {/* ── Navigation ───────────────────────── */}
        <nav className="sb-nav">
          {GROUPS.map((group, i) => (
            <div key={group.label} className="sb-group">
              {!collapsed && (
                <span className="sb-group-label">{group.label}</span>
              )}
              {collapsed && i > 0 && <div style={{ height: 8 }} />}

              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={`sb-item${active ? ' active' : ''}`}
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding:        collapsed ? '9px 0' : '7px 10px',
                    }}
                  >
                    <Icon size={15} strokeWidth={active ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ───────────────────────────── */}
        <div className="sb-footer">
          <Link
            href="/settings"
            title={collapsed ? 'Ayarlar' : undefined}
            className={`sb-item sb-footer-item${pathname === '/settings' ? ' active' : ''}`}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding:        collapsed ? '8px 0' : '7px 10px',
            }}
          >
            <Settings size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Ayarlar</span>}
          </Link>

          {collapsed && (
            <button
              onClick={toggle}
              className="sb-item sb-footer-item"
              title="Genişlet"
              style={{
                justifyContent: 'center', padding: '8px 0',
                width: '100%', border: 'none', cursor: 'pointer',
              }}
            >
              <PanelLeftOpen size={13} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
