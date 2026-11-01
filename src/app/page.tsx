export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { redirect } from 'next/navigation';
import { PageHeader, Card } from '@/components/ui';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard, type MonthlyPoint } from '@/components/dashboard/ChartCard';
import { BudgetSummary } from '@/components/dashboard/BudgetSummary';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { OverdueList } from '@/components/dashboard/OverdueList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RateBand } from '@/components/dashboard/RateBand';
import { UpcomingPayments } from '@/components/dashboard/UpcomingPayments';
import { ExpiringContracts } from '@/components/dashboard/ExpiringContracts';
import { FinancialCharts  } from '@/components/dashboard/FinancialCharts';
import { RecentPayments   } from '@/components/dashboard/RecentPayments';
import { Banknote, BarChart3, AlertTriangle, Home } from 'lucide-react';

const TR_MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

async function getData(db: ReturnType<typeof getUserDb>) {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sixMonAgo  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    unitCount, vacantCount, occupiedCount,
    overdueCharges, debtorTenants,
    thisMonthBilled,      // total billed this month (for collection rate)
    thisMonthActualPaid,  // actual cash collected this month
    thisMonthOpenCharges, // open (unpaid/partial/overdue) charges this month
    thisMonthExpenses,
    monthlyChargesRaw,    // charges by period — alacak line
    monthlyPaymentsRaw,   // actual payments by paidAt — tahsilat line
  ] = await Promise.all([
    db.unit.count({ where: { isArchived: false } }),
    db.unit.count({ where: { isArchived: false, status: 'vacant' } }),
    db.unit.count({ where: { isArchived: false, status: 'occupied' } }),
    db.rentCharge.findMany({
      where: { status: 'overdue' },
      include: {
        tenant:   { select: { name: true } },
        unit:     { select: { unitNo: true, property: { select: { title: true } } } },
        contract: { select: { id: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    db.rentCharge.findMany({
      where: { status: 'overdue' },
      select: { tenantId: true },
      distinct: ['tenantId'],
    }),
    // Total billed this month (chargeAmount + paidAmount for collection rate)
    db.rentCharge.aggregate({
      where: { periodStart: { gte: monthStart, lt: monthEnd }, status: { not: 'waived' } },
      _sum: { chargeAmount: true, paidAmount: true },
    }),
    // Actual payments received this month (cash-basis)
    db.payment.aggregate({
      where: { paidAt: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    // Open balance this month — only unpaid/partial/overdue charges
    db.rentCharge.aggregate({
      where: {
        periodStart: { gte: monthStart, lt: monthEnd },
        status: { in: ['pending', 'partial', 'overdue'] },
      },
      _sum: { chargeAmount: true, paidAmount: true },
    }),
    db.expense.aggregate({
      where: { date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    // Charges by period for alacak line (exclude waived)
    db.rentCharge.groupBy({
      by: ['periodStart'],
      where: { periodStart: { gte: sixMonAgo }, status: { not: 'waived' } },
      _sum: { chargeAmount: true },
      orderBy: { periodStart: 'asc' },
    }),
    // Actual payments for last 6 months for tahsilat line
    db.payment.findMany({
      where: { paidAt: { gte: sixMonAgo } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const totalBilled      = Number(thisMonthBilled._sum.chargeAmount ?? 0);
  const totalPaidOnBills = Number(thisMonthBilled._sum.paidAmount   ?? 0);
  const openCharged      = Number(thisMonthOpenCharges._sum.chargeAmount ?? 0);
  const openPaid         = Number(thisMonthOpenCharges._sum.paidAmount   ?? 0);
  const charged          = Math.max(0, openCharged - openPaid); // outstanding this month
  const paid             = Number(thisMonthActualPaid._sum.amount ?? 0);
  const expenses         = Number(thisMonthExpenses._sum.amount   ?? 0);
  const outstanding      = overdueCharges.reduce(
    (s, c) => s + Math.max(0, Number(c.chargeAmount) - Number(c.paidAmount)), 0
  );
  const occupancy = unitCount > 0 ? Math.round((occupiedCount / unitCount) * 100) : 0;

  // Group actual payments by billing-period month for the chart
  const pmtByMonth = new Map<string, number>();
  for (const p of monthlyPaymentsRaw) {
    const key = `${p.paidAt.getFullYear()}-${p.paidAt.getMonth()}`;
    pmtByMonth.set(key, (pmtByMonth.get(key) ?? 0) + Number(p.amount));
  }

  const chartData: MonthlyPoint[] = monthlyChargesRaw.map(m => {
    const d   = new Date(m.periodStart);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return {
      month:    TR_MONTHS[d.getMonth()],
      alacak:   Number(m._sum.chargeAmount ?? 0),
      tahsilat: pmtByMonth.get(key) ?? 0,
    };
  });

  return {
    unitCount, vacantCount, charged, paid, totalBilled, totalPaidOnBills,
    expenses, outstanding, occupancy, overdueCharges, chartData,
    debtorCount: debtorTenants.length,
  };
}

// ── Legend dot ──────────────────────────────────────────
function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--muted)' }}>
      <div style={{ width: 10, height: 3, borderRadius: 2, background: color }} />
      {label}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────
export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  const db = getUserDb(session.id);
  const d   = await getData(db);
  const fmt = (n: number) => `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const now       = new Date();
  const TR_MONTHS_LONG = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const monthName = `${TR_MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;
  // Collection rate: what % of this month's billed charges have been paid
  const collectPct = d.totalBilled > 0 ? Math.round((d.totalPaidOnBills / d.totalBilled) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        desc={`Genel bakış — ${monthName}`}
      />

      {/* ── Kur Bandı ── */}
      <RateBand />

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'stretch' }}>
        <KpiCard
          icon={Banknote}
          label="Bu Ay Alacak"
          value={fmt(d.charged)}
          color="blue"
        />
        <KpiCard
          icon={BarChart3}
          label="Bu Ay Tahsilat"
          value={fmt(d.paid)}
          color="green"
          trend="up"
          sub={`%${collectPct} tahsil edildi`}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Toplam Gecikme"
          value={fmt(d.outstanding)}
          color="red"
          trend={d.outstanding > 0 ? 'down' : undefined}
          sub={`${d.debtorCount} borçlu kiracı · ${d.overdueCharges.length} alacak`}
        />
        <KpiCard
          icon={Home}
          label="Doluluk"
          value={`%${d.occupancy}`}
          color="amber"
          sub={`${d.unitCount - d.vacantCount} / ${d.unitCount} daire dolu`}
        />
      </div>

      {/* ── Budget Summary ── */}
      <BudgetSummary gelir={d.paid} gider={d.expenses} />

      {/* ── Chart + Donut + Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr minmax(240px, 280px) minmax(300px, 360px)', gap: 16, alignItems: 'stretch' }}>

        {/* Line chart */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '20px 24px 0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
                Alacak & Tahsilat
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Son 6 ay</p>
            </div>
            <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
              <ChartLegend color="var(--primary)" label="Alacak" />
              <ChartLegend color="var(--green)"   label="Tahsilat" />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 240, padding: '16px 16px 20px' }}>
            <ChartCard data={d.chartData} />
          </div>
        </Card>

        {/* Donut chart */}
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 2px', color: 'var(--text)' }}>
              {d.expenses > 0 ? 'Gelir & Gider' : 'Tahsilat vs Bekleyen'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>Bu ay</p>
          </div>
          <div style={{ flex: 1, minHeight: 200, padding: '16px 16px 8px' }}>
            <DonutChart gelir={d.paid} gider={d.expenses} outstanding={d.outstanding} />
          </div>
          <div style={{
            display: 'flex', gap: 14, padding: '0 24px 18px',
            justifyContent: 'center', flexShrink: 0,
          }}>
            {d.expenses > 0 ? (
              <>
                <ChartLegend color="var(--primary)" label="Gelir" />
                <ChartLegend color="var(--red)"     label="Gider" />
              </>
            ) : (
              <>
                <ChartLegend color="var(--green)"   label="Tahsilat" />
                <ChartLegend color="var(--amber)"   label="Bekleyen" />
              </>
            )}
          </div>
        </Card>

        <QuickActions charged={d.charged} paid={d.paid} />
      </div>

      {/* ── Financial Charts ── */}
      <FinancialCharts />

      {/* ── Bottom widgets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        <OverdueList charges={d.overdueCharges} />
        <UpcomingPayments />
        <ExpiringContracts />
      </div>

      {/* ── Recent Payments ── */}
      <RecentPayments />
    </>
  );
}
